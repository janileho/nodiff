import * as admin from "firebase-admin";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!admin.apps.length) {
	if (!projectId || !clientEmail || !privateKey) {
		throw new Error("Missing Firebase Admin environment variables");
	}

	// Private keys from env often have escaped newlines
	privateKey = privateKey.replace(/\\n/g, "\n");

	admin.initializeApp({
		credential: admin.credential.cert({
			projectId,
			clientEmail,
			privateKey,
		}),
	});
}

const adminAuth = admin.auth();
const adminDb = admin.firestore();

export { admin, adminAuth, adminDb }; 