import { getCurrentUserFromSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppClient from "./AppClient";

function isActive(status?: string | null, end?: number | null) {
	if (!status) return false;
	if (status === "active" || status === "trialing") return true;
	if (end && end * 1000 > Date.now()) return true;
	return false;
}

export default async function AppHome() {
	const user = await getCurrentUserFromSession();
	if (!user) redirect("/login");
	if (!isActive(user.subscriptionStatus, user.currentPeriodEnd)) redirect("/");

	return <AppClient user={user} />;
} 