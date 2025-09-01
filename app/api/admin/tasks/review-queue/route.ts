import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromSession } from "@/lib/auth";
import { adminDb } from "@/lib/firebase/admin";

interface TaskWithReview {
  id: string;
  task_id?: string;
  question?: string;
  quality_metrics?: {
    overallQuality: number;
    needsHumanReview: boolean;
    reviewPriority: 'low' | 'medium' | 'high' | 'critical';
    reviewReason: string;
    issues: string[];
  };
  created_at?: any;
}

export async function GET(request: NextRequest) {
  try {
    console.log("Review queue: Starting request");
    
    const user = await getCurrentUserFromSession();
    if (!user) {
      console.log("Review queue: Unauthorized user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    console.log("Review queue: User authenticated:", user.email);

    // Get all tasks with quality metrics
    console.log("Review queue: Fetching tasks from database");
    let tasksSnapshot;
    try {
      tasksSnapshot = await adminDb.collection('tasks')
        .orderBy('created_at', 'desc')
        .limit(100)
        .get();
    } catch (orderError) {
      console.log("Review queue: Ordering by created_at failed, trying without order:", orderError);
      tasksSnapshot = await adminDb.collection('tasks')
        .limit(100)
        .get();
    }

    console.log("Review queue: Fetched", tasksSnapshot.docs.length, "tasks");

    const allTasks = tasksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TaskWithReview[];

    // Filter tasks that need human review
    const reviewTasks = allTasks.filter(task => 
      task.quality_metrics?.needsHumanReview === true
    );

    console.log("Review queue: Found", reviewTasks.length, "tasks needing review");

    // Sort by priority (critical -> high -> medium -> low)
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    reviewTasks.sort((a, b) => {
      const aPriority = a.quality_metrics?.reviewPriority || 'low';
      const bPriority = b.quality_metrics?.reviewPriority || 'low';
      return priorityOrder[bPriority] - priorityOrder[aPriority];
    });

    const response = {
      tasks: reviewTasks,
      total: reviewTasks.length,
      byPriority: {
        critical: reviewTasks.filter(t => t.quality_metrics?.reviewPriority === 'critical').length,
        high: reviewTasks.filter(t => t.quality_metrics?.reviewPriority === 'high').length,
        medium: reviewTasks.filter(t => t.quality_metrics?.reviewPriority === 'medium').length,
        low: reviewTasks.filter(t => t.quality_metrics?.reviewPriority === 'low').length
      }
    };
    
    console.log("Review queue: Returning response:", response);
    
    return NextResponse.json(response);

  } catch (error) {
    console.error("Review queue error:", error);
    return NextResponse.json({ 
      error: "Failed to fetch review queue",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 