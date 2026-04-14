import { NextResponse } from 'next/server';

export async function POST() {
  // Stripe webhook handler — implemented in payment tasks
  return NextResponse.json({ received: true });
}
