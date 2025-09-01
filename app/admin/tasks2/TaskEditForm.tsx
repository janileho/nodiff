"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Course, Subject, LearningObjective } from "@/lib/course-data";
import { TaskV2 } from "@/lib/task-data-v2";

interface TaskEditFormProps {
  task: TaskV2;
  courses: Course[];
}

export default function TaskEditForm({ task, courses }: TaskEditFormProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<TaskV2>({
    task_id: task.task_id,
    module: task.module,
    section: task.section,
    question: task.question,
    solution_steps: task.solution_steps,
    final_answer: task.final_answer,
    difficulty: task.difficulty,
    task_type: task.task_type,
    category: task.category,
    exam_year: task.exam_year,
    exam_session: task.exam_session,
    time_limit: task.time_limit,
    hints: task.hints || [],
    common_mistakes: task.common_mistakes || [],
    status: task.status,
    course_id: task.course_id,
    subject_id: task.subject_id,
    created_at: task.created_at,
    created_by: task.created_by,
    ai_generated: task.ai_generated
  });

  // Derived state
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  // Update selected course when course_id changes
  useEffect(() => {
    const course = courses.find(c => c.id === formData.course_id);
    setSelectedCourse(course || null);
  }, [formData.course_id, courses]);

  // Update selected subject when subject_id changes
  useEffect(() => {
    if (selectedCourse) {
      const subject = selectedCourse.subjects.find(s => s.id === formData.subject_id);
      setSelectedSubject(subject || null);
    }
  }, [formData.subject_id, selectedCourse]);

  // Handle form field changes
  const handleFieldChange = (field: keyof TaskV2, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Save task
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/tasks2/${task.task_id}`, {
        method: 'PUT',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update task");
      }

      setSuccess("Task updated successfully!");
      
      // Redirect to tasks list after a short delay
      setTimeout(() => {
        router.push('/admin/tasks2');
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Success</h3>
              <div className="mt-2 text-sm text-green-700">{success}</div>
            </div>
          </div>
        </div>
      )}

      {/* Task ID */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Task Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task ID
            </label>
            <input
              type="text"
              value={formData.task_id}
              onChange={(e) => handleFieldChange("task_id", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleFieldChange("status", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Course Selection */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Course Selection</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Course *
            </label>
            <select
              value={formData.course_id}
              onChange={(e) => handleFieldChange("course_id", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select a course</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.name} ({course.id})
                </option>
              ))}
            </select>
            {selectedCourse && (
              <p className="mt-1 text-sm text-gray-500">{selectedCourse.description}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <select
              value={formData.subject_id}
              onChange={(e) => handleFieldChange("subject_id", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!selectedCourse}
            >
              <option value="">Select a subject</option>
              {selectedCourse?.subjects.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
            {selectedSubject && (
              <p className="mt-1 text-sm text-gray-500">{selectedSubject.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Task Content */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Task Content</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question *
            </label>
            <textarea
              value={formData.question}
              onChange={(e) => handleFieldChange("question", e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Solution Steps *
            </label>
            <textarea
              value={Array.isArray(formData.solution_steps) ? formData.solution_steps.join('\n') : formData.solution_steps}
              onChange={(e) => handleFieldChange("solution_steps", e.target.value.split('\n').filter(step => step.trim()))}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter each solution step on a new line..."
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Enter each solution step on a separate line
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Final Answer *
            </label>
            <textarea
              value={formData.final_answer}
              onChange={(e) => handleFieldChange("final_answer", e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>
      </div>

      {/* Task Settings */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Task Settings</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Difficulty Level
            </label>
            <select
              value={formData.difficulty}
              onChange={(e) => handleFieldChange("difficulty", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI Generated
            </label>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.ai_generated}
                onChange={(e) => handleFieldChange("ai_generated", e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-700">
                This task was generated by AI
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Hints and Common Mistakes */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Additional Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hints
              </label>
              <textarea
                value={Array.isArray(formData.hints) ? formData.hints.join('\n') : ''}
                onChange={(e) => handleFieldChange("hints", e.target.value.split('\n').filter(hint => hint.trim()))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter each hint on a new line..."
              />
              <p className="mt-1 text-sm text-gray-500">
                Enter each hint on a separate line
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Common Mistakes
              </label>
              <textarea
                value={Array.isArray(formData.common_mistakes) ? formData.common_mistakes.join('\n') : ''}
                onChange={(e) => handleFieldChange("common_mistakes", e.target.value.split('\n').filter(mistake => mistake.trim()))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter each common mistake on a new line..."
              />
              <p className="mt-1 text-sm text-gray-500">
                Enter each common mistake on a separate line
              </p>
            </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => router.push("/admin/tasks2")}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
} 