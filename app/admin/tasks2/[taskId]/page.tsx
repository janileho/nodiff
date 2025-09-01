import { adminDb } from "@/lib/firebase/admin";
import { notFound } from "next/navigation";
import TaskEditForm from "../TaskEditForm";
import { TaskV2 } from "@/lib/task-data-v2";
import { Course } from "@/lib/course-data";

interface EditTask2PageProps {
  params: { taskId: string };
}

export default async function EditTask2Page({ params }: EditTask2PageProps) {
  console.log("EditTask2Page: taskId from params:", params.taskId);
  
  try {
    // First, let's check if there are any tasks in the database
    const allTasksSnapshot = await adminDb.collection('tasks2').limit(5).get();
    console.log("EditTask2Page: Total tasks in database:", allTasksSnapshot.size);
    
    if (allTasksSnapshot.size > 0) {
      console.log("EditTask2Page: Sample task IDs:", allTasksSnapshot.docs.map(doc => doc.id));
      console.log("EditTask2Page: Sample task_ids:", allTasksSnapshot.docs.map(doc => doc.data().task_id));
    }
    
    // Fetch task data from Firebase
    const taskDoc = await adminDb.collection('tasks2').doc(params.taskId).get();
    
    console.log("EditTask2Page: taskDoc.exists:", taskDoc.exists);
    console.log("EditTask2Page: taskDoc.id:", taskDoc.id);
    
    if (!taskDoc.exists) {
      console.log("EditTask2Page: Task not found, redirecting to notFound");
      notFound();
    }

    const taskData = taskDoc.data();
    const task: TaskV2 = {
      task_id: taskData?.task_id || '',
      module: taskData?.module || '',
      section: taskData?.section || '',
      question: taskData?.question || '',
      solution_steps: taskData?.solution_steps || [],
      final_answer: taskData?.final_answer || '',
      difficulty: taskData?.difficulty || 'helppo',
      task_type: taskData?.task_type || 'verbal',
      category: taskData?.category || '',
      exam_year: taskData?.exam_year,
      exam_session: taskData?.exam_session,
      time_limit: taskData?.time_limit,
      hints: taskData?.hints || [],
      common_mistakes: taskData?.common_mistakes || [],
      status: taskData?.status || 'draft',
      course_id: taskData?.course_id || '',
      subject_id: taskData?.subject_id || '',
      created_at: taskData?.created_at?.toDate?.() || taskData?.created_at || new Date(),
      updated_at: taskData?.updated_at?.toDate?.() || taskData?.updated_at || new Date(),
      created_by: taskData?.created_by || '',
      ai_generated: taskData?.ai_generated || false
    };

    // Fetch all courses for the form
    const coursesSnapshot = await adminDb.collection('courses').orderBy('created_at', 'desc').get();
    
    const courses = coursesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || '',
        description: data.description || '',
        subjects: data.subjects || [],
        learning_objectives: data.learning_objectives || []
      };
    }) as Course[];

    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Task</h1>
          <p className="text-gray-600 mt-1">Modify task content and metadata</p>
        </div>

        {/* Task Edit Form */}
        <TaskEditForm task={task} courses={courses} />
      </div>
    );
  } catch (error) {
    console.error("EditTask2Page: Error fetching task:", error);
    notFound();
  }
} 