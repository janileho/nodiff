import { getCurrentUserFromSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import SolveWorkspace from "@/components/SolveWorkspace";
import TaskNavClient from "./TaskNavClient";
import type { TaskData } from "@/lib/task-data";

interface TaskPageProps {
  params: {
    taskId: string;
  };
}

export default async function TaskPage({ params }: TaskPageProps) {
  const user = await getCurrentUserFromSession();
  if (!user) redirect("/login");

  console.log("TaskPage: Looking for taskId:", params.taskId);

  // Try to get task from tasks2 first, then fall back to original tasks
  try {
    // First, try to get from tasks2 collection using task_id as document ID
    let taskDoc = await adminDb.collection("tasks2").doc(params.taskId).get();
    let collectionName = "tasks2";
    
    // If not found in tasks2, try original tasks collection
    if (!taskDoc.exists) {
      console.log("TaskPage: Task not found in tasks2, trying tasks collection");
      taskDoc = await adminDb.collection("tasks").doc(params.taskId).get();
      collectionName = "tasks";
    }
    
    if (!taskDoc.exists) {
      console.log("TaskPage: Task not found in either collection, redirecting");
      redirect("/app"); // Redirect if task not found in either collection
    }
    
    const data = taskDoc.data();
    console.log("TaskPage: Task found in", collectionName, "with data:", data);
    
    if (!data) {
      console.log("TaskPage: Task data is null, redirecting");
      redirect("/app");
    }
    
    // Convert Firestore timestamps to plain objects and ensure task_id exists
    const task: TaskData = {
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
      created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at,
      updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at
    };
    
    if (!task.task_id) {
      console.log("TaskPage: task_id is missing from task data, redirecting");
      redirect("/app"); // Redirect if task_id is missing
    }

    console.log(`TaskPage: Task found in ${collectionName}:`, task.task_id);

    return (
      <div className="h-full bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-100 overflow-hidden flex flex-col">
        {/* Navigation below top bar */}
        <div className="flex-shrink-0 mt-12">
          <TaskNavClient taskId={task.task_id} />
        </div>
        {/* Main workspace */}
        <div className="flex-1 min-h-0">
          <SolveWorkspace taskId={task.task_id} />
        </div>
      </div>
    );
  } catch (error) {
    console.error('TaskPage: Error fetching task:', error);
    redirect("/app"); // Redirect on error
  }
} 