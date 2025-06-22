import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { subscriptionId } = req.body;

  try {
    // Recupera a assinatura para pegar o customer ID
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Cria a sessão do portal do cliente
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.customer,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

