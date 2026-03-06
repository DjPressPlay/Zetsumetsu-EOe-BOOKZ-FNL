import Stripe from "stripe";

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
  const { userId, type, amount } = await req.json();

  try {
    let line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    if (type === "shards") {
      line_items = [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${amount} Neural Shards`,
              description: "Energy source for advanced AI operations.",
            },
            unit_amount: Math.max(500, (parseInt(amount) / 10) * 100),
          },
          quantity: 1,
        },
      ];
    } else if (type === "premium") {
      line_items = [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Premium Archivist Status",
              description:
                "Unlimited uploads and priority bitstream placement.",
            },
            unit_amount: 1999,
          },
          quantity: 1,
        },
      ];
    }

    const origin = req.headers.get("origin") || "";
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items,
      mode: "payment",
      success_url: `${origin}/?payment=success&type=${type}`,
      cancel_url: `${origin}/?payment=cancel`,
      metadata: {
        userId,
        type,
        amount: amount?.toString() || "",
      },
    });

    return new Response(JSON.stringify({ id: session.id, url: session.url }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
