import { TaskData, TaskTemplate, importExamTasks } from "./task-data";

// Utility functions for importing real exam tasks

export interface ExamTaskImport {
	exam_year: number;
	exam_session: string;
	exam_type: string;
	tasks: TaskData[];
}

export interface TaskImportOptions {
	validate?: boolean;
	overwrite?: boolean;
	generate_ids?: boolean;
}

export class TaskImporter {
	/**
	 * Import tasks from a JSON file or array
	 */
	static async importFromJSON(data: TaskData[] | ExamTaskImport, options: TaskImportOptions = {}): Promise<ImportResult> {
		const { validate = true, generate_ids = true } = options;
		
		let tasks: TaskData[];
		
		// Handle different input formats
		if (Array.isArray(data)) {
			tasks = data;
		} else {
			// ExamTaskImport format
			tasks = data.tasks.map(task => ({
				...task,
				exam_year: data.exam_year,
				exam_session: data.exam_session,
				exam_type: data.exam_type
			}));
		}

		// Generate IDs if needed
		if (generate_ids) {
			tasks = tasks.map((task, index) => ({
				...task,
				task_id: task.task_id || `imported_${Date.now()}_${index}`
			}));
		}

		// Validate tasks
		if (validate) {
			const validationResults = tasks.map(task => this.validateTask(task));
			const invalidTasks = validationResults.filter(result => !result.valid);
			
			if (invalidTasks.length > 0) {
				return {
					success: false,
					imported: 0,
					errors: invalidTasks.map(result => result.error)
				};
			}
		}

		// Import to database
		try {
			await importExamTasks(tasks);
			return {
				success: true,
				imported: tasks.length,
				errors: []
			};
		} catch (error) {
			return {
				success: false,
				imported: 0,
				errors: [error instanceof Error ? error.message : 'Unknown error']
			};
		}
	}

	/**
	 * Import tasks from CSV file
	 */
	static async importFromCSV(csvContent: string, options: TaskImportOptions = {}): Promise<ImportResult> {
		const lines = csvContent.split('\n').filter(line => line.trim());
		const headers = lines[0].split(',').map(h => h.trim());
		const tasks: TaskData[] = [];

		for (let i = 1; i < lines.length; i++) {
			const values = lines[i].split(',').map(v => v.trim());
			const task: any = {};

			headers.forEach((header, index) => {
				const value = values[index];
				
				// Parse special fields
				if (header === 'solution_steps' || header === 'hints' || header === 'common_mistakes' || header === 'tags') {
					task[header] = value ? value.split('|').map(s => s.trim()) : [];
				} else if (header === 'points' || header === 'exam_year' || header === 'time_limit') {
					task[header] = value ? parseInt(value) : undefined;
				} else {
					task[header] = value;
				}
			});

			tasks.push(task as TaskData);
		}

		return this.importFromJSON(tasks, options);
	}

	/**
	 * Validate a single task
	 */
	static validateTask(task: TaskData): ValidationResult {
		const errors: string[] = [];

		// Required fields
		if (!task.task_id) errors.push('Missing task_id');
		if (!task.question) errors.push('Missing question');
		if (!task.solution_steps || task.solution_steps.length === 0) errors.push('Missing solution_steps');
		if (!task.final_answer) errors.push('Missing final_answer');
		if (!task.module) errors.push('Missing module');
		if (!task.difficulty) errors.push('Missing difficulty');

		// Validate module exists
		const validModules = ['MAA5'];
		if (!validModules.includes(task.module)) {
			errors.push(`Invalid module: ${task.module}`);
		}

		// Validate difficulty
		const validDifficulties = ['perusteet', 'keskitaso', 'vaikea', 'pääsykoetyyli'];
		if (!validDifficulties.includes(task.difficulty)) {
			errors.push(`Invalid difficulty: ${task.difficulty}`);
		}

		// Validate exam session if present
		if (task.exam_session && !['kevät', 'syksy'].includes(task.exam_session)) {
			errors.push(`Invalid exam_session: ${task.exam_session}`);
		}

		return {
			valid: errors.length === 0,
			error: errors.join(', ')
		};
	}

	/**
	 * Generate task templates from existing tasks
	 */
	static generateTemplates(tasks: TaskData[]): TaskTemplate[] {
		// Group tasks by type and difficulty
		const groups = new Map<string, TaskData[]>();
		
		tasks.forEach(task => {
			const key = `${task.task_type}_${task.difficulty}_${task.module}`;
			if (!groups.has(key)) {
				groups.set(key, []);
			}
			groups.get(key)!.push(task);
		});

		const templates: TaskTemplate[] = [];

		groups.forEach((groupTasks, key) => {
			if (groupTasks.length < 3) return; // Need at least 3 similar tasks

			const sample = groupTasks[0];
			const template: TaskTemplate = {
				template_id: `template_${key}`,
				name: `${sample.task_type} - ${sample.difficulty}`,
				description: `Template for ${sample.task_type} tasks in ${sample.module}`,
				module: sample.module,
				task_type: sample.task_type,
				difficulty: sample.difficulty,
				question_template: this.extractTemplate(sample.question),
				solution_template: sample.solution_steps.map(step => this.extractTemplate(step)),
				variables: this.extractVariables(sample.question),
				conditions: []
			};

			templates.push(template);
		});

		return templates;
	}

	/**
	 * Extract template pattern from a question
	 */
	private static extractTemplate(text: string): string {
		// Replace numbers with placeholders
		return text
			.replace(/\b\d+\b/g, '{number}')
			.replace(/\b[a-z]\b/g, '{variable}')
			.replace(/[+\-*/=]/g, '{operator}');
	}

	/**
	 * Extract variables from a question
	 */
	private static extractVariables(text: string): any[] {
		const variables: any[] = [];
		const numbers = text.match(/\b\d+\b/g) || [];
		const letters = text.match(/\b[a-z]\b/g) || [];

		// Add number variables
		numbers.forEach((num, index) => {
			variables.push({
				name: `number_${index}`,
				type: 'number',
				min: parseInt(num) - 5,
				max: parseInt(num) + 5
			});
		});

		// Add letter variables
		letters.forEach((letter, index) => {
			variables.push({
				name: `variable_${index}`,
				type: 'string',
				options: [letter]
			});
		});

		return variables;
	}
}

export interface ImportResult {
	success: boolean;
	imported: number;
	errors: string[];
}

export interface ValidationResult {
	valid: boolean;
	error: string;
}

// Example usage functions
export const exampleImportData: ExamTaskImport = {
	exam_year: 2024,
	exam_session: "kevät",
	exam_type: "pääsykoe",
	tasks: [
		{
			task_id: "exam_2024_1",
			task_type: "equation_solving",
			question: "Ratkaise yhtälö: 3x + 7 = 22",
			solution_steps: [
				"3x + 7 = 22",
				"3x + 7 - 7 = 22 - 7",
				"3x = 15",
				"3x / 3 = 15 / 3",
				"x = 5"
			],
			final_answer: "x = 5",
			points: 2,
			difficulty: "perusteet",
			category: "algebra",
			tags: ["yhtälöt", "lineaarinen"],
			module: "MAA5",
			section: "maa5_mathematical_modeling",
			time_limit: 3,
			hints: ["Muista lisätä sama luku molemmille puolille"],
			common_mistakes: ["Väärä merkki", "Puuttuva jako"]
		}
	]
}; 