import Stripe from 'stripe';
import { buffer } from 'micro';
import { supabaseAdmin } from '../../utils/supabaseAdmin'; // supondo que você tenha um cliente admin do Supabase configurado

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = {
  api: {
    bodyParser: false, // necessário para webhooks
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const session = event.data.object;

  switch (event.type) {
    case 'checkout.session.completed':
      // Atualiza no Supabase que a assinatura está ativa
      await supabaseAdmin
        .from('users')
        .update({
          plano_ativo: session.metadata.plano || 'pro',
          status_pagamento: 'ativo',
          assinatura_id: session.subscription,
        })
        .eq('user_id', session.metadata.user_id);
      break;

    case 'customer.subscription.deleted':
    case 'customer.subscription.updated':
      // Atualiza status da assinatura conforme o Stripe
      const subscription = await stripe.subscriptions.retrieve(session.id);
      const status = subscription.status === 'active' ? 'ativo' : 'cancelado';

      await supabaseAdmin
        .from('users')
        .update({
          status_pagamento: status,
        })
        .eq('assinatura_id', subscription.id);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.status(200).json({ received: true });
}
