import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromSession } from "@/lib/auth";
import { adminDb } from "@/lib/firebase/admin";

// GET - Get user progress (specific task or summary)
export async function GET(request: NextRequest) {
	try {
		const user = await getCurrentUserFromSession();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { searchParams } = new URL(request.url);
		const summary = searchParams.get('summary');
		const taskId = searchParams.get('taskId');

		if (summary === 'true') {
			// Get overall progress summary
					const userDoc = await adminDb.collection('users').doc(user.uid).get();
		const userData = userDoc.exists ? (userDoc.data() as any) : {};
		const completedTasks = (userData?.completedTasks as string[]) || [];
			
			// Get total number of published tasks
			const tasksSnapshot = await adminDb
				.collection('tasks')
				.where('status', '==', 'published')
				.get();
			
			const totalTasks = tasksSnapshot.size;
			const completedCount = completedTasks.length;
			const notStartedCount = totalTasks - completedCount;

			const summaryData = {
				totalTasks,
				completedTasks: completedCount,
				inProgressTasks: 0, // Not tracking in-progress anymore
				notStartedTasks: notStartedCount,
				totalTimeSpent: 0, // Not tracking time spent anymore
				lastCompleted: null // Not tracking completion dates anymore
			};

			return NextResponse.json(summaryData);
		}

		// Get specific task progress
		if (!taskId) {
			return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
		}

		const userDoc = await adminDb.collection('users').doc(user.uid).get();
		const userData = userDoc.exists ? (userDoc.data() as any) : {};
		const completedTasks = (userData?.completedTasks as string[]) || [];
		const isCompleted = completedTasks.includes(taskId);

		return NextResponse.json({
			taskId,
			status: isCompleted ? 'completed' : 'not_started',
			completedAt: isCompleted ? new Date().toISOString() : null,
			attempts: 0, // Not tracking attempts anymore
			lastAttempted: null, // Not tracking last attempted anymore
			timeSpent: 0 // Not tracking time spent anymore
		});

	} catch (error) {
		console.error("Error fetching user progress:", error);
		return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
	}
}

// POST - Update user progress for a task
export async function POST(request: NextRequest) {
	try {
		const user = await getCurrentUserFromSession();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await request.json();
		const { taskId, status } = body;

		if (!taskId || !status) {
			return NextResponse.json({ error: "Task ID and status are required" }, { status: 400 });
		}

		const userRef = adminDb.collection('users').doc(user.uid);
		const userDoc = await userRef.get();
		const userData = userDoc.exists ? (userDoc.data() as any) : {};
		const completedTasks = (userData?.completedTasks as string[]) || [];

		let updatedCompletedTasks = [...completedTasks];

		if (status === 'completed') {
			// Add task to completed tasks if not already there
			if (!completedTasks.includes(taskId)) {
				updatedCompletedTasks.push(taskId);
			}
		} else if (status === 'not_started') {
			// Remove task from completed tasks
			updatedCompletedTasks = completedTasks.filter((id: string) => id !== taskId);
		}
		// Note: 'in_progress' status is not stored anymore

		// Update user document
		await userRef.set({
			completedTasks: updatedCompletedTasks,
			updatedAt: new Date()
		}, { merge: true });

		const progressData = {
			taskId,
			status: updatedCompletedTasks.includes(taskId) ? 'completed' : 'not_started',
			completedAt: updatedCompletedTasks.includes(taskId) ? new Date().toISOString() : null,
			attempts: 0,
			timeSpent: 0
		};

		return NextResponse.json({ success: true, progress: progressData });

	} catch (error) {
		console.error("Error updating user progress:", error);
		return NextResponse.json({ error: "Failed to update progress" }, { status: 500 });
	}
} 