import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function GET() {
	try {
		console.log('Debug: Fetching all tasks from Firebase');
		
		// Get all tasks without any filters
		const tasksSnapshot = await adminDb.collection('tasks').get();
		
		console.log('Debug: Found', tasksSnapshot.size, 'total tasks in Firebase');
		
		const tasks = tasksSnapshot.docs.map(doc => {
			const data = doc.data();
			return {
				id: doc.id,
				task_id: data.task_id,
				module: data.module,
				section: data.section,
				status: data.status,
				question: data.question,
				created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
				// Include all fields for debugging
				...data
			};
		});

		// Group tasks by module and section for easier debugging
		const groupedTasks: { [key: string]: { [key: string]: any[] } } = {};
		
		tasks.forEach(task => {
			const module = task.module || 'unknown';
			const section = task.section || 'unknown';
			
			if (!groupedTasks[module]) {
				groupedTasks[module] = {};
			}
			if (!groupedTasks[module][section]) {
				groupedTasks[module][section] = [];
			}
			groupedTasks[module][section].push(task);
		});

		// Get unique modules and sections
		const modules = Object.keys(groupedTasks);
		const sections = [...new Set(tasks.map(t => t.section).filter(Boolean))];

		// Special focus on MAA5 module
		const maa5Tasks = tasks.filter(task => task.module === 'MAA5');
		const maa5Sections = [...new Set(maa5Tasks.map(t => t.section).filter(Boolean))];

		return NextResponse.json({
			totalTasks: tasks.length,
			modules: modules,
			allSections: sections,
					maa5Sections: maa5Sections,
		maa5Tasks: maa5Tasks,
			groupedTasks: groupedTasks,
			allTasks: tasks
		});
	} catch (error) {
		console.error('Debug: Error fetching tasks:', error);
		return NextResponse.json({ 
			error: 'Failed to fetch tasks',
			details: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
} 