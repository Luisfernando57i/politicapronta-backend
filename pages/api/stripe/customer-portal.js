import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  const { customerId } = await req.json();

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: process.env.NEXT_PUBLIC_APP_URL,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Erro ao criar sessão do portal:", err);
    return NextResponse.json({ error: "Erro ao criar portal" }, { status: 500 });
  }
}
