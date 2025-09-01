import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromSession } from "@/lib/auth";
import { adminDb } from "@/lib/firebase/admin";

// GET - Get next available task
export async function GET(request: NextRequest) {
	try {
		const user = await getCurrentUserFromSession();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { searchParams } = new URL(request.url);
		const currentTaskId = searchParams.get('currentTaskId');
		const direction = searchParams.get('direction') || 'next'; // 'next' or 'prev'

		// Get all tasks from the same module/section as current task
		let allTasks: any[] = [];
		
		if (currentTaskId) {
			// Get current task to find its module and section
			const currentTaskDoc = await adminDb
				.collection('tasks')
				.where('task_id', '==', currentTaskId)
				.get();

			if (!currentTaskDoc.empty) {
				const currentTask = currentTaskDoc.docs[0].data();
				const module = currentTask.module;
				const section = currentTask.section;

				// Get all tasks from the same module and section
				const tasksSnapshot = await adminDb
					.collection('tasks')
					.where('module', '==', module)
					.where('section', '==', section)
					.where('status', '==', 'published')
					.orderBy('task_id')
					.get();

				allTasks = tasksSnapshot.docs.map(doc => ({
					id: doc.id,
					...doc.data()
				}));
			}
		} else {
			// If no current task, get all published tasks
			const tasksSnapshot = await adminDb
				.collection('tasks')
				.where('status', '==', 'published')
				.orderBy('task_id')
				.limit(100)
				.get();

			allTasks = tasksSnapshot.docs.map(doc => ({
				id: doc.id,
				...doc.data()
			}));
		}

		if (allTasks.length === 0) {
			return NextResponse.json({ error: "No tasks available" }, { status: 404 });
		}

		// Find current task index
		let currentIndex = -1;
		if (currentTaskId) {
			currentIndex = allTasks.findIndex(task => task.task_id === currentTaskId);
		}

		// Determine next/previous task
		let nextTask = null;
		
		if (direction === 'next') {
			if (currentIndex >= 0 && currentIndex < allTasks.length - 1) {
				nextTask = allTasks[currentIndex + 1];
			} else if (currentIndex === -1) {
				// If no current task, return first task
				nextTask = allTasks[0];
			} else {
				// Wrap around to first task
				nextTask = allTasks[0];
			}
		} else {
			// Previous task
			if (currentIndex > 0) {
				nextTask = allTasks[currentIndex - 1];
			} else if (currentIndex === -1) {
				// If no current task, return last task
				nextTask = allTasks[allTasks.length - 1];
			} else {
				// Wrap around to last task
				nextTask = allTasks[allTasks.length - 1];
			}
		}

		if (!nextTask) {
			return NextResponse.json({ error: "No next task available" }, { status: 404 });
		}

		// Get user progress for the next task
		const userDoc = await adminDb.collection('users').doc(user.uid).get();
		const userData = userDoc.exists ? (userDoc.data() as any) : {};
		const completedTasks = (userData?.completedTasks as string[]) || [];
		const isCompleted = completedTasks.includes(nextTask.task_id);

		const progressData = {
			status: isCompleted ? 'completed' : 'not_started',
			attempts: 0, // Not tracking attempts anymore
			timeSpent: 0 // Not tracking time spent anymore
		};

		return NextResponse.json({
			task: {
				task_id: nextTask.task_id,
				module: nextTask.module,
				section: nextTask.section,
				question: nextTask.question,
				difficulty: nextTask.difficulty,
				points: nextTask.points
			},
			progress: progressData
		});

	} catch (error) {
		console.error("Error getting next task:", error);
		return NextResponse.json({ error: "Failed to get next task" }, { status: 500 });
	}
} 