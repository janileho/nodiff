// Task data structure for Firebase integration
export interface TaskData {
	task_id: string;
	module: string;
	section: string;
	question: string;
	solution_steps: string[];
	final_answer: string;
	difficulty: "helppo" | "keskitaso" | "haastava";
	task_type: "verbal" | "nonverbal";
	category: string;
	exam_year?: number;
	exam_session?: string;
	time_limit?: number;
	hints?: string[];
	common_mistakes?: string[];
	status?: "draft" | "published" | "archived";
	created_at?: Date;
	updated_at?: Date;
}

export interface TaskTemplate {
	id: string;
	name: string;
	description: string;
	module: string;
	section: string;
	difficulty: "helppo" | "keskitaso" | "haastava";
	task_type: "verbal" | "nonverbal";
	conditions?: string[]; // Validation rules
}

export async function getTaskData(taskId?: string): Promise<TaskData | null> {
	if (!taskId) {
		return null;
	}

	try {
		// Try tasks2 first, then fall back to original tasks
		let response = await fetch(`/api/tasks2/${taskId}`);
		if (response.ok) {
			return await response.json();
		}
		
		// Fall back to original tasks API
		response = await fetch(`/api/tasks/${taskId}`);
		if (response.ok) {
			return await response.json();
		}
		
		return null;
	} catch (error) {
		console.error("Error fetching task data:", error);
		return null;
	}
}

export function getTaskQuestion(taskData: TaskData): string {
	return taskData.question;
}

export function getTaskSolutionSteps(taskData: TaskData): string[] {
	return taskData.solution_steps;
}

export function formatTaskDataForAI(taskData: TaskData): string {
	return `
TEHTÄVÄN TIEDOT:
- Tyyppi: ${taskData.task_type}
- ID: ${taskData.task_id}
- Kysymys: ${taskData.question}
- Vaikeustaso: ${taskData.difficulty}
- Kategoria: ${taskData.category}
- Moduuli: ${taskData.module}
${taskData.exam_year ? `- Koevuosi: ${taskData.exam_year} ${taskData.exam_session}` : ''}
${taskData.time_limit ? `- Aikaraja: ${taskData.time_limit} min` : ''}

OIKEA RATKAISU:
${taskData.solution_steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

LOPPUVASTAUS: ${taskData.final_answer}
${taskData.hints ? `\nVINKEJÄ:\n${taskData.hints.map(hint => `- ${hint}`).join('\n')}` : ''}
${taskData.common_mistakes ? `\nYLEISET VIRHEET:\n${taskData.common_mistakes.map(mistake => `- ${mistake}`).join('\n')}` : ''}
	`.trim();
}

// Firebase-based task fetching functions - now using API routes
export async function getTasksByModule(moduleId: string): Promise<TaskData[]> {
	try {
		const response = await fetch(`/api/tasks?module=${moduleId}`);
		if (response.ok) {
			return await response.json();
		}
		return [];
	} catch (error) {
		console.error("Error fetching tasks by module:", error);
		return [];
	}
}

export async function getTasksBySection(moduleId: string, sectionId: string): Promise<TaskData[]> {
	console.log('Client: Fetching tasks for module:', moduleId, 'section:', sectionId);
	
	try {
		const response = await fetch(`/api/tasks?module=${moduleId}&section=${sectionId}`);
		console.log('Client: API response status:', response.status);
		
		if (response.ok) {
			const tasks = await response.json();
			console.log('Client: Received', tasks.length, 'tasks from API');
			console.log('Client: Task details:', tasks.map((t: any) => ({ id: t.task_id, section: t.section, status: t.status })));
			return tasks;
		}
		
		console.log('Client: API response not ok, returning empty array');
		return [];
	} catch (error) {
		console.error("Client: Error fetching tasks by section:", error);
		return [];
	}
}

export async function generateTasks(request: any): Promise<TaskData[]> {
	// TODO: Implement AI-powered task generation
	// 1. Select appropriate templates
	// 2. Generate variables
	// 3. Validate conditions
	// 4. Create tasks
	return [];
}

export async function importExamTasks(tasks: TaskData[]): Promise<void> {
	// TODO: Implement Firebase import
	// await adminDb.collection("tasks").add(tasks);
	console.log(`Importing ${tasks.length} exam tasks`);
}