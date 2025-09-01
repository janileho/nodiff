import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUserFromSession } from "@/lib/auth";

export async function GET() {
	try {
		const user = await getCurrentUserFromSession();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Get all existing task IDs from tasks2 collection
		const tasksSnapshot = await adminDb.collection('tasks2').get();
		const existingTaskIds = tasksSnapshot.docs.map(doc => doc.data().task_id);

		// Find the next available ID
		const nextId = findNextAvailableId(existingTaskIds);

		return NextResponse.json({ nextId });
	} catch (error) {
		console.error("Error generating next task2 ID:", error);
		return NextResponse.json({ error: "Failed to generate task2 ID" }, { status: 500 });
	}
}

function findNextAvailableId(existingIds: string[]): string {
	// Group IDs by prefix (e.g., "eq_", "frac_", "func_")
	const idGroups: { [prefix: string]: number[] } = {};
	
	existingIds.forEach(id => {
		const match = id.match(/^([a-zA-Z0-9]+)_(\d+)$/);
		if (match) {
			const prefix = match[1];
			const number = parseInt(match[2]);
			
			if (!idGroups[prefix]) {
				idGroups[prefix] = [];
			}
			idGroups[prefix].push(number);
		}
	});

	// Use "eq" prefix for all Tasks V2
	let mostCommonPrefix = "eq";

	// Find the next available number for the "eq" prefix
	const numbers = idGroups[mostCommonPrefix] || [];
	const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;

	// Format with leading zeros (e.g., "001", "002")
	return `${mostCommonPrefix}_${nextNumber.toString().padStart(3, '0')}`;
} 