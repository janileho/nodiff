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
        question: data.question,
        solution_steps: data.solution_steps,
        final_answer: data.final_answer,
        difficulty: data.difficulty,
        course_id: data.course_id,
        subject_id: data.subject_id
      };
    }) as TaskV2[];

    // Apply filters in memory
    if (courseId) {
      tasks = tasks.filter(task => task.course_id === courseId);
    }
    if (subjectId) {
      tasks = tasks.filter(task => task.subject_id === subjectId);
    }
    // Status filter removed due to simplified schema
    if (difficulty) {
      tasks = tasks.filter(task => task.difficulty === difficulty);
    }

    console.log(`Found ${tasks.length} tasks2 after filtering`);

    const res = NextResponse.json({
      tasks,
      total: tasks.length
    });
    res.headers.set('Cache-Control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=60');
    return res;

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
      question: taskData.question || '',
      solution_steps: taskData.solution_steps || [],
      final_answer: taskData.final_answer || '',
      difficulty: taskData.difficulty || 'keskitaso',
      course_id: taskData.course_id || '',
      subject_id: taskData.subject_id || ''
    };

    // Use task_id as the document ID
    await adminDb.collection('tasks2').doc(newTask.task_id).set({
      ...newTask,
      created_at: now,
      updated_at: now
    });

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