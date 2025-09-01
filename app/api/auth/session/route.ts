import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
	try {
		const { idToken } = await req.json();
		if (!idToken) {
			return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
		}
		const expiresIn = 14 * 24 * 60 * 60 * 1000; // 14 days
		const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
		const decodedIdToken = await adminAuth.verifyIdToken(idToken);

		// Ensure user doc exists
		await adminDb
			.collection("users")
			.doc(decodedIdToken.uid)
			.set({
				email: decodedIdToken.email ?? null,
				updatedAt: Date.now(),
			}, { merge: true });

		const res = NextResponse.json({ success: true });
		res.cookies.set("session", sessionCookie, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/",
			maxAge: Math.floor(expiresIn / 1000),
		});
		return res;
	} catch (err) {
		return NextResponse.json({ error: "Failed to create session" }, { status: 401 });
	}
}

export async function DELETE() {
	const res = NextResponse.json({ success: true });
	res.cookies.set("session", "", { path: "/", maxAge: 0 });
	return res;
} 