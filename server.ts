import express from "express";
import { createServer as createViteServer } from "vite";
import { handler as createCheckoutHandler } from "./netlify/functions/create-checkout-session";
import { handler as webhookHandler } from "./netlify/functions/webhook";
import { compressPdfBuffer, checkGhostscriptAvailable, CompressionPreset } from "./server/pdfCompressor";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to capture raw body for Stripe webhooks
  app.use(express.raw({ type: 'application/json' }));

  const bridge = (handler: any) => async (req: express.Request, res: express.Response) => {
    const event = {
      httpMethod: req.method,
      body: req.body instanceof Buffer ? req.body.toString() : JSON.stringify(req.body),
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

  // Ghostscript PDF Compression Engine Status
  app.get("/api/pdf-engine-status", async (req, res) => {
    try {
      const gsStatus = await checkGhostscriptAvailable();
      res.json({
        status: gsStatus.available ? "active" : "unavailable",
        engine: "Ghostscript",
        version: gsStatus.version || "Unknown",
        maxUploadSizeMb: 150,
        supabaseLimitMb: 50,
        recommendedPresets: ["ebook", "screen", "printer"],
        features: [
          "Raster image downsampling (72-150 DPI)",
          "Font subsetting & object deduplication",
          "PostScript page stream re-encoding",
          "Automatic 50MB Supabase compliance guard"
        ]
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Ghostscript PDF Compression Endpoint (Supports files up to 150MB)
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

        const presetParam = (req.query.preset as string) || "ebook";
        const validPresets: CompressionPreset[] = ["ebook", "screen", "printer", "prepress"];
        const preset: CompressionPreset = validPresets.includes(presetParam as CompressionPreset)
          ? (presetParam as CompressionPreset)
          : "ebook";

        const result = await compressPdfBuffer(bodyBuffer, preset);

        // Expose compression metrics in response headers
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("X-Original-Size", result.originalSize.toString());
        res.setHeader("X-Compressed-Size", result.compressedSize.toString());
        res.setHeader("X-Saved-Percent", result.savedPercent.toString());
        res.setHeader("X-Saved-Bytes", result.savedBytes.toString());
        res.setHeader("X-Compression-Ratio", result.ratio);
        res.setHeader("X-Compression-Preset", result.preset);
        res.setHeader("X-Compression-Engine", result.engine);
        res.setHeader("X-Execution-Time-Ms", result.executionTimeMs.toString());
        res.setHeader(
          "Access-Control-Expose-Headers",
          "X-Original-Size, X-Compressed-Size, X-Saved-Percent, X-Saved-Bytes, X-Compression-Ratio, X-Compression-Preset, X-Compression-Engine, X-Execution-Time-Ms"
        );

        return res.status(200).send(result.buffer);
      } catch (error: any) {
        console.error("PDF compression error:", error);
        return res.status(500).json({
          error: error.message || "Ghostscript failed to optimize the PDF file."
        });
      }
    }
  );

  app.post("/api/create-checkout-session", bridge(createCheckoutHandler));
  app.post("/api/webhook", bridge(webhookHandler));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Hybrid Zetsu Server running on http://localhost:${PORT}`);
  });
}

startServer();
