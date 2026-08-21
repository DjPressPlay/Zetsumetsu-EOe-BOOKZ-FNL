import { Handler } from "@netlify/functions";
import Stripe from "stripe";

let stripeClient: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY || "";
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export const handler: Handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const stripe = getStripe();
  const payload = JSON.parse(event.body || "{}");
  const { 
    userId, 
    type, 
    amount, 
    bookTitle, 
    format, 
    quantity, 
    marqsSpent, 
    shippingAmount,
    shippingName,
    shippingAddress,
    email,
    boostTier,
    bookId,
    spotsMoved
  } = payload;

  try {
    let line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const origin = event.headers.origin || "http://localhost:3000";

    if (type === 'premium') {
      line_items = [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Premium Archivist Status (20 Slots)',
            description: 'Expanded archival capacity for up to 20 book uploads and verified badge.',
          },
          unit_amount: 1999,
        },
        quantity: 1,
      }];
    } else if (type === 'pod_marqs') {
      // Special Marqs Purchase Receipt: The book price was redeemed with Marqs, user only pays Shipping & Handling
      const marqsText = marqsSpent ? `${Number(marqsSpent).toLocaleString()} Marqs` : 'Marqs Token';
      const shippingCents = Math.round(Number(shippingAmount || amount || 5.99) * 100);

      line_items = [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Book Order: ${bookTitle || 'Zetsu Book'} [PAID WITH ${marqsText.toUpperCase()}]`,
              description: `Physical ${format || 'Book'} Edition (Qty: ${quantity || 1}) — Book cost covered in full by ${marqsText}. Receipt for Shipping & Handling.`,
            },
            unit_amount: shippingCents,
          },
          quantity: 1,
        }
      ];
    } else if (type === 'pod') {
      // Standard USD checkout: Book price + shipping
      line_items = [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Zetsu Physical Book: ${bookTitle || 'Book'}`,
            description: `Physical ${format || 'Book'} Edition (Qty: ${quantity || 1}) including standard shipping & handling.`,
          },
          unit_amount: Math.round(Number(amount) * 100),
        },
        quantity: 1,
      }];
    } else if (type === 'boost') {
      // Buy Back Boost in USD
      const boostPriceCents = Math.round(Number(amount || 1.50) * 100);
      line_items = [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Buy Back Boost: ${boostTier || 'X3'} (+${spotsMoved || 3} Spots)`,
            description: `Algorithmic feed positioning boost for "${bookTitle || 'Archive Node'}".`,
          },
          unit_amount: boostPriceCents,
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
      customer_email: email || undefined,
      success_url: `${origin}/?payment=success&type=${type}&bookTitle=${encodeURIComponent(bookTitle || '')}`,
      cancel_url: `${origin}/?payment=cancel`,
      metadata: {
        userId: userId || "",
        type: type || "",
        amount: amount?.toString() || "",
        marqsSpent: marqsSpent?.toString() || "0",
        bookTitle: bookTitle || "",
        bookId: bookId || "",
        format: format || "",
        quantity: (quantity || 1).toString(),
        shippingName: shippingName || "",
        shippingAddress: shippingAddress || "",
        email: email || "",
        boostTier: boostTier || "",
        spotsMoved: spotsMoved?.toString() || "0"
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ id: session.id, url: session.url }),
    };
  } catch (error: any) {
    console.error("Stripe session creation error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

