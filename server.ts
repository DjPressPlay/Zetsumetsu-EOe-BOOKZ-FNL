import express from "express";
import path from "path";
import fs from "fs";
import os from "os";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { handler as createCheckoutHandler } from "./netlify/functions/create-checkout-session";
import { handler as webhookHandler } from "./netlify/functions/webhook";
import { autoCompressPdfBuffer, compressPdfFile } from "./server/pdfCompressor";
import { 
  initializeMonthlyDigestCron, 
  sendMonthlyNewsletterDigest, 
  getSmtpStatus 
} from "./server/newsletterSmtp";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parser for standard API endpoints
  app.use(express.json({ limit: "250mb" }));
  app.use(express.urlencoded({ extended: true, limit: "250mb" }));

  const bridge = (handler: any) => async (req: express.Request, res: express.Response) => {
    const event = {
      httpMethod: req.method,
      body: req.body instanceof Buffer ? req.body.toString() : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body)),
      headers: req.headers,
      queryStringParameters: req.query,
    };
    
    try {
      const result = await handler(event, {});
      if (result.headers) {
        Object.entries(result.headers).forEach(([key, value]) => {
          res.setHeader(key, value as string);
        });
      }
      res.status(result.statusCode).send(result.body);
    } catch (error: any) {
      console.error(`Error in function bridge:`, error);
      res.status(500).send(error.message);
    }
  };

  // API Routes
  app.get("/api/client-ip", (req, res) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string' 
      ? forwarded.split(',')[0].trim() 
      : (req.socket.remoteAddress || '127.0.0.1');
    res.json({ ip });
  });

  // Ghostscript PDF Automatic Compression Endpoint (Supports files up to 250MB)
  app.post(
    "/api/compress-pdf",
    express.raw({
      type: ["application/pdf", "application/octet-stream", "application/x-pdf", "*/*"],
      limit: "250mb"
    }),
    async (req, res) => {
      try {
        const bodyBuffer = req.body;
        if (!bodyBuffer || !(bodyBuffer instanceof Buffer) || bodyBuffer.length === 0) {
          return res.status(400).json({ error: "Empty or invalid PDF payload received." });
        }

        const result = await autoCompressPdfBuffer(bodyBuffer);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Access-Control-Expose-Headers", "x-original-size, x-compressed-size, x-saved-bytes, x-saved-percent, x-is-compressed, x-passes-run, x-exceeds-supabase-limit");
        res.setHeader("x-original-size", result.originalSize.toString());
        res.setHeader("x-compressed-size", result.compressedSize.toString());
        res.setHeader("x-saved-bytes", result.savedBytes.toString());
        res.setHeader("x-saved-percent", result.savedPercent.toFixed(1));
        res.setHeader("x-is-compressed", result.isCompressed ? "true" : "false");
        res.setHeader("x-passes-run", result.passesRun.toString());
        res.setHeader("x-exceeds-supabase-limit", result.exceedsSupabaseLimit ? "true" : "false");

        return res.status(200).send(result.buffer);
      } catch (error: any) {
        console.error("PDF compression fallback:", error);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Access-Control-Expose-Headers", "x-compression-error, x-is-compressed");
        res.setHeader("x-compression-error", error?.message || "Unknown error");
        res.setHeader("x-is-compressed", "false");
        return res.status(200).send(req.body);
      }
    }
  );

  // --- Chunked Large File Compression Endpoints (Bypasses Cloud Run 32MB single HTTP POST ceiling) ---
  const activeSessions = new Map<string, { filePath: string; createdAt: number }>();

  // Periodically clean stale sessions (> 30 mins old)
  setInterval(() => {
    const now = Date.now();
    for (const [id, session] of activeSessions.entries()) {
      if (now - session.createdAt > 30 * 60 * 1000) {
        fs.unlink(session.filePath, () => {});
        activeSessions.delete(id);
      }
    }
  }, 10 * 60 * 1000);

  app.post("/api/compress-chunked/start", (req, res) => {
    const sessionId = crypto.randomUUID();
    const tempDir = os.tmpdir();
    const filePath = path.join(tempDir, `chunked_session_${sessionId}.pdf`);
    // Ensure clean empty file
    fs.writeFileSync(filePath, Buffer.alloc(0));
    activeSessions.set(sessionId, { filePath, createdAt: Date.now() });
    res.json({ sessionId });
  });

  app.post(
    "/api/compress-chunked/chunk",
    express.raw({ type: "*/*", limit: "25mb" }),
    (req, res) => {
      const sessionId = req.headers["x-session-id"] as string;
      if (!sessionId || !activeSessions.has(sessionId)) {
        return res.status(404).json({ error: "Invalid or expired chunked compression session." });
      }
      const session = activeSessions.get(sessionId)!;
      const chunkBuffer = req.body;
      if (!chunkBuffer || !(chunkBuffer instanceof Buffer)) {
        return res.status(400).json({ error: "Missing chunk buffer." });
      }
      fs.appendFile(session.filePath, chunkBuffer, (err) => {
        if (err) {
          return res.status(500).json({ error: "Failed to write chunk to temporary disk storage." });
        }
        res.json({ success: true, chunkSize: chunkBuffer.length });
      });
    }
  );

  app.post("/api/compress-chunked/finish", async (req, res) => {
    const sessionId = req.body?.sessionId || (req.headers["x-session-id"] as string);
    if (!sessionId || !activeSessions.has(sessionId)) {
      return res.status(404).json({ error: "Invalid or expired chunked compression session." });
    }
    const session = activeSessions.get(sessionId)!;
    activeSessions.delete(sessionId);

    try {
      const compResult = await compressPdfFile(session.filePath);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Access-Control-Expose-Headers", "x-original-size, x-compressed-size, x-saved-bytes, x-saved-percent, x-is-compressed, x-passes-run");
      res.setHeader("x-original-size", compResult.originalSize.toString());
      res.setHeader("x-compressed-size", compResult.compressedSize.toString());
      res.setHeader("x-saved-bytes", compResult.savedBytes.toString());
      res.setHeader("x-saved-percent", compResult.savedPercent.toFixed(1));
      res.setHeader("x-is-compressed", compResult.isCompressed ? "true" : "false");
      res.setHeader("x-passes-run", compResult.passesRun.toString());

      res.sendFile(compResult.outputPath, () => {
        // Clean up temporary files on disk
        fs.unlink(session.filePath, () => {});
        if (compResult.outputPath !== session.filePath) {
          fs.unlink(compResult.outputPath, () => {});
        }
      });
    } catch (err: any) {
      console.error("Chunked Ghostscript compression failed:", err);
      // Fallback: send the reassembled original file
      res.sendFile(session.filePath, () => {
        fs.unlink(session.filePath, () => {});
      });
    }
  });

  app.post("/api/create-checkout-session", bridge(createCheckoutHandler));

  // Dedicated raw body parser for Stripe webhook signature verification
  app.post("/api/webhook", express.raw({ type: 'application/json' }), bridge(webhookHandler));

  // Newsletter Monthly Digest SMTP Endpoints
  app.get("/api/newsletter/smtp-status", (req, res) => {
    res.json(getSmtpStatus());
  });

  app.post("/api/newsletter/send-digest", async (req, res) => {
    try {
      const customEmails = Array.isArray(req.body?.emails) ? req.body.emails : undefined;
      const result = await sendMonthlyNewsletterDigest({
        manual: true,
        customEmails,
      });
      res.json(result);
    } catch (err: any) {
      console.error("Manual newsletter digest error:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite middleware for development & static fallback for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // Fallback to transform and serve index.html for SPA routes in dev mode
    app.use(async (req, res, next) => {
      if (req.originalUrl.startsWith("/api")) {
        return next();
      }
      try {
        const indexPath = path.resolve(process.cwd(), "index.html");
        if (fs.existsSync(indexPath)) {
          let template = fs.readFileSync(indexPath, "utf-8");
          template = await vite.transformIndexHtml(req.originalUrl, template);
          res.status(200).set({ "Content-Type": "text/html" }).end(template);
        } else {
          next();
        }
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use((req, res, next) => {
      if (req.originalUrl.startsWith("/api")) {
        return next();
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Initialize automated monthly digest on the 22nd of each month
  initializeMonthlyDigestCron();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Zetsu EOE Server running on http://localhost:${PORT}`);
  });
}

startServer();
