import { adminDb } from "@/lib/firebase/admin";
import Link from "next/link";
import CourseListClient from "./CourseListClient";
import { Course } from "@/lib/course-data";

export default async function CoursesPage() {
  // Get all courses from Firebase
  const coursesSnapshot = await adminDb.collection('courses').orderBy('created_at', 'desc').get();
  
  const courses = coursesSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name || '',
      description: data.description || '',
      status: data.status || 'draft',
      subjects_count: data.subjects?.length || 0,
      learning_objectives_count: data.learning_objectives?.length || 0,
      // Convert Firestore timestamps to ISO strings
      created_at: data.created_at?.toDate?.()?.toISOString() || data.created_at || new Date().toISOString(),
      updated_at: data.updated_at?.toDate?.()?.toISOString() || data.updated_at || new Date().toISOString()
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
          <p className="text-gray-600 mt-1">Manage courses and their subjects</p>
        </div>
        <Link
          href="/admin/courses/create"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create Course
        </Link>
      </div>

      {/* Course List */}
      <CourseListClient initialCourses={courses} />
    </div>
  );
} 