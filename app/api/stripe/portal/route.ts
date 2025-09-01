import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getCurrentUserFromSession } from "@/lib/auth";
import { adminDb } from "@/lib/firebase/admin";

export async function POST() {
	const user = await getCurrentUserFromSession();
	if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

	let customerId = user.stripeCustomerId ?? undefined;
	if (!customerId) {
		const customer = await stripe.customers.create({
			email: user.email ?? undefined,
			metadata: { uid: user.uid },
		});
		customerId = customer.id;
		await adminDb.collection("users").doc(user.uid).set({ stripeCustomerId: customerId }, { merge: true });
	}

	const portal = await stripe.billingPortal.sessions.create({
		customer: customerId,
		return_url: `${process.env.NEXT_PUBLIC_APP_URL}/app`,
	});

	return NextResponse.redirect(portal.url, { status: 303 });
} 