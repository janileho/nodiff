import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ taskId: string }> }
) {
	try {
		const { taskId } = await params;

		if (!taskId) {
			return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
		}

		console.log('Fetching task with ID:', taskId);

		const taskDoc = await adminDb.collection("tasks")
			.where('task_id', '==', taskId)
			.limit(1)
			.get();
		
		if (!taskDoc.empty) {
			const doc = taskDoc.docs[0];
			const data = doc.data();
			const task = {
				id: doc.id,
				...data,
				// Convert Firestore timestamps to ISO strings like the admin page does
				created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
				updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at
			};

			console.log('Returning task from Firebase');
			return NextResponse.json(task);
		}
		
		console.log('Task not found in Firebase');
		return NextResponse.json({ error: 'Task not found' }, { status: 404 });
	} catch (error) {
		console.error('Error fetching task:', error);
		return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
	}
} 