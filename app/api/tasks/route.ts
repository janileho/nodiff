import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const module = searchParams.get('module');
		const section = searchParams.get('section');

		if (!module) {
			return NextResponse.json({ error: 'Module parameter is required' }, { status: 400 });
		}

		console.log('API: Fetching tasks for module:', module, 'section:', section);

		// Build query step by step
		let query = adminDb.collection('tasks').where('module', '==', module);

		if (section) {
			query = query.where('section', '==', section);
		}

		console.log('API: Executing query...');
		const tasksSnapshot = await query.get();
		console.log('API: Query completed, found', tasksSnapshot.size, 'tasks');
		
		const tasks = tasksSnapshot.docs.map(doc => {
			const data = doc.data();
			return {
				id: doc.id,
				...data
			};
		});

		console.log('API: Returning', tasks.length, 'tasks');
		return NextResponse.json(tasks);
	} catch (error) {
		console.error('API: Error details:', error);
		console.error('API: Error message:', error instanceof Error ? error.message : 'Unknown error');
		console.error('API: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
		return NextResponse.json({ 
			error: 'Failed to fetch tasks',
			details: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
} 