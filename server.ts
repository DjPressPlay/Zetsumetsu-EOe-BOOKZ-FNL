import express from "express";
import { createServer as createViteServer } from "vite";
import { handler as createCheckoutHandler } from "./netlify/functions/create-checkout-session";
import { handler as webhookHandler } from "./netlify/functions/webhook";

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
