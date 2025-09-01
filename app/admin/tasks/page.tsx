import { adminDb } from "@/lib/firebase/admin";
import Link from "next/link";
import TaskListClient from "./TaskListClient";
import BulkGenerateButton from "./BulkGenerateButton";

import { TaskImporter, exampleImportData } from "@/lib/task-import";

export default async function TasksPage() {
	// Get all tasks from Firebase
	const tasksSnapshot = await adminDb.collection('tasks').orderBy('created_at', 'desc').get();
	
	const tasks = tasksSnapshot.docs.map(doc => {
		const data = doc.data();
		return {
			id: doc.id,
			task_id: data.task_id || '',
			module: data.module || '',
			section: data.section || '',
			question: data.question || '',
			difficulty: data.difficulty || '',
			status: data.status || 'draft',
			// Convert Firestore timestamps to ISO strings
			created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at || new Date().toISOString(),
			updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at || new Date().toISOString()
		};
	});

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
					<p className="text-gray-600 mt-1">Manage all math tasks in the system</p>
				</div>
				<div className="flex gap-3">
					<BulkGenerateButton />
					<Link
						href="/admin/tasks/create"
						className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
					>
						<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
						</svg>
						Create Task
					</Link>
				</div>
			</div>

			{/* Task List */}
			<TaskListClient initialTasks={tasks} />
		</div>
	);
} 