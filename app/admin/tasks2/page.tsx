import { adminDb } from "@/lib/firebase/admin";
import Link from "next/link";
import TaskListClientV2 from "./TaskListClientV2";
import { TaskV2 } from "@/lib/task-data-v2";

export default async function Tasks2Page() {
  // Get all tasks2 from Firebase
  const tasksSnapshot = await adminDb.collection('tasks2').orderBy('created_at', 'desc').limit(50).get();
  
  const tasks = tasksSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      task_id: data.task_id || '',
      module: data.module || '',
      section: data.section || '',
      question: data.question || '',
      solution_steps: data.solution_steps || [],
      final_answer: data.final_answer || '',
      difficulty: data.difficulty || 'helppo',
      task_type: data.task_type || 'verbal',
      category: data.category || '',
      exam_year: data.exam_year,
      exam_session: data.exam_session,
      time_limit: data.time_limit,
      hints: data.hints || [],
      common_mistakes: data.common_mistakes || [],
      status: data.status || 'draft',
      course_id: data.course_id || '',
      subject_id: data.subject_id || '',
      created_at: data.created_at?.toDate?.() || data.created_at || new Date(),
      updated_at: data.updated_at?.toDate?.() || data.updated_at || new Date(),
      created_by: data.created_by || '',
      ai_generated: data.ai_generated || false
    } as TaskV2;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks V2</h1>
          <p className="text-gray-600 mt-1">Manage the new course-aware task system</p>
        </div>
        <div className="flex space-x-4">
          <Link
            href="/admin/tasks2/create"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Task
          </Link>
          <Link
            href="/admin/tasks2/generate"
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            AI Generate
          </Link>
        </div>
      </div>

      {/* Task List */}
      <TaskListClientV2 initialTasks={tasks} />
    </div>
  );
} 