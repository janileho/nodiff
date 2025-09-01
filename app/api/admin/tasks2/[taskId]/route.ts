import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromSession } from "@/lib/auth";
import { adminDb } from "@/lib/firebase/admin";
import { TaskV2, validateTaskV2 } from "@/lib/task-data-v2";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await context.params;

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
    }

    console.log("Fetching task2:", taskId);

    // Get task directly by task_id as document ID
    const taskDoc = await adminDb.collection('tasks2').doc(taskId).get();

    if (!taskDoc.exists) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const taskData = taskDoc.data();

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
      updated_at: taskData.updated_at?.toDate?.()?.toISOString() || taskData.updated_at
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

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await getCurrentUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await context.params;

    const taskData: Partial<TaskV2> = await request.json();
    console.log("Updating task2:", taskId);

    // Check if task exists
    const taskDoc = await adminDb.collection('tasks2').doc(taskId).get();
    if (!taskDoc.exists) {
      return NextResponse.json({ error: "Task2 not found" }, { status: 404 });
    }

    // Validate task data
    const validation = validateTaskV2(taskData);
    if (!validation.valid) {
      return NextResponse.json({ 
        error: "Invalid task data", 
        details: validation.errors 
      }, { status: 400 });
    }

    // Update task with new data
    const updateData = {
      ...taskData,
      updated_at: new Date()
    };

    await adminDb.collection('tasks2').doc(taskId).update(updateData);

    console.log(`Task2 ${taskId} updated successfully`);

    return NextResponse.json({
      success: true,
      message: "Task2 updated successfully"
    });

  } catch (error) {
    console.error("Error updating task2:", error);
    return NextResponse.json({ 
      error: "Failed to update task2",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await getCurrentUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { taskId } = await context.params;

    console.log("Deleting task2:", taskId);

    // Check if task exists
    const taskDoc = await adminDb.collection('tasks2').doc(taskId).get();
    if (!taskDoc.exists) {
      return NextResponse.json({ error: "Task2 not found" }, { status: 404 });
    }

    await adminDb.collection('tasks2').doc(taskId).delete();

    console.log(`Task2 ${taskId} deleted successfully`);

    return NextResponse.json({
      success: true,
      message: "Task2 deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting task2:", error);
    return NextResponse.json({ 
      error: "Failed to delete task2",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 