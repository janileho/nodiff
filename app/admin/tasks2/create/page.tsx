import { adminDb } from "@/lib/firebase/admin";
import TaskCreationForm from "../TaskCreationForm";
import { Course } from "@/lib/course-data";

export default async function CreateTask2Page() {
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
        <h1 className="text-2xl font-bold text-gray-900">Create New Task</h1>
        <p className="text-gray-600 mt-1">Generate mathematical tasks using AI with course-aware context</p>
      </div>

      {/* Task Creation Form */}
      <TaskCreationForm courses={courses} />
    </div>
  );
} 