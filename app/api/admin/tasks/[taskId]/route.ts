import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUserFromSession } from "@/lib/auth";

// GET - Get single task
export async function GET(
	request: NextRequest,
	context: { params: Promise<{ taskId: string }> }
) {
	try {
		const user = await getCurrentUserFromSession();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { taskId } = await context.params;
		const taskDoc = await adminDb.collection('tasks').doc(taskId).get();
		
		if (!taskDoc.exists) {
			return NextResponse.json({ error: "Task not found" }, { status: 404 });
		}

		const data = taskDoc.data();
		if (!data) {
			return NextResponse.json({ error: "Task data not found" }, { status: 404 });
		}
		
		return NextResponse.json({
			id: taskDoc.id,
			...data,
			// Convert Firestore timestamps to ISO strings
			created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
			updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at
		});
	} catch (error) {
		console.error("Error fetching task:", error);
		return NextResponse.json({ error: "Failed to fetch task" }, { status: 500 });
	}
}

// PUT - Update task
export async function PUT(
	request: NextRequest,
	context: { params: Promise<{ taskId: string }> }
) {
	try {
		const user = await getCurrentUserFromSession();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { taskId } = await context.params;
		const body = await request.json();
		
		// Check if task exists
		const taskDoc = await adminDb.collection('tasks').doc(taskId).get();
		if (!taskDoc.exists) {
			return NextResponse.json({ error: "Task not found" }, { status: 404 });
		}

		// Update task
		const updateData = {
			...body,
			updated_at: new Date()
		};

		await adminDb.collection('tasks').doc(taskId).update(updateData);
		
		return NextResponse.json({ 
			id: taskId,
			...updateData 
		});
	} catch (error) {
		console.error("Error updating task:", error);
		return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
	}
}

// DELETE - Delete task
export async function DELETE(
	request: NextRequest,
	context: { params: Promise<{ taskId: string }> }
) {
	try {
		const user = await getCurrentUserFromSession();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { taskId } = await context.params;

		// Check if task exists
		const taskDoc = await adminDb.collection('tasks').doc(taskId).get();
		if (!taskDoc.exists) {
			return NextResponse.json({ error: "Task not found" }, { status: 404 });
		}

		// Delete task
		await adminDb.collection('tasks').doc(taskId).delete();
		
		return NextResponse.json({ message: "Task deleted successfully" });
	} catch (error) {
		console.error("Error deleting task:", error);
		return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
	}
} 