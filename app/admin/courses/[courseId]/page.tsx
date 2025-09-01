import { adminDb } from "@/lib/firebase/admin";
import { notFound } from "next/navigation";
import CourseForm from "../CourseForm";
import { Course } from "@/lib/course-data";

interface EditCoursePageProps {
  params: { courseId: string };
}

export default async function EditCoursePage({ params }: EditCoursePageProps) {
  // Fetch course data from Firebase
  const courseDoc = await adminDb.collection('courses').doc(params.courseId).get();
  
  if (!courseDoc.exists) {
    notFound();
  }

  const courseData = courseDoc.data();
  const course: Course = {
    id: courseDoc.id,
    name: courseData?.name || '',
    description: courseData?.description || '',
    status: courseData?.status || 'draft',
    learning_objectives: courseData?.learning_objectives || [],
    subjects: courseData?.subjects || [],
    created_at: courseData?.created_at?.toDate?.() || courseData?.created_at || new Date(),
    updated_at: courseData?.updated_at?.toDate?.() || courseData?.updated_at || new Date()
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Course</h1>
        <p className="text-gray-600 mt-1">Modify course information, subjects, and learning objectives</p>
      </div>

      {/* Course Form */}
      <CourseForm initialCourse={course} mode="edit" />
    </div>
  );
} 