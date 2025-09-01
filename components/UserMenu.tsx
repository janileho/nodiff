"use client";

import { useState } from "react";
import Link from "next/link";
import type { CurrentUser } from "@/lib/auth";

export default function UserMenu({ user }: { user: CurrentUser }) {
	const [open, setOpen] = useState(false);

	async function handleSignOut() {
		await fetch("/api/auth/session", { method: "DELETE" });
		window.location.assign("/");
	}

	const avatarFallback = user.email?.[0]?.toUpperCase() ?? "U";

	return (
		<div className="relative">
			<button
				onClick={() => setOpen((v) => !v)}
				className="h-8 w-8 rounded-full overflow-hidden border flex items-center justify-center bg-gray-100"
				aria-label="User menu"
			>
				{user.photoURL ? (
					<img src={user.photoURL} alt="avatar" className="h-full w-full object-cover" />
				) : (
					<span className="text-sm font-medium">{avatarFallback}</span>
				)}
			</button>
			{open && (
				<div className="absolute right-0 mt-2 w-48 rounded-md border bg-white shadow z-50">
					<div className="px-3 py-2 text-sm text-gray-600 truncate">{user.email ?? "Account"}</div>
					<div className="h-px bg-gray-200" />
					<ul className="p-1 text-sm">
						<li>
							<Link href="/app" className="block px-3 py-2 hover:bg-gray-50">Profile</Link>
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