import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const module = searchParams.get('module') || 'MAA5';
		const section = searchParams.get('section');

		console.log('Debug: Testing section query for module:', module, 'section:', section);

		// Test different section names that might exist
		const possibleSections = [
			'basic_operations',
			'percentages', 
			'powers',
			'proportionality',
			'functions',
			'may', // Possible alternative
			'peruslaskutoimitukset', // Finnish name
			'prosenttilaskenta' // Finnish name
		];

		const results: { [key: string]: any[] } = {};

		// Test each possible section name
		for (const testSection of possibleSections) {
			try {
				const query = adminDb.collection('tasks')
					.where('module', '==', module)
					.where('section', '==', testSection);

				const snapshot = await query.get();
				const tasks = snapshot.docs.map(doc => {
					const data = doc.data();
					return {
						id: doc.id,
						task_id: data.task_id,
						module: data.module,
						section: data.section,
						question: data.question
					};
				});

				if (tasks.length > 0) {
					results[testSection] = tasks;
				}
			} catch (error) {
				console.log(`Error testing section ${testSection}:`, error);
			}
		}

		// Also test without section filter
		const allModuleTasks = await adminDb.collection('tasks')
			.where('module', '==', module)
			.get();

		const allTasks = allModuleTasks.docs.map(doc => {
			const data = doc.data();
			return {
				id: doc.id,
				task_id: data.task_id,
				module: data.module,
				section: data.section,
				question: data.question
			};
		});

		return NextResponse.json({
			module: module,
			requestedSection: section,
			sectionResults: results,
			allModuleTasks: allTasks,
			possibleSections: possibleSections
		});
	} catch (error) {
		console.error('Debug: Error in section test:', error);
		return NextResponse.json({ 
			error: 'Failed to test sections',
			details: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
} 