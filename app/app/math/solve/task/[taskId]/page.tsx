import { getCurrentUserFromSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import SolveWorkspace from "@/components/SolveWorkspace";
import type { TaskData } from "@/lib/task-data";

interface TaskPageProps {
  params: Promise<{
    taskId: string;
  }>;
}

export default async function TaskPage({ params }: TaskPageProps) {
  const { taskId } = await params;
  const user = await getCurrentUserFromSession();
  if (!user) redirect("/login");

  try {
    // user-specific tasks first (users/{uid}/tasks)
    let taskDoc = await adminDb
      .collection("users").doc(user.uid)
      .collection("tasks").doc(taskId)
      .get();

    if (!taskDoc.exists) {
      taskDoc = await adminDb.collection("tasks2").doc(taskId).get();
    }
    if (!taskDoc.exists) {
      taskDoc = await adminDb.collection("tasks").doc(taskId).get();
    }

    if (!taskDoc.exists) redirect("/app");

    const data: any = taskDoc.data();
    if (!data) redirect("/app");

    const task: TaskData = {
      task_id: data.task_id ?? taskId,
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
      updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at,
    };

    if (!task.task_id) redirect("/app");

    return (
      <div className="h-full bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-100 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0">
          <SolveWorkspace taskId={task.task_id} />
        </div>
      </div>
    );
  } catch {
    redirect("/app");
  }
} 