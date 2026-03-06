import { Handler } from "@netlify/functions";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

export const handler: Handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { userId, type, amount } = JSON.parse(event.body || "{}");

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
          unit_amount: Math.max(500, (parseInt(amount) / 10) * 100),
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
          unit_amount: 1999,
        },
        quantity: 1,
      }];
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: 'payment',
      success_url: `${event.headers.origin}/?payment=success&type=${type}`,
      cancel_url: `${event.headers.origin}/?payment=cancel`,
      metadata: {
        userId,
        type,
        amount: amount?.toString() || "",
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ id: session.id, url: session.url }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
