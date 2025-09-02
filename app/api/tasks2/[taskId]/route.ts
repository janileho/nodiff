import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    console.log("Fetching task2:", taskId);

    // Use task_id as document ID directly
    const taskDoc = await adminDb.collection('tasks2').doc(taskId).get();

    if (!taskDoc.exists) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const taskData = taskDoc.data();

    if (!taskData) {
      return NextResponse.json({ error: "Task data is null" }, { status: 404 });
    }

    // Convert to the same format as original tasks
    const task = {
      task_id: taskData.task_id,
      module: taskData.module,
      section: taskData.section,
      question: taskData.question,
      solution_steps: taskData.solution_steps,
      final_answer: taskData.final_answer,
      difficulty: taskData.difficulty,
      task_type: taskData.task_type,
      category: taskData.category,
      exam_year: taskData.exam_year,
      exam_session: taskData.exam_session,
      time_limit: taskData.time_limit,
      hints: taskData.hints || [],
      common_mistakes: taskData.common_mistakes || [],
      status: taskData.status,
      created_at: taskData.created_at?.toDate?.()?.toISOString() || taskData.created_at,
      updated_at: taskData.updated_at?.toDate?.()?.toISOString() || taskData.updated_at,
      course_id: taskData.course_id,
      subject_id: taskData.subject_id
    };

    console.log("Task2 found:", task.task_id);

    return NextResponse.json(task);

  } catch (error) {
    console.error("Error fetching task2:", error);
    return NextResponse.json({ 
      error: "Failed to fetch task2",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 