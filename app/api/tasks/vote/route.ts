import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

interface VoteData {
  taskId: string;
  voteType: 'downvote';
  reason: string;
  message: string;
  timestamp: Date;
}

export async function POST(request: NextRequest) {
  try {
    const voteData: VoteData = await request.json();
    
    console.log('Received vote:', voteData);

    // Validate the vote data
    if (!voteData.taskId || !voteData.reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Store the vote in Firestore
    const voteRef = await adminDb.collection('task_votes').add({
      taskId: voteData.taskId,
      voteType: voteData.voteType,
      reason: voteData.reason,
      message: voteData.message || '',
      timestamp: new Date(voteData.timestamp),
      createdAt: new Date()
    });

    // Add task to downvoted_tasks collection if not already there
    const downvotedTaskRef = adminDb.collection('downvoted_tasks').doc(voteData.taskId);
    const downvotedTaskDoc = await downvotedTaskRef.get();

    if (!downvotedTaskDoc.exists) {
      // Get the task data to store basic info
      const taskRef = adminDb.collection('tasks').doc(voteData.taskId);
      const taskDoc = await taskRef.get();
      
      if (taskDoc.exists) {
        const taskData = taskDoc.data();
        await downvotedTaskRef.set({
          taskId: voteData.taskId,
          question: taskData?.question || '',
          section: taskData?.section || '',
          module: taskData?.module || '',
          created_at: taskData?.created_at || new Date(),
          downvoted_at: new Date(),
          first_reason: voteData.reason,
          first_message: voteData.message || '',
          vote_count: 1
        });
      } else {
        // Task doesn't exist, but still record it as downvoted
        await downvotedTaskRef.set({
          taskId: voteData.taskId,
          question: 'Task not found',
          section: '',
          module: '',
          created_at: new Date(),
          downvoted_at: new Date(),
          first_reason: voteData.reason,
          first_message: voteData.message || '',
          vote_count: 1
        });
      }
    } else {
      // Task already in downvoted collection, increment vote count
      const currentData = downvotedTaskDoc.data();
      await downvotedTaskRef.update({
        vote_count: (currentData?.vote_count || 0) + 1,
        last_vote_at: new Date()
      });
    }

    console.log(`Vote recorded for task ${voteData.taskId}: ${voteData.reason}`);

    return NextResponse.json({ 
      success: true, 
      message: "Vote recorded successfully",
      voteId: voteRef.id 
    });

  } catch (error) {
    console.error('Error recording vote:', error);
    return NextResponse.json({ 
      error: "Failed to record vote",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json({ error: "Task ID required" }, { status: 400 });
    }

    // Get vote statistics for the task
    const taskDoc = await adminDb.collection('tasks').doc(taskId).get();
    
    if (!taskDoc.exists) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const taskData = taskDoc.data();
    const votes = taskData?.votes || {};

    return NextResponse.json({
      taskId,
      votes: {
        downvotes: votes.downvotes || 0,
        reasons: votes.reasons || {},
        lastVoteAt: votes.lastVoteAt
      }
    });

  } catch (error) {
    console.error('Error fetching vote statistics:', error);
    return NextResponse.json({ 
      error: "Failed to fetch vote statistics",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 