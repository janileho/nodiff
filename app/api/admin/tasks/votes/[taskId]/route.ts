import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromSession } from "@/lib/auth";
import { adminDb } from "@/lib/firebase/admin";

interface TaskVote {
  id: string;
  taskId: string;
  voteType: 'downvote';
  reason: string;
  message: string;
  timestamp: any;
  createdAt: any;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    console.log("Task votes: Starting request for taskId:", params.taskId);
    
    const user = await getCurrentUserFromSession();
    if (!user) {
      console.log("Task votes: Unauthorized user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    console.log("Task votes: User authenticated:", user.email);

    // Get all votes for this specific task
    console.log("Task votes: Fetching votes for task:", params.taskId);
    const votesSnapshot = await adminDb.collection('task_votes')
      .where('taskId', '==', params.taskId)
      .orderBy('timestamp', 'desc')
      .get();

    console.log("Task votes: Found", votesSnapshot.docs.length, "votes");

    const votes = votesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TaskVote[];

    const response = {
      taskId: params.taskId,
      votes: votes,
      total: votes.length,
      reasons: votes.reduce((acc, vote) => {
        acc[vote.reason] = (acc[vote.reason] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number })
    };
    
    console.log("Task votes: Returning response:", response);
    
    return NextResponse.json(response);

  } catch (error) {
    console.error("Task votes error:", error);
    return NextResponse.json({ 
      error: "Failed to fetch task votes",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 