import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getCurrentUserFromSession } from "@/lib/auth";
import { adminDb } from "@/lib/firebase/admin";

export async function POST(req: NextRequest) {
	const user = await getCurrentUserFromSession();
	if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	const body = await req.formData();
	const priceId = String(body.get("priceId") ?? "");
	if (!priceId) return NextResponse.json({ error: "Missing priceId" }, { status: 400 });

	let customerId = user.stripeCustomerId ?? undefined;
	if (!customerId) {
		const customer = await stripe.customers.create({
			email: user.email ?? undefined,
			metadata: { uid: user.uid },
		});
		customerId = customer.id;
		await adminDb.collection("users").doc(user.uid).set({ stripeCustomerId: customerId }, { merge: true });
	}

	const session = await stripe.checkout.sessions.create({
		mode: "subscription",
		payment_method_types: ["card"],
		customer: customerId,
		success_url: `${process.env.NEXT_PUBLIC_APP_URL}/app?session_id={CHECKOUT_SESSION_ID}`,
		cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/app`,
		line_items: [{ price: priceId, quantity: 1 }],
		metadata: { uid: user.uid },
	});

	return NextResponse.redirect(session.url!, { status: 303 });
} 