import { getCurrentUserFromSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import AppClient from "./AppClient";

export default async function AppHome() {
	const user = await getCurrentUserFromSession();
	if (!user) redirect("/login");

	return <AppClient user={user} />;
} 