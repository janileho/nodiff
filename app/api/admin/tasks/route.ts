import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUserFromSession } from "@/lib/auth";

// GET - List all tasks
export async function GET() {
	try {
		const user = await getCurrentUserFromSession();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const tasksSnapshot = await adminDb.collection('tasks').orderBy('created_at', 'desc').get();
		
		const tasks = tasksSnapshot.docs.map(doc => {
			const data = doc.data();
			return {
				id: doc.id,
				...data,
				// Convert Firestore timestamps to ISO strings
				created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
				updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at
			};
		});

		return NextResponse.json({ tasks });
	} catch (error) {
		console.error("Error fetching tasks:", error);
		return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
	}
}

// POST - Create new task
export async function POST(request: NextRequest) {
	try {
		const user = await getCurrentUserFromSession();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await request.json();
		
		// Validate required fields
		const requiredFields = ['task_id', 'module', 'section', 'question', 'solution_steps', 'final_answer'];
		for (const field of requiredFields) {
			if (!body[field]) {
				return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
			}
		}

		// Check if task_id already exists
		const existingTask = await adminDb.collection('tasks')
			.where('task_id', '==', body.task_id)
			.get();
		
		if (!existingTask.empty) {
			return NextResponse.json({ error: "Task ID already exists" }, { status: 400 });
		}

		// Create task document
		const taskData = {
			...body,
			status: body.status || 'draft',
			created_at: new Date(),
			updated_at: new Date(),
			created_by: user.uid
		};

		const docRef = await adminDb.collection('tasks').add(taskData);
		
		return NextResponse.json({ 
			id: docRef.id,
			...taskData 
		}, { status: 201 });
	} catch (error) {
		console.error("Error creating task:", error);
		return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
	}
} 