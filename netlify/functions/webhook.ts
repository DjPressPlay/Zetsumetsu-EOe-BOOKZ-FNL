import { Handler } from "@netlify/functions";
import Stripe from "stripe";
import { updateUserPremium, saveOrderToArchive } from "../../services/db";

let stripeClient: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY || "");
  }
  return stripeClient;
}

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export const handler: Handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const sig = event.headers["stripe-signature"] as string;
  let stripeEvent;

  try {
    const stripe = getStripe();
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
    const { 
      userId, 
      type, 
      bookTitle, 
      format, 
      quantity, 
      marqsSpent, 
      shippingName, 
      shippingAddress, 
      email,
      boostTier,
      bookId
    } = session.metadata || {};

    const customerEmail = email || session.customer_details?.email || (userId ? `${userId}@zetsu.local` : 'anonymous@zetsu.local');

    if (type === "premium" && userId) {
      await updateUserPremium(userId, true);
    } else if (type === "pod_marqs" || type === "pod") {
      const orderSummary = JSON.stringify({
        paymentType: type,
        bookTitle,
        format,
        quantity: Number(quantity) || 1,
        marqsSpent: Number(marqsSpent) || 0,
        amountChargedUsd: (session.amount_total || 0) / 100,
        shippingName: shippingName || session.customer_details?.name || 'Customer',
        shippingAddress: shippingAddress || 'Digital / Address provided at checkout',
        stripeSessionId: session.id,
        stripePaymentIntent: session.payment_intent,
        date: new Date().toISOString()
      });

      try {
        await saveOrderToArchive(customerEmail, orderSummary);
      } catch (saveErr) {
        console.error("Failed to archive order details:", saveErr);
      }
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true }),
  };
};

