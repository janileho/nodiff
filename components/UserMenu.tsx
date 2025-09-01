"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { CurrentUser } from "@/lib/auth";

export default function UserMenu({ user }: { user?: CurrentUser } = {}) {
	const [open, setOpen] = useState(false);
    const [scale, setScale] = useState<number>(1);

	async function handleSignOut() {
		await fetch("/api/auth/session", { method: "DELETE" });
		window.location.assign("/");
	}

	// Initialize and persist UI scale
	useEffect(() => {
		if (typeof window === 'undefined') return;
		const stored = Number(localStorage.getItem('ui-scale') || '1');
		const baseline = 1440; // px
		const auto = Math.min(1, Math.max(0.85, window.innerWidth / baseline));
		const effective = Number.isFinite(stored) && stored > 0 ? stored : auto;
		setScale(effective);
		document.documentElement.style.setProperty('--ui-scale', String(effective));
	}, []);

	function applyScale(next: number) {
		const clamped = Math.min(1.15, Math.max(0.85, Number(next)));
		setScale(clamped);
		if (typeof window !== 'undefined') {
			localStorage.setItem('ui-scale', String(clamped));
			document.documentElement.style.setProperty('--ui-scale', String(clamped));
		}
	}

	const email = user?.email ?? null;
	const avatarFallback = (email?.[0] ?? "U").toUpperCase();

	return (
		<div className="relative">
			<button
				onClick={() => setOpen((v) => !v)}
				className="h-8 w-8 rounded-full overflow-hidden border flex items-center justify-center bg-gray-100"
				aria-label="User menu"
			>
				{user?.photoURL ? (
					<img src={user.photoURL} alt="avatar" className="h-full w-full object-cover" />
				) : (
					<span className="text-sm font-medium">{avatarFallback}</span>
				)}
			</button>
			{open && (
				<div className="absolute right-0 mt-2 w-48 rounded-md border bg-white shadow z-50">
					<div className="px-3 py-2 text-sm text-gray-600 truncate">{email ?? "Account"}</div>
					<div className="h-px bg-gray-200" />
					<ul className="p-1 text-sm">
						<li>
							<Link href="/app" className="block px-3 py-2 hover:bg-gray-50">Profile</Link>
						</li>
						<li className="px-3 py-2">
							<div className="text-xs text-gray-500 mb-1">Display size</div>
							<div className="flex items-center gap-2">
								<button onClick={() => applyScale(0.9)} className={`px-2 py-1 rounded border ${scale < 0.95 ? 'bg-gray-100' : 'bg-white'} text-gray-700`}>90%</button>
								<button onClick={() => applyScale(1.0)} className={`px-2 py-1 rounded border ${scale >= 0.95 && scale <= 1.05 ? 'bg-gray-100' : 'bg-white'} text-gray-700`}>100%</button>
								<button onClick={() => applyScale(1.1)} className={`px-2 py-1 rounded border ${scale > 1.05 ? 'bg-gray-100' : 'bg-white'} text-gray-700`}>110%</button>
							</div>
						</li>
						<li>
							<form action="/api/stripe/portal" method="post">
								<button className="w-full text-left px-3 py-2 hover:bg-gray-50">Billing</button>
							</form>
						</li>
						<li>
							<button onClick={handleSignOut} className="w-full text-left px-3 py-2 hover:bg-gray-50">Sign out</button>
						</li>
					</ul>
				</div>
			)}
		</div>
	);
} 