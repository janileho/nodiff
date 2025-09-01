import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromSession } from "@/lib/auth";
import { adminDb } from "@/lib/firebase/admin";

interface DownvotedTask {
  id: string;
  taskId: string;
  question: string;
  section: string;
  module: string;
  created_at: any;
  downvoted_at: any;
  first_reason: string;
  first_message: string;
  vote_count: number;
  last_vote_at?: any;
}

export async function GET(request: NextRequest) {
  try {
    console.log("Admin votes: Starting request");
    
    const user = await getCurrentUserFromSession();
    if (!user) {
      console.log("Admin votes: Unauthorized user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    console.log("Admin votes: User authenticated:", user.email);

    // Get all downvoted task IDs
    console.log("Admin votes: Fetching downvoted task IDs");
    let downvotedTasksSnapshot;
    try {
      downvotedTasksSnapshot = await adminDb.collection('downvoted_tasks')
        .orderBy('downvoted_at', 'desc')
        .get();
    } catch (orderError) {
      console.log("Admin votes: Ordering by downvoted_at failed, trying without order:", orderError);
      downvotedTasksSnapshot = await adminDb.collection('downvoted_tasks')
        .get();
    }

    console.log("Admin votes: Fetched", downvotedTasksSnapshot.docs.length, "downvoted task IDs");

    const downvotedTaskIds = downvotedTasksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as DownvotedTask[];

    console.log("Admin votes: Found", downvotedTaskIds.length, "downvoted task IDs");

    // Fetch actual task data for each downvoted task
    const tasksWithVotes = [];
    for (const downvotedTask of downvotedTaskIds) {
      try {
        const taskDoc = await adminDb.collection('tasks').doc(downvotedTask.taskId).get();
        if (taskDoc.exists) {
          const taskData = taskDoc.data();
          tasksWithVotes.push({
            id: taskDoc.id,
            taskId: downvotedTask.taskId,
            question: taskData?.question || '',
            section: taskData?.section || '',
            module: taskData?.module || '',
            created_at: taskData?.created_at || downvotedTask.created_at,
            downvoted_at: downvotedTask.downvoted_at,
            first_reason: downvotedTask.first_reason,
            first_message: downvotedTask.first_message,
            vote_count: downvotedTask.vote_count,
            last_vote_at: downvotedTask.last_vote_at
          });
        } else {
          // Task doesn't exist anymore, but still show it with basic info
          tasksWithVotes.push({
            id: downvotedTask.taskId,
            taskId: downvotedTask.taskId,
            question: 'Task not found',
            section: '',
            module: '',
            created_at: downvotedTask.created_at,
            downvoted_at: downvotedTask.downvoted_at,
            first_reason: downvotedTask.first_reason,
            first_message: downvotedTask.first_message,
            vote_count: downvotedTask.vote_count,
            last_vote_at: downvotedTask.last_vote_at
          });
        }
      } catch (error) {
        console.error(`Error fetching task ${downvotedTask.taskId}:`, error);
      }
    }

    console.log("Admin votes: Fetched task data for", tasksWithVotes.length, "tasks");

    // Sort by vote count (highest first)
    tasksWithVotes.sort((a, b) => b.vote_count - a.vote_count);

    const response = {
      tasks: tasksWithVotes,
      total: tasksWithVotes.length,
      totalVotes: tasksWithVotes.reduce((sum, task) => sum + task.vote_count, 0)
    };
    
    console.log("Admin votes: Returning response:", response);
    
    return NextResponse.json(response);

  } catch (error) {
    console.error("Admin votes error:", error);
    return NextResponse.json({ 
      error: "Failed to fetch tasks with votes",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 