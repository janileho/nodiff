"use client";

import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { firebaseAuth, googleProvider } from "@/lib/firebase/client";
import Link from "next/link";

export default function LoginPage() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleGoogleLogin() {
		setError(null);
		setLoading(true);
		try {
			const result = await signInWithPopup(firebaseAuth, googleProvider);
			const idToken = await result.user.getIdToken();
			await fetch("/api/auth/session", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ idToken }),
			});
			window.location.assign("/app");
		} catch (e: any) {
			setError(e?.message ?? "Login failed");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-100 grid place-items-center p-8">
			<div className="w-full max-w-md bg-white/30 backdrop-blur-md border border-white/40 rounded-2xl shadow-xl p-8">
				<div className="text-center mb-6">
					<h1 className="text-2xl font-bold text-gray-900">Kirjaudu sisään</h1>
				</div>

				<button
					onClick={handleGoogleLogin}
					disabled={loading}
					className="w-full bg-white hover:bg-gray-50 border border-gray-200 rounded-xl px-6 py-4 flex items-center justify-center gap-3 font-medium text-gray-700 transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{loading ? (
						<>
							<div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
							<span>Kirjaudutaan sisään...</span>
						</>
					) : (
						<>
							<svg className="w-5 h-5" viewBox="0 0 24 24">
								<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
								<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
								<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
								<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
							</svg>
							<span>Jatka Googlella</span>
						</>
					)}
				</button>

				{error && (
					<div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-center text-sm text-red-600">
						{error}
					</div>
				)}

				<div className="text-center mt-6">
					<Link href="/" className="text-sm text-blue-600 hover:text-blue-800">Takaisin</Link>
				</div>
			</div>
		</div>
	);
} 