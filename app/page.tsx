import { getCurrentUserFromSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import PricingTable from "@/components/PricingTable";

function isActive(status?: string | null, currentPeriodEnd?: number | null): boolean {
	if (!status) return false;
	if (status === "active" || status === "trialing") return true;
	if (currentPeriodEnd && currentPeriodEnd * 1000 > Date.now()) return true;
	return false;
}

export default async function Home() {
	const user = await getCurrentUserFromSession();
	if (user) {
		redirect("/app");
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-100 grid place-items-center p-8">
			<div className="flex flex-col items-center gap-8">
				<h1 className="text-4xl font-bold text-gray-900">Laak AI</h1>
				<div className="flex items-center gap-4">
					<Link
						href="/login"
						className="px-8 py-4 rounded-2xl bg-white/30 border border-white/40 backdrop-blur-md shadow-lg hover:bg-white/40 transition-colors text-gray-900 font-semibold"
					>
						Kirjaudu sisään
					</Link>
				</div>
			</div>
		</div>
	);
}
