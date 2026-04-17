import Stripe from 'stripe';
import { getServerEnv } from '@/lib/env/server';

let _stripe: Stripe | undefined;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(getServerEnv().STRIPE_SECRET_KEY);
  }
  return _stripe;
}
