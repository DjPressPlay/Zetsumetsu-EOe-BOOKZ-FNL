import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { handler as createCheckoutHandler } from "./netlify/functions/create-checkout-session";
import { handler as webhookHandler } from "./netlify/functions/webhook";
import { autoCompressPdfBuffer } from "./server/pdfCompressor";
import { 
  initializeMonthlyDigestCron, 
  sendMonthlyNewsletterDigest, 
  getSmtpStatus 
} from "./server/newsletterSmtp";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parser for standard API endpoints
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

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

  // Ghostscript PDF Automatic Compression Endpoint (Supports files up to 150MB)
  app.post(
    "/api/compress-pdf",
    express.raw({
      type: ["application/pdf", "application/octet-stream", "application/x-pdf", "*/*"],
      limit: "150mb"
    }),
    async (req, res) => {
      try {
        const bodyBuffer = req.body;
        if (!bodyBuffer || !(bodyBuffer instanceof Buffer) || bodyBuffer.length === 0) {
          return res.status(400).json({ error: "Empty or invalid PDF payload received." });
        }

        const optimizedBuffer = await autoCompressPdfBuffer(bodyBuffer);
        res.setHeader("Content-Type", "application/pdf");
        return res.status(200).send(optimizedBuffer);
      } catch (error: any) {
        console.error("PDF compression fallback:", error);
        res.setHeader("Content-Type", "application/pdf");
        return res.status(200).send(req.body);
      }
    }
  );

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
