import CourseForm from "../CourseForm";

export default function CreateCoursePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create New Course</h1>
        <p className="text-gray-600 mt-1">Add a new course with subjects and learning objectives</p>
      </div>

      {/* Course Form */}
      <CourseForm />
    </div>
  );
} 