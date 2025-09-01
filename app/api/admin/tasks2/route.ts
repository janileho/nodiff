import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromSession } from "@/lib/auth";
import { adminDb } from "@/lib/firebase/admin";
import { TaskV2, validateTaskV2 } from "@/lib/task-data-v2";

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

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course_id');
    const subjectId = searchParams.get('subject_id');
    const status = searchParams.get('status');
    const difficulty = searchParams.get('difficulty');
    const limit = parseInt(searchParams.get('limit') || '50');

    console.log("Fetching tasks2 from database");

    // Simplified query - get all tasks and filter in memory to avoid index issues
    let query = adminDb.collection('tasks2').orderBy('created_at', 'desc');

    const tasksSnapshot = await query.limit(limit).get();

    let tasks = tasksSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        task_id: data.task_id,
        module: data.module,
        section: data.section,
        question: data.question,
        solution_steps: data.solution_steps,
        final_answer: data.final_answer,
        difficulty: data.difficulty,
        task_type: data.task_type,
        category: data.category,
        exam_year: data.exam_year,
        exam_session: data.exam_session,
        time_limit: data.time_limit,
        hints: data.hints || [],
        common_mistakes: data.common_mistakes || [],
        status: data.status,
        course_id: data.course_id,
        subject_id: data.subject_id,
        created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
        updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at,
        created_by: data.created_by,
        ai_generated: data.ai_generated
      };
    }) as TaskV2[];

    // Apply filters in memory
    if (courseId) {
      tasks = tasks.filter(task => task.course_id === courseId);
    }
    if (subjectId) {
      tasks = tasks.filter(task => task.subject_id === subjectId);
    }
    if (status) {
      tasks = tasks.filter(task => task.status === status);
    }
    if (difficulty) {
      tasks = tasks.filter(task => task.difficulty === difficulty);
    }

    console.log(`Found ${tasks.length} tasks2 after filtering`);

    return NextResponse.json({
      tasks,
      total: tasks.length
    });

  } catch (error) {
    console.error("Error fetching tasks2:", error);
    return NextResponse.json({ 
      error: "Failed to fetch tasks2",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const taskData: Partial<TaskV2> = await request.json();

    console.log("Creating new task2:", taskData.question?.substring(0, 50) + "...");

    // Validate task data
    const validation = validateTaskV2(taskData);
    if (!validation.valid) {
      return NextResponse.json({ 
        error: "Invalid task data", 
        details: validation.errors 
      }, { status: 400 });
    }

    // Get existing task IDs for ID generation
    const tasksSnapshot = await adminDb.collection('tasks2').get();
    const existingTaskIds = tasksSnapshot.docs.map(doc => doc.data().task_id);

    // Generate next available task ID
    const nextId = findNextAvailableId(existingTaskIds);

    const now = new Date();
    const newTask: TaskV2 = {
      task_id: taskData.task_id || nextId,
      module: taskData.module || '',
      section: taskData.section || '',
      question: taskData.question || '',
      solution_steps: taskData.solution_steps || [],
      final_answer: taskData.final_answer || '',
      difficulty: taskData.difficulty || 'keskitaso',
      task_type: taskData.task_type || 'verbal',
      category: taskData.category || 'manual',
      exam_year: taskData.exam_year,
      exam_session: taskData.exam_session,
      time_limit: taskData.time_limit,
      hints: taskData.hints || [],
      common_mistakes: taskData.common_mistakes || [],
      status: taskData.status || 'draft',
      course_id: taskData.course_id || '',
      subject_id: taskData.subject_id || '',
      created_at: now,
      created_by: user.uid,
      ai_generated: taskData.ai_generated || false
    };

    // Use task_id as the document ID
    await adminDb.collection('tasks2').doc(newTask.task_id).set(newTask);

    console.log(`Task2 ${newTask.task_id} created successfully`);

    return NextResponse.json({
      success: true,
      message: "Task2 created successfully",
      task: newTask
    });

  } catch (error) {
    console.error("Error creating task2:", error);
    return NextResponse.json({ 
      error: "Failed to create task2",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 