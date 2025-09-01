import { getCurrentUserFromSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import CourseIntegrationTest from "./CourseIntegrationTest";

export default async function TestCourseIntegrationPage() {
  const user = await getCurrentUserFromSession();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Course Integration Test</h1>
          <p className="mt-2 text-gray-600">Testing the integration between courses, subjects, and tasks2</p>
        </div>
        
        <CourseIntegrationTest />
      </div>
    </div>
  );
} 