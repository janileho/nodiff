"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Course, Subject, LearningObjective } from "@/lib/course-data";
import { TaskV2 } from "@/lib/task-data-v2";

interface TaskCreationFormProps {
  courses: Course[];
}

interface TaskGenerationRequest {
  course_id: string;
  subject_id?: string;
  learning_objective_ids: string[];
  difficulty: 'helppo' | 'keskitaso' | 'haastava';
  task_type: 'verbal' | 'nonverbal';
  count: number;
  example_task?: string;
  custom_prompt?: string;
}

export default function TaskCreationForm({ courses }: TaskCreationFormProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<TaskGenerationRequest>({
    course_id: '',
    subject_id: '',
    learning_objective_ids: [],
    difficulty: 'keskitaso',
    task_type: 'verbal',
    count: 1,
    example_task: '',
    custom_prompt: ''
  });

  // Derived state
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);

  // Update selected course when course_id changes
  useEffect(() => {
    const course = courses.find(c => c.id === formData.course_id);
    setSelectedCourse(course || null);
    setSelectedSubject(null);
    setFormData(prev => ({ ...prev, subject_id: '', learning_objective_ids: [] }));
  }, [formData.course_id, courses]);

  // Update selected subject when subject_id changes
  useEffect(() => {
    if (selectedCourse) {
      const subject = selectedCourse.subjects.find(s => s.id === formData.subject_id);
      setSelectedSubject(subject || null);
    }
  }, [formData.subject_id, selectedCourse]);

  // Handle form field changes
  const handleFieldChange = (field: keyof TaskGenerationRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle learning objective selection
  const handleLearningObjectiveChange = (objectiveId: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      learning_objective_ids: checked 
        ? [...(prev.learning_objective_ids || []), objectiveId]
        : (prev.learning_objective_ids || []).filter(id => id !== objectiveId)
    }));
  };

  // Generate tasks using AI
  const handleGenerateTasks = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate required fields
      if (!formData.course_id) {
        throw new Error("Course selection is required");
      }

      if (formData.count < 1 || formData.count > 10) {
        throw new Error("Task count must be between 1 and 10");
      }

      console.log("Generating tasks with data:", formData);

      const response = await fetch('/api/admin/tasks2/generate', {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate tasks");
      }

      const result = await response.json();
      
      setSuccess(`Successfully generated ${result.total_generated} tasks!`);
      
      // Redirect to tasks list after a short delay
      setTimeout(() => {
        router.push('/admin/tasks2');
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <form onSubmit={handleGenerateTasks} className="space-y-8">
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
              Subject (Optional)
            </label>
            <select
              value={formData.subject_id}
              onChange={(e) => handleFieldChange("subject_id", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!selectedCourse}
            >
              <option value="">All subjects</option>
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

        {/* Learning Objectives */}
        {selectedCourse && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Learning Objectives (Optional)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedCourse.learning_objectives.map(objective => (
                <label key={objective.id} className="flex items-start">
                  <input
                    type="checkbox"
                    checked={(formData.learning_objective_ids || []).includes(objective.id)}
                    onChange={(e) => handleLearningObjectiveChange(objective.id, e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="ml-3 text-sm">
                    <div className="font-medium text-gray-900">{objective.title}</div>
                    <div className="text-gray-500">{objective.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Task Configuration */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Task Configuration</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Type
            </label>
            <select
              value={formData.task_type}
              onChange={(e) => handleFieldChange("task_type", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="verbal">Sanallinen</option>
              <option value="nonverbal">Nonverbal</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Difficulty Level
            </label>
            <select
              value={formData.difficulty}
              onChange={(e) => handleFieldChange("difficulty", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="helppo">Helppo</option>
              <option value="keskitaso">Keskitaso</option>
              <option value="haastava">Haastava</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Tasks
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={formData.count}
              onChange={(e) => handleFieldChange("count", parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Example Task */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Example Task (Optional)</h2>
        <p className="text-sm text-gray-600 mb-4">
          Provide an example task to generate similar tasks. The AI will use this as a reference for style and format.
        </p>
        
        <textarea
          value={formData.example_task}
          onChange={(e) => handleFieldChange("example_task", e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter an example task here... For example: 'Ratkaise yhtälö sin(x) = 0.5 välillä [0, 2π]'"
        />
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
          disabled={isGenerating || !formData.course_id}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? "Generating..." : "Generate Tasks"}
        </button>
      </div>
    </form>
  );
} 