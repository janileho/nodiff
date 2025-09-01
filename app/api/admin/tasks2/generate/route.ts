import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromSession } from "@/lib/auth";
import { adminDb } from "@/lib/firebase/admin";
import { TaskV2 } from "@/lib/task-data-v2";
import { Course } from "@/lib/course-data";

interface TaskGenerationRequest {
  course_id: string;
  subject_id?: string;
  learning_objective_ids?: string[];
  difficulty: 'helppo' | 'keskitaso' | 'haastava';
  task_type: 'verbal' | 'nonverbal';
  count: number;
  example_task?: string;
  custom_prompt?: string;
}

interface GeneratedTask {
  question: string;
  solution_steps: string[];
  final_answer: string;
  hints?: string[];
  common_mistakes?: string[];
}

// Function to find next available ID
function findNextAvailableId(existingIds: string[]): string {
  // Group IDs by prefix (e.g., "eq_", "frac_", "func_")
  const idGroups: { [prefix: string]: number[] } = {};
  
  existingIds.forEach(id => {
    const match = id.match(/^([a-zA-Z0-9]+)_(\d+)$/);
    if (match) {
      const prefix = match[1];
      const number = parseInt(match[2]);
      
      if (!idGroups[prefix]) {
        idGroups[prefix] = [];
      }
      idGroups[prefix].push(number);
    }
  });

  // Use "eq" prefix for all Tasks V2
  let mostCommonPrefix = "eq";

  // Find the next available number for the "eq" prefix
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

    const requestData: TaskGenerationRequest = await request.json();
    console.log("Task generation request:", requestData);

    // Validate request
    if (!requestData.course_id) {
      return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
    }

    if (requestData.count < 1 || requestData.count > 10) {
      return NextResponse.json({ error: "Task count must be between 1 and 10" }, { status: 400 });
    }

    // Fetch course data
    const courseDoc = await adminDb.collection('courses').doc(requestData.course_id).get();
    if (!courseDoc.exists) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const courseData = courseDoc.data() as Course;
    const course: Course = {
      id: courseDoc.id,
      name: courseData.name || '',
      description: courseData.description || '',
      learning_objectives: courseData.learning_objectives || [],
      subjects: courseData.subjects || [],
      created_at: courseData.created_at || new Date(),
      updated_at: courseData.updated_at || new Date(),
      status: courseData.status || 'active'
    };

    // Get subject data if specified
    let subject = null;
    if (requestData.subject_id) {
      subject = course.subjects.find(s => s.id === requestData.subject_id);
      if (!subject) {
        return NextResponse.json({ error: "Subject not found" }, { status: 404 });
      }
    }

    // Get learning objectives
    const objectives = requestData.learning_objective_ids && requestData.learning_objective_ids.length > 0
      ? course.learning_objectives.filter(obj => requestData.learning_objective_ids!.includes(obj.id))
      : course.learning_objectives;

    // Get existing task IDs for ID generation
    const tasksSnapshot = await adminDb.collection('tasks2').get();
    const existingTaskIds = tasksSnapshot.docs.map(doc => doc.data().task_id);

    // Generate tasks using AI
    const generatedTasks: TaskV2[] = [];
    const errors: string[] = [];

    for (let i = 0; i < requestData.count; i++) {
      try {
        const task = await generateSingleTask(requestData, course, subject, objectives);
        if (task) {
          // Generate next available task ID
          const nextId = findNextAvailableId([...existingTaskIds, ...generatedTasks.map(t => t.task_id)]);

          const taskV2: TaskV2 = {
            task_id: nextId,
            question: task.question,
            solution_steps: task.solution_steps,
            final_answer: task.final_answer,
            difficulty: requestData.difficulty,
            course_id: course.id,
            subject_id: subject?.id || ''
          };

          // Save to database using task_id as document ID
          await adminDb.collection('tasks2').doc(taskV2.task_id).set({
            ...taskV2,
            created_at: new Date(),
            updated_at: new Date()
          });
          generatedTasks.push(taskV2);
        }
      } catch (error) {
        console.error(`Error generating task ${i + 1}:`, error);
        errors.push(`Task ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log(`Generated ${generatedTasks.length} tasks successfully`);

    return NextResponse.json({
      success: true,
      tasks: generatedTasks,
      total_requested: requestData.count,
      total_generated: generatedTasks.length,
      total_failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully generated ${generatedTasks.length} out of ${requestData.count} tasks`
    });

  } catch (error) {
    console.error("Error in task generation:", error);
    return NextResponse.json({ 
      error: "Failed to generate tasks",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function generateSingleTask(
  request: TaskGenerationRequest,
  course: Course,
  subject: any,
  objectives: any[]
): Promise<GeneratedTask | null> {
  try {
    // Create prompt using the same structure as original tasks
    const prompt = createTaskPrompt(request, course, subject, objectives);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Olet matematiikan opettaja, joka luo laadukkaita matematiikan tehtäviä. Vastaa aina JSON-muodossa ja sisällytä KAIKKI välivaiheet ratkaisuun."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error("No response from OpenAI");
    }

    // Try to parse JSON response
    try {
      const taskData = JSON.parse(aiResponse);
      
      // Validate required fields
      if (!taskData.question || !taskData.solution_steps || !taskData.final_answer) {
        console.error("Missing required fields in AI response:", taskData);
        throw new Error("Missing required fields in AI response");
      }

      return {
        question: taskData.question,
        solution_steps: taskData.solution_steps,
        final_answer: taskData.final_answer,
        hints: taskData.hints || [],
        common_mistakes: taskData.common_mistakes || []
      };
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON. Response:", aiResponse);
      console.error("Parse error:", parseError);
      
      // Try to extract JSON from the response if it contains extra text
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extractedJson = jsonMatch[0];
          const taskData = JSON.parse(extractedJson);
          
          if (taskData.question && taskData.solution_steps && taskData.final_answer) {
            console.log("Successfully extracted JSON from response");
            return {
              question: taskData.question,
              solution_steps: taskData.solution_steps,
              final_answer: taskData.final_answer,
              hints: taskData.hints || [],
              common_mistakes: taskData.common_mistakes || []
            };
          }
        }
      } catch (extractError) {
        console.error("Failed to extract JSON from response:", extractError);
      }
      
      throw new Error("Invalid JSON response from AI");
    }

  } catch (error) {
    console.error("OpenAI API error:", error);
    throw error;
  }
}

function createTaskPrompt(
  request: TaskGenerationRequest,
  course: Course,
  subject: any,
  objectives: any[]
): string {
  const courseName = course.name;
  const courseContent = course.description;
  const subjectName = subject?.name || 'any subject';
  const subjectDescription = subject?.description || '';
  
  const objectivesText = objectives.length > 0 
    ? objectives.map(obj => obj.description).join(', ')
    : 'general course objectives';

  // Improved prompt with more explicit JSON instructions
  const prompt = `Luo matematiikan tehtävä seuraaville tiedoille:

Moduuli: ${courseName}
Aihe: ${subjectName}
Kuvaus: ${subjectDescription}
Tavoitteet: ${objectivesText}
Vaikeustaso: ${request.difficulty}
Tehtävätyyppi: ${request.task_type === 'verbal' ? 'sanallinen' : 'nonverbal'}
${request.example_task ? `Esimerkkitehtävä: ${request.example_task}` : ''}

TÄRKEÄÄ: Vastaa AINOASTAAN JSON-muodossa. Älä lisää mitään muuta tekstiä.

JSON-rakenne:
{
  "question": "Tehtävän kysymys suomeksi",
  "solution_steps": ["Vaihe 1", "Vaihe 2", "Vaihe 3", "Vaihe 4", "Vaihe 5"],
  "final_answer": "Lopullinen vastaus",
  "hints": ["Vihje 1", "Vihje 2"],
  "common_mistakes": ["Yleinen virhe 1", "Yleinen virhe 2"]
}

RATKAISUVASTAUKSEN OHJEET:
- Sisällytä JOKAINEN välivaihe
- Jokainen vaihe on selkeä ja yksittäinen operaatio
- Esimerkiksi: "2x + 3 = 11 → 2x = 11 - 3 → 2x = 8 → x = 8/2 → x = 4"

Tehtävän tulee olla:
- Sopivaa vaikeustasoa (${request.difficulty})
- Selkeä ja ymmärrettävä
- Ratkaistavissa annetuilla tiedoilla

Vastaa vain JSON-muodossa, ei mitään muuta.`;

  return prompt;
} 