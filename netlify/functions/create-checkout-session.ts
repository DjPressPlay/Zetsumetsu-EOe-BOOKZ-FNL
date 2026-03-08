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

    if (type === 'premium') {
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
    } else if (type === 'pod') {
      const { bookTitle, format, quantity } = JSON.parse(event.body || "{}");
      line_items = [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Zetsu POD: ${bookTitle}`,
            description: `Physical ${format} edition from the Zetsumetsu Archives. Qty: ${quantity || 1}`,
          },
          unit_amount: amount, // amount is passed from client (total including shipping)
        },
        quantity: 1,
      }];
    } else {
      return { statusCode: 400, body: "Invalid payment type" };
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
        quantity: JSON.parse(event.body || "{}").quantity?.toString() || "1"
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
