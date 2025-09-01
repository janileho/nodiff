import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromSession } from "@/lib/auth";
import { getSectionsByModule, mathModules } from "@/lib/task-data";
import { adminDb } from "@/lib/firebase/admin";
import { TaskQualityValidator } from "@/lib/task-quality-validator";
import { TaskQualityEnhancer } from "@/lib/task-quality-enhancer";
import { createEnhancedGenerationPrompt } from "@/lib/enhanced-generation-prompts";

// Function to find next available generic ID
async function findNextGenericId(): Promise<string> {
	// Get all existing task IDs from Firebase
	const tasksSnapshot = await adminDb.collection('tasks').get();
	const existingIds = tasksSnapshot.docs.map(doc => doc.data().task_id);
	
	// Use the same logic as the normal task generation
	return findNextAvailableId(existingIds);
}

function findNextAvailableId(existingIds: string[]): string {
	// Group IDs by prefix (e.g., "eq_", "frac_", "func_")
	const idGroups: { [prefix: string]: number[] } = {};
	
	existingIds.forEach(id => {
		const match = id.match(/^([a-zA-Z]+)_(\d+)$/);
		if (match) {
			const prefix = match[1];
			const number = parseInt(match[2]);
			
			if (!idGroups[prefix]) {
				idGroups[prefix] = [];
			}
			idGroups[prefix].push(number);
		}
	});

	// Find the most common prefix or use a default
	let mostCommonPrefix = "eq";
	let maxCount = 0;
	
	Object.entries(idGroups).forEach(([prefix, numbers]) => {
		if (numbers.length > maxCount) {
			maxCount = numbers.length;
			mostCommonPrefix = prefix;
		}
	});

	// Find the next available number for the chosen prefix
	const numbers = idGroups[mostCommonPrefix] || [];
	const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
	
	// Format with leading zeros (e.g., "001", "002")
	return `${mostCommonPrefix}_${nextNumber.toString().padStart(3, '0')}`;
}

export async function POST(request: NextRequest) {
	try {
		const user = await getCurrentUserFromSession();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await request.json();
		const { 
			task_type = "verbal", 
			selected_modules = ["MAA5"], 
			selected_sections = [], 
			difficulties = ["helppo", "keskitaso", "haastava"],
			tasks_per_difficulty = 3
		} = body;

		// Get the starting ID once to avoid race conditions
		const startingId = await findNextGenericId();
		const prefix = startingId.split('_')[0];
		let currentId = parseInt(startingId.split('_')[1]); // Extract the number part

		const results = [];

		// Generate tasks for each selected module
		for (const moduleId of selected_modules) {
			const module = mathModules.find(m => m.id === moduleId);
			if (!module) {
				console.log(`Module ${moduleId} not found, skipping`);
				continue;
			}

			console.log(`Generating tasks for module: ${moduleId}`);

			// Get sections for this module
			let sections = [];
			if (moduleId === "MAA5") {
				sections = selected_sections.length > 0 
					? getSectionsByModule(moduleId).filter((s: any) => selected_sections.includes(s.id))
					: getSectionsByModule(moduleId);
			} else {
				// For other modules, create a default section based on module
				sections = [{
					id: moduleId.toLowerCase(),
					name: module.name,
					description: module.description,
					learning_objectives: module.topics
				}];
			}

			// Generate tasks for each section
			for (const section of sections) {
				console.log(`Generating tasks for section: ${section.id}`);
				
				for (const difficulty of difficulties) {
					// Generate tasks for each difficulty level
					for (let i = 0; i < tasks_per_difficulty; i++) {
						try {
							console.log(`Generating ${difficulty} task ${i + 1} for ${section.id}`);
							
							// Generate task using AI
							const generatedTask = await generateTaskWithQualityControl(moduleId, section, difficulty, task_type);
							
							// Use current ID and increment for next task
							const taskId = `${prefix}_${currentId.toString().padStart(3, '0')}`;
							currentId++;
							
							// Create task document in Firebase
							const taskData = {
								task_type: task_type,
								task_id: taskId,
								module: moduleId,
								section: section.id,
								question: generatedTask.question,
								solution_steps: generatedTask.solution_steps,
								final_answer: generatedTask.final_answer,
								difficulty: difficulty,
								category: "generated",
								hints: generatedTask.hints || [],
								common_mistakes: generatedTask.common_mistakes || [],
								status: "published",
								created_by: user.uid,
								created_at: new Date(),
								updated_at: new Date(),
								// Add quality metrics if available
								...(generatedTask.quality_metrics && {
									quality_metrics: generatedTask.quality_metrics
								})
							};

							const docRef = await adminDb.collection('tasks').add(taskData);
							
							results.push({
								success: true,
								module: moduleId,
								section: section.id,
								difficulty: difficulty,
								task_id: taskData.task_id,
								firebase_id: docRef.id,
								question: generatedTask.question
							});

							console.log(`Successfully created task: ${taskData.task_id}`);
							
							// Small delay to avoid rate limiting
							await new Promise(resolve => setTimeout(resolve, 1000));
						} catch (error) {
							console.error(`Error generating task for ${section.id} ${difficulty}:`, error);
							results.push({
								success: false,
								module: moduleId,
								section: section.id,
								difficulty: difficulty,
								error: error instanceof Error ? error.message : 'Unknown error'
							});
						}
					}
				}
			}
		}

		// Calculate summary
		const successfulTasks = results.filter(r => r.success);
		const failedTasks = results.filter(r => !r.success);
		
		const totalSections = selected_modules.reduce((total: number, moduleId: string) => {
					if (moduleId === "MAA5") {
				const sections = selected_sections.length > 0 
				? getSectionsByModule(moduleId).filter((s: any) => selected_sections.includes(s.id))
				: getSectionsByModule(moduleId);
				return total + sections.length;
			} else {
				return total + 1; // One default section per module
			}
		}, 0);

		const totalCount = totalSections * difficulties.length * tasks_per_difficulty;

		// Check if we have any successful tasks
		if (successfulTasks.length === 0) {
			return NextResponse.json({
				success: false,
				error: "Failed to generate any tasks. Please check your settings and try again.",
				details: failedTasks.map(task => `${task.module}/${task.section}/${task.difficulty}: ${task.error}`).join(', ')
			}, { status: 500 });
		}

		return NextResponse.json({
			success: true,
			message: `Successfully generated ${successfulTasks.length} out of ${totalCount} requested tasks.`,
			summary: {
				totalRequested: totalCount,
				totalGenerated: successfulTasks.length,
				totalFailed: failedTasks.length,
				modules: selected_modules,
				sections: selected_sections,
				difficulties: difficulties,
				tasksPerDifficulty: tasks_per_difficulty
			},
			results: results
		});

	} catch (error) {
		console.error("Bulk generation error:", error);
		return NextResponse.json({ 
			error: "Failed to generate tasks",
			details: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
}

async function generateTaskWithQualityControl(module: string, section: any, difficulty: string, task_type: string = "verbal") {
	let attempts = 0;
	const maxAttempts = 3;
	
	while (attempts < maxAttempts) {
		console.log(`Attempt ${attempts + 1}: Generating task for ${section.name} (${difficulty})`);
		
		// Generate task
		const task = await generateTaskWithAI(module, section, difficulty, task_type);
		
		// Validate quality
		const validationResult = TaskQualityValidator.validateTask(task, section);
		console.log(`Quality score: ${(validationResult.quality.overallQuality * 100).toFixed(1)}%`);
		
		// Log if task needs human review
		if (validationResult.needsHumanReview) {
			console.log(`Task flagged for human review (${validationResult.reviewPriority} priority): ${validationResult.quality.reviewReason}`);
		}
		
		// If quality is acceptable, return the task
		if (validationResult.quality.overallQuality >= 0.7) {
			console.log(`Task generated successfully with quality: ${(validationResult.quality.overallQuality * 100).toFixed(1)}%`);
			return {
				...task,
				quality_metrics: validationResult.quality
			};
		}
		
		// If quality is poor, try to improve it
		if (validationResult.quality.overallQuality >= 0.4) {
			console.log(`Attempting to improve task quality...`);
			const improvementResult = await TaskQualityEnhancer.enhanceTaskWithRetry(
				task, 
				validationResult.quality, 
				section,
				2 // max retries for improvement
			);
			
			if (improvementResult.qualityAfter >= 0.7) {
				console.log(`Task improved successfully: ${(improvementResult.qualityAfter * 100).toFixed(1)}%`);
				return {
					...improvementResult.improvedTask,
					quality_metrics: {
						...validationResult.quality,
						overallQuality: improvementResult.qualityAfter
					}
				};
			}
		}
		
		attempts++;
		console.log(`Attempt ${attempts}: Quality too low (${(validationResult.quality.overallQuality * 100).toFixed(1)}%), retrying...`);
	}
	
	// If all attempts failed, throw an error
	throw new Error(`Failed to generate a quality task for ${section.name} (${difficulty}) after ${maxAttempts} attempts`);
}

async function generateTaskWithAI(module: string, section: any, difficulty: string, task_type: string = "verbal") {
	// Use enhanced generation prompt
	const prompt = createEnhancedGenerationPrompt(module, section, difficulty, task_type);

	try {
		const response = await fetch("https://api.openai.com/v1/chat/completions", {
			method: "POST",
			headers: {
				"Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: "gpt-4o-mini",
				messages: [
					{
						role: "system",
						content: "Olet matematiikan opettaja, joka luo laadukkaita matematiikan tehtäviä. Vastaa aina JSON-muodossa ja sisällytä KAIKKI välivaiheet ratkaisuun. Tehtävät tulee liittyä suoraan annettuun aiheeseen ja sisältää sopivan määrän haastetta."
					},
					{
						role: "user",
						content: prompt
					}
				],
				max_tokens: 2000,
				temperature: 0.3,
			}),
		});

		if (!response.ok) {
			throw new Error(`OpenAI API error: ${response.status}`);
		}

		const data = await response.json();
		const content = data.choices[0]?.message?.content;

		if (!content) {
			throw new Error("No content received from AI");
		}

		// Parse JSON response
		try {
			const parsed = JSON.parse(content);
			return {
				question: parsed.question || "Tehtävä",
				solution_steps: parsed.solution_steps || ["Ratkaisu"],
				final_answer: parsed.final_answer || "Vastaus",
				hints: parsed.hints || ["Vihje"],
				common_mistakes: parsed.common_mistakes || ["Virhe"]
			};
		} catch (parseError) {
			// Throw error if JSON parsing fails
			throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
		}
	} catch (error) {
		console.error("AI generation error:", error);
		// Throw the error instead of using fallback
		throw new Error(`AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

// getSectionSpecificGuidance function moved to lib/enhanced-generation-prompts.ts

function getFallbackTask(sectionId: string, difficulty: string): any {
	// Return section-specific fallback tasks
	switch (sectionId) {
		case "maa5_mathematical_modeling":
			return {
				question: "Mallintaa värähtelyliike funktiolla y = A·sin(Bt) + C, kun amplitudi on 3, jakso 2π ja keskiarvo 1.",
				solution_steps: [
					"Värähtelyliikkeen yleinen muoto: y = A·sin(Bt) + C",
					"Amplitudi A = 3",
					"Jakso T = 2π, joten B = 2π/T = 2π/2π = 1",
					"Keskiarvo C = 1",
					"Funktio: y = 3·sin(t) + 1"
				],
				final_answer: "y = 3·sin(t) + 1",
				hints: ["Muista jakson ja kulmanopeuden yhteys B = 2π/T"],
				common_mistakes: ["Väärä kulmanopeus", "Väärä keskiarvo"]
			};

		case "maa5_unit_circle":
			return {
				question: "Laske sin(π/6) ja cos(π/6) yksikköympyrän avulla.",
				solution_steps: [
					"Kulma π/6 = 30°",
					"Yksikköympyrässä kulma π/6 vastaa pistettä (√3/2, 1/2)",
					"sin(π/6) = y-koordinaatti = 1/2",
					"cos(π/6) = x-koordinaatti = √3/2"
				],
				final_answer: "sin(π/6) = 1/2, cos(π/6) = √3/2",
				hints: ["Muista yksikköympyrän määritelmä"],
				common_mistakes: ["Väärät koordinaatit", "Väärä järjestys"]
			};

		case "maa5_trigonometric_equations":
			return {
				question: "Ratkaise yhtälö sin(x) = 1/2.",
				solution_steps: [
					"sin(x) = 1/2",
					"arcsin(1/2) = π/6",
					"Ratkaisut: x = π/6 + 2kπ tai x = π - π/6 + 2kπ",
					"x = π/6 + 2kπ tai x = 5π/6 + 2kπ"
				],
				final_answer: "x = π/6 + 2kπ tai x = 5π/6 + 2kπ, k ∈ ℤ",
				hints: ["Muista sinin jaksollisuus ja symmetria"],
				common_mistakes: ["Puuttuva toinen ratkaisu", "Väärä jaksollisuus"]
			};

		case "maa5_trigonometric_identities":
			return {
				question: "Todista identiteetti sin²x + cos²x = 1.",
				solution_steps: [
					"Yksikköympyrässä piste (cos(x), sin(x))",
					"Etäisyys origosta: √(cos²(x) + sin²(x)) = 1",
					"Korotetaan puolittain neliöön: cos²(x) + sin²(x) = 1²",
					"cos²(x) + sin²(x) = 1"
				],
				final_answer: "sin²x + cos²x = 1",
				hints: ["Käytä yksikköympyrän määritelmää"],
				common_mistakes: ["Väärä todistusmenetelmä", "Puuttuva perustelu"]
			};

		case "maa5_exponential_logarithmic":
			return {
				question: "Sievennä lauseke log₂(8) + log₂(4).",
				solution_steps: [
					"log₂(8) + log₂(4)",
					"log₂(8) = 3, koska 2³ = 8",
					"log₂(4) = 2, koska 2² = 4",
					"3 + 2 = 5",
					"Vaihtoehtoisesti: log₂(8·4) = log₂(32) = 5"
				],
				final_answer: "5",
				hints: ["Käytä logaritmien summasääntöä"],
				common_mistakes: ["Väärä logaritmin arvo", "Puuttuva sievennys"]
			};

		case "maa5_software_applications":
			return {
				question: "Ratkaise yhtälö 2^x = 8.",
				solution_steps: [
					"2^x = 8",
					"Koska 2³ = 8",
					"x = 3",
					"Vaihtoehtoisesti: log₂(2^x) = log₂(8)",
					"x = log₂(8) = 3"
				],
				final_answer: "x = 3",
				hints: ["Muista eksponenttifunktion määritelmä"],
				common_mistakes: ["Väärä logaritmin käyttö", "Puuttuva perustelu"]
			};

		default:
		return {
			question: "Ratkaise yhtälö: 2x + 3 = 11",
			solution_steps: [
				"2x + 3 = 11",
				"2x = 11 - 3", 
				"2x = 8",
				"x = 8 / 2",
				"x = 4"
			],
			final_answer: "x = 4",
			hints: ["Muista siirtää vakiot yhtälön toiselle puolelle"],
			common_mistakes: ["Väärä merkki vakion siirrossa"]
		};
	}
} 