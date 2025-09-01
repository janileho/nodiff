import { getCurrentUserFromSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import TaskForm from "../TaskForm";

interface TaskEditPageProps {
  params: {
    taskId: string;
  };
}

export default async function TaskEditPage({ params }: TaskEditPageProps) {
  const user = await getCurrentUserFromSession();
  if (!user) redirect("/login");

  // Get task data from Firebase
  try {
    const taskDoc = await adminDb.collection("tasks")
      .doc(params.taskId)
      .get();
    
    if (!taskDoc.exists) {
      redirect("/admin/tasks"); // Redirect if task not found
    }
    
    const data = taskDoc.data();
    const task = {
      id: taskDoc.id,
      task_id: data?.task_id || "",
      task_type: data?.task_type || "verbal",
      		module: data?.module || "MAA5",
      section: data?.section || "",
      question: data?.question || "",
      solution_steps: data?.solution_steps || [""],
      final_answer: data?.final_answer || "",
      points: data?.points || 2,
      difficulty: data?.difficulty || "keskitaso",
      status: data?.status || "draft",
      hints: data?.hints || [""],
      common_mistakes: data?.common_mistakes || [""],
      prerequisites: data?.prerequisites || [""],
      learning_objectives: data?.learning_objectives || [""],
      exam_year: data?.exam_year,
      exam_session: data?.exam_session || "",
      exam_type: data?.exam_type || "",
      // Convert Firestore timestamps to ISO strings
      created_at: data?.created_at?.toDate?.()?.toISOString() || data?.created_at,
      updated_at: data?.updated_at?.toDate?.()?.toISOString() || data?.updated_at
    };
    
    return (
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900">Edit Task</h1>
          <p className="text-gray-600 mt-2">Update task information</p>
        </div>
        
        <TaskForm task={task} isEditing={true} />
      </div>
    );
  } catch (error) {
    console.error('Error fetching task:', error);
    redirect("/admin/tasks"); // Redirect on error
  }
} 