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

export interface MathModule {
	id: string;
	name: string;
	credits: number;
	description: string;
	topics: string[];
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

export const mathModules: MathModule[] = [
	{
		id: "MAA5",
		name: "Funktiot ja yhtälöt 2",
		credits: 2,
		description: "Eksponentti- ja logaritmifunktiot sekä trigonometriset funktiot.",
		topics: ["eksponenttifunktiot", "logaritmifunktiot", "trigonometriset funktiot"]
	}
];

// Section name mapping - maps expected section IDs to actual database section names
const sectionNameMapping: { [key: string]: string } = {
	'maa5_mathematical_modeling': 'maa5_mathematical_modeling',
	'maa5_unit_circle': 'maa5_unit_circle',
	'maa5_trigonometric_equations': 'maa5_trigonometric_equations',
	'maa5_trigonometric_identities': 'maa5_trigonometric_identities',
	'maa5_exponential_logarithmic': 'maa5_exponential_logarithmic',
	'maa5_software_applications': 'maa5_software_applications'
};

// Function to get the actual section name from the expected section ID
export function getActualSectionName(expectedSectionId: string): string {
	return sectionNameMapping[expectedSectionId] || expectedSectionId;
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

export function getModuleById(moduleId: string): MathModule | undefined {
	return mathModules.find(module => module.id === moduleId);
}

export function getAllModules(): MathModule[] {
	return mathModules;
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

export function getSectionsByModule(moduleId: string) {
	if (moduleId === "MAA5") {
		return [
			{
				id: "maa5_mathematical_modeling",
				name: "Matematiikka mallintaminen",
				description: "Ilmiöiden mallintaminen trigonometrisilla ja eksponenttifunktioilla. Sisältää sinifunktiot y = A·sin(B(x-C)) + D, kosinifunktiot y = A·cos(B(x-C)) + D, eksponenttifunktiot f(x) = a^x ja logaritmifunktiot y = log_a(x). Esimerkkejä: värähtelyt, sähkövirrat, populaatiokasvu, radioaktiivinen hajoaminen.",
				learning_objectives: [
					"Ymmärtää mallintamisen perusajatus ja sen sovellukset",
					"Hallita trigonometristen funktioiden mallintamiskäyttö",
					"Osata mallintaa eksponentti- ja logaritmifunktioilla",
					"Ratkaista mallintamistehtäviä vaiheittain"
				]
			},
			{
				id: "maa5_unit_circle",
				name: "Yksikköympyrä",
				description: "Sini- ja kosinifunktiot yksikköympyrän symmetrioiden avulla. Sisältää sin(θ) = y, cos(θ) = x, jaksollisuus sin(θ+2π) = sin(θ), symmetriat sin(-θ) = -sin(θ), cos(-θ) = cos(θ), erikoisarvoja sin(0)=0, sin(π/6)=1/2, sin(π/4)=√2/2, sin(π/3)=√3/2, sin(π/2)=1.",
				learning_objectives: [
					"Ymmärtää trigonometriset funktiot yksikköympyrän avulla",
					"Hallita sinin ja kosinin jaksollisuus ja symmetriat",
					"Osata trigonometristen funktioiden erikoisarvoja",
					"Käyttää yksikköympyrää trigonometristen arvojen määrittämiseen"
				]
			},
			{
				id: "maa5_trigonometric_equations",
				name: "Trigonometriset yhtälöt",
				description: "Yhtälöt tyyppiä sin f(x) = a tai sin f(x) = sin g(x). Sisältää ratkaisut x = arcsin(a) + 2kπ, x = π - arcsin(a) + 2kπ, kaksoiskulmaformulat sin(2x) = 2sin(x)cos(x), cos(2x) = cos²(x) - sin²(x) = 2cos²(x) - 1 = 1 - 2sin²(x).",
				learning_objectives: [
					"Ymmärtää trigonometristen yhtälöiden ratkaisumenetelmät",
					"Hallita arcsin- ja arccos-funktioiden käyttö",
					"Osata kaksoiskulmaformulat",
					"Ratkaista trigonometrisia yhtälöitä vaiheittain"
				]
			},
			{
				id: "maa5_trigonometric_identities",
				name: "Trigonometriset identiteetit",
				description: "Sini- ja kosinifunktioiden yhteys sin²x + cos²x = 1. Sisältää johdetut identiteetit sin²x = 1 - cos²x, cos²x = 1 - sin²x, tangentin määritelmä tan(x) = sin(x)/cos(x), kotangentin cot(x) = cos(x)/sin(x), sekantin sec(x) = 1/cos(x), kosekantin csc(x) = 1/sin(x).",
				learning_objectives: [
					"Ymmärtää Pythagoraan identiteetin sin²x + cos²x = 1",
					"Hallita trigonometristen identiteettien johdannaiset",
					"Osata muiden trigonometristen funktioiden määritelmät",
					"Käyttää identiteettejä trigonometristen lausekkeiden sieventämisessä"
				]
			},
			{
				id: "maa5_exponential_logarithmic",
				name: "Eksponentti- ja logaritmifunktiot",
				description: "Eksponenttifunktiot f(x) = a^x, a > 0, a ≠ 1 ja logaritmifunktiot y = log_a(x). Sisältää eksponenttien laskusäännöt a^m·a^n = a^(m+n), a^m/a^n = a^(m-n), (a^m)^n = a^(mn), a^(-n) = 1/a^n, logaritmien laskusäännöt log_a(xy) = log_a(x) + log_a(y), log_a(x/y) = log_a(x) - log_a(y), log_a(x^r) = r·log_a(x).",
				learning_objectives: [
					"Ymmärtää eksponentti- ja logaritmifunktioiden määritelmät",
					"Hallita eksponenttien ja logaritmien laskusäännöt",
					"Osata luonnollisen eksponenttifunktion f(x) = e^x ominaisuudet",
					"Käyttää logaritmeja eksponenttiyhtälöiden ratkaisemiseen"
				]
			},
			{
				id: "maa5_software_applications",
				name: "Ohjelmistojen käyttö",
				description: "Funktioiden tutkiminen ja yhtälöiden ratkaisu ohjelmistoilla. Sisältää eksponenttiyhtälöiden ratkaisut a^f(x) = a^g(x) ⇒ f(x) = g(x), logaritmiyhtälöiden ratkaisut log_a(f(x)) = log_a(g(x)) ⇒ f(x) = g(x), käänteisrelaatiot a^log_a(x) = x, log_a(a^x) = x, ln(e^x) = x, e^ln(x) = x.",
				learning_objectives: [
					"Ymmärtää eksponentti- ja logaritmiyhtälöiden ratkaisumenetelmät",
					"Hallita eksponentti- ja logaritmifunktioiden käänteisrelaatiot",
					"Osata ohjelmistojen käyttö matematiikan oppimisessa",
					"Ratkaista monimutkaisia eksponentti- ja logaritmiyhtälöitä"
				]
			}
		];
	}
	return [];
}

export function getSectionById(moduleId: string, sectionId: string) {
	const sections = getSectionsByModule(moduleId);
	return sections.find(section => section.id === sectionId);
}

// Task generation functions
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