import { Handler } from "@netlify/functions";
import Stripe from "stripe";
import { updateUserCredits, updateUserPremium } from "../../services/db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export const handler: Handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const sig = event.headers["stripe-signature"] as string;
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body || "",
      sig,
      endpointSecret
    );
  } catch (err: any) {
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }

  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object as Stripe.Checkout.Session;
    const { userId, type, amount } = session.metadata || {};

    if (userId && type) {
      if (type === "premium") {
        await updateUserPremium(userId, true);
      }
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true }),
  };
};
