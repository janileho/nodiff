import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeTierName(input?: string | null): string | null {
	if (!input) return null;
	const t = input.toLowerCase();
	if (t.includes("enterprise")) return "enterprise";
	if (t.includes("pro")) return "pro";
	if (t.includes("basic") || t.includes("starter") || t.includes("personal")) return "basic";
	return input; // fall back to whatever was set
}

export async function POST(req: NextRequest) {
	const sig = req.headers.get("stripe-signature");
	if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
		return new NextResponse("Missing signature", { status: 400 });
	}

	const rawBody = await req.text();
	let event;
	try {
		event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
	} catch (err: any) {
		return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
	}

	try {
		switch (event.type) {
			case "checkout.session.completed": {
				const session = event.data.object as any;
				const uid = (session.client_reference_id as string | undefined) ?? (session.metadata?.uid as string | undefined);
				const sessionId = session.id as string;
				const customerId = session.customer as string | undefined;

				// Retrieve full session with line items and expanded product to derive tier
				const fullSession = await stripe.checkout.sessions.retrieve(sessionId, {
					expand: ["line_items.data.price.product"],
				});
				const li = fullSession.line_items?.data?.[0];
				const price = li?.price as any;
				const product = price?.product as any;
				const priceId = price?.id ?? null;
				const subscriptionId = (fullSession.subscription as string) ?? null;
				const status = subscriptionId ? "active" : "incomplete";
				const tier = normalizeTierName(product?.metadata?.tier || price?.nickname || product?.name);

				if (uid) {
					await adminDb.collection("users").doc(uid).set({
						stripeCustomerId: customerId ?? null,
						subscriptionId,
						priceId,
						subscriptionTier: tier ?? null,
						subscriptionStatus: status,
						updatedAt: Date.now(),
					}, { merge: true });
				}
				break;
			}
			case "customer.subscription.created":
			case "customer.subscription.updated":
			case "customer.subscription.deleted": {
				const sub = event.data.object as any;
				const customerId = sub.customer as string;
				const item = sub.items?.data?.[0];
				const price = item?.price as any;
				const priceId = price?.id ?? null;
				const status = sub.status as string;
				const currentPeriodEnd = sub.current_period_end as number | null;

				// Retrieve product to read metadata.tier
				let tier: string | null = null;
				if (price?.product) {
					const product = await stripe.products.retrieve(typeof price.product === "string" ? price.product : price.product.id);
					tier = normalizeTierName((product.metadata as any)?.tier || price?.nickname || product.name);
				}

				const usersSnap = await adminDb.collection("users").where("stripeCustomerId", "==", customerId).limit(1).get();
				if (!usersSnap.empty) {
					const docRef = usersSnap.docs[0].ref;
					await docRef.set({
						priceId,
						subscriptionTier: tier ?? null,
						subscriptionStatus: status,
						currentPeriodEnd,
						updatedAt: Date.now(),
					}, { merge: true });
				}
				break;
			}
			default:
				break;
		}

		return NextResponse.json({ received: true });
	} catch (err: any) {
		return new NextResponse(`Webhook handler error: ${err.message}`, { status: 500 });
	}
} 