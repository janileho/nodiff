import { cookies } from "next/headers";
import { adminAuth, adminDb } from "./firebase/admin";

export type CurrentUser = {
	uid: string;
	email: string | null;
	photoURL?: string | null;
	stripeCustomerId?: string | null;
	subscriptionTier?: string | null;
	subscriptionStatus?: string | null;
	priceId?: string | null;
	currentPeriodEnd?: number | null;
	completedTasks?: string[];
};

export async function getCurrentUserFromSession(): Promise<CurrentUser | null> {
	const cookieStore = await cookies();
	const sessionCookie = cookieStore.get("session");
	if (!sessionCookie?.value) return null;

	try {
		const decoded = await adminAuth.verifySessionCookie(sessionCookie.value, true);
		const uid = decoded.uid;
		const userRecord = await adminAuth.getUser(uid);
		const userDoc = await adminDb.collection("users").doc(uid).get();
		const data = userDoc.exists ? (userDoc.data() as Partial<CurrentUser>) : {};
		return {
			uid,
			email: userRecord.email ?? null,
			photoURL: userRecord.photoURL ?? null,
			stripeCustomerId: (data.stripeCustomerId as string | undefined) ?? null,
			subscriptionTier: (data.subscriptionTier as string | undefined) ?? null,
			subscriptionStatus: (data.subscriptionStatus as string | undefined) ?? null,
			priceId: (data.priceId as string | undefined) ?? null,
			currentPeriodEnd: (data.currentPeriodEnd as number | undefined) ?? null,
			completedTasks: (data.completedTasks as string[] | undefined) ?? [],
		};
	} catch {
		return null;
	}
} 