import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
	throw new Error("Missing STRIPE_SECRET_KEY");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export { stripe }; 