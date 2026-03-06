import express from "express";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import dotenv from "dotenv";
import { updateUserCredits, updateUserPremium } from "./services/db";

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const app = express();
const PORT = 3000;

async function startServer() {
  // Webhook needs raw body
  app.post("/api/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET || ""
      );
    } catch (err: any) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const { userId, type, amount } = session.metadata || {};

      if (userId && type) {
        if (type === "shards" && amount) {
          await updateUserCredits(userId, parseInt(amount));
        } else if (type === "premium") {
          await updateUserPremium(userId, true);
        }
      }
    }

    res.json({ received: true });
  });

  app.use(express.json());

  // API routes
  app.post("/api/create-checkout-session", async (req, res) => {
    const { userId, type, amount } = req.body;

    try {
      let line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

      if (type === 'shards') {
        line_items = [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${amount} Neural Shards`,
              description: 'Energy source for advanced AI operations.',
            },
            unit_amount: Math.max(500, (parseInt(amount) / 10) * 100), // e.g., 50 shards = $5
          },
          quantity: 1,
        }];
      } else if (type === 'premium') {
        line_items = [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Premium Archivist Status',
              description: 'Unlimited uploads and priority bitstream placement.',
            },
            unit_amount: 1999, // $19.99
          },
          quantity: 1,
        }];
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items,
        mode: 'payment',
        success_url: `${req.headers.origin}/?payment=success&type=${type}`,
        cancel_url: `${req.headers.origin}/?payment=cancel`,
        metadata: {
          userId,
          type,
          amount: amount?.toString() || "",
        },
      });

      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
