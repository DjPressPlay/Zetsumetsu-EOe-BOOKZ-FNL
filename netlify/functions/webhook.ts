import Stripe from "stripe";
import { updateUserCredits, updateUserPremium } from "../../services/db";

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
  const sig = req.headers.get("stripe-signature") || "";
  const body = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (err: any) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
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

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
};
