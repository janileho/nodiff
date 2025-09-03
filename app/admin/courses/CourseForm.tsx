"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Course, Subject, LearningObjective } from "@/lib/course-data";
import InlineMath from "@matejmazur/react-katex";

interface CourseFormProps {
  initialCourse?: Course;
  mode?: "create" | "edit";
}

export default function CourseForm({ initialCourse, mode = "create" }: CourseFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Course>>({
    id: initialCourse?.id || "",
    name: initialCourse?.name || "",
    description: initialCourse?.description || "",
    status: initialCourse?.status || "draft",
    learning_objectives: initialCourse?.learning_objectives || [],
    subjects: initialCourse?.subjects || []
  });

  // Handle form field changes
  const handleFieldChange = (field: keyof Course, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle learning objective changes
  const handleLearningObjectiveChange = (index: number, field: keyof LearningObjective, value: string) => {
    const updatedObjectives = [...(formData.learning_objectives || [])];
    updatedObjectives[index] = {
      ...updatedObjectives[index],
      [field]: value
    };
    handleFieldChange("learning_objectives", updatedObjectives);
  };

  // Add new learning objective
  const addLearningObjective = () => {
    const newObjective: LearningObjective = {
      id: `obj_${Date.now()}`,
      title: "",
      description: ""
    };
    handleFieldChange("learning_objectives", [...(formData.learning_objectives || []), newObjective]);
  };

  // Remove learning objective
  const removeLearningObjective = (index: number) => {
    const updatedObjectives = formData.learning_objectives?.filter((_, i) => i !== index) || [];
    handleFieldChange("learning_objectives", updatedObjectives);
  };

  // Handle subject changes
  const handleSubjectChange = (index: number, field: keyof Subject, value: any) => {
    const updatedSubjects = [...(formData.subjects || [])];
    updatedSubjects[index] = {
      ...updatedSubjects[index],
      [field]: value
    };
    handleFieldChange("subjects", updatedSubjects);
  };

  // Handle subject learning objective changes
  const handleSubjectLearningObjectiveChange = (subjectIndex: number, objIndex: number, field: keyof LearningObjective, value: string) => {
    const updatedSubjects = [...(formData.subjects || [])];
    const subject = updatedSubjects[subjectIndex];
    const updatedObjectives = [...(subject.learning_objectives || [])];
    updatedObjectives[objIndex] = {
      ...updatedObjectives[objIndex],
      [field]: value
    };
    updatedSubjects[subjectIndex] = {
      ...subject,
      learning_objectives: updatedObjectives
    };
    handleFieldChange("subjects", updatedSubjects);
  };

  // Add new subject
  const addSubject = () => {
    const newSubject: Subject = {
      id: `subject_${Date.now()}`,
      name: "",
      description: "",
      learning_objectives: []
    };
    handleFieldChange("subjects", [...(formData.subjects || []), newSubject]);
  };

  // Remove subject
  const removeSubject = (index: number) => {
    const updatedSubjects = formData.subjects?.filter((_, i) => i !== index) || [];
    handleFieldChange("subjects", updatedSubjects);
  };

  // Add learning objective to subject
  const addSubjectLearningObjective = (subjectIndex: number) => {
    const updatedSubjects = [...(formData.subjects || [])];
    const subject = updatedSubjects[subjectIndex];
    const newObjective: LearningObjective = {
      id: `sub_obj_${Date.now()}`,
      title: "",
      description: ""
    };
    updatedSubjects[subjectIndex] = {
      ...subject,
      learning_objectives: [...(subject.learning_objectives || []), newObjective]
    };
    handleFieldChange("subjects", updatedSubjects);
  };

  // Remove learning objective from subject
  const removeSubjectLearningObjective = (subjectIndex: number, objIndex: number) => {
    const updatedSubjects = [...(formData.subjects || [])];
    const subject = updatedSubjects[subjectIndex];
    const updatedObjectives = subject.learning_objectives?.filter((_, i) => i !== objIndex) || [];
    updatedSubjects[subjectIndex] = {
      ...subject,
      learning_objectives: updatedObjectives
    };
    handleFieldChange("subjects", updatedSubjects);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.id || !formData.name || !formData.description) {
        throw new Error("Course ID, name, and description are required");
      }

      // Validate subjects have IDs and names
      const invalidSubjects = formData.subjects?.some(subject => !subject.id || !subject.name);
      if (invalidSubjects) {
        throw new Error("All subjects must have an ID and name");
      }

      const url = mode === "edit" 
        ? `/api/admin/courses/${formData.id}`
        : "/api/admin/courses";
      
      const method = mode === "edit" ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save course");
      }

      const result = await response.json();
      
      // Redirect to courses list
      router.push("/admin/courses");
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
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

      {/* Basic Course Information */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Basic Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Course ID *
            </label>
            <input
              type="text"
              value={formData.id || ""}
              onChange={(e) => handleFieldChange("id", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., MAA5"
              required
            />
            <p className="mt-1 text-sm text-gray-500">Unique identifier for the course</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={formData.status || "draft"}
              onChange={(e) => handleFieldChange("status", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Course Name *
            </label>
            <input
              type="text"
              value={formData.name || ""}
              onChange={(e) => handleFieldChange("name", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Matematiikka A5"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              value={formData.description || ""}
              onChange={(e) => handleFieldChange("description", e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe the course content and objectives..."
              required
            />
          </div>
        </div>
      </div>

      {/* Learning Objectives */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium text-gray-900">Course Learning Objectives</h2>
          <button
            type="button"
            onClick={addLearningObjective}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Objective
          </button>
        </div>

        <div className="space-y-4">
          {formData.learning_objectives?.map((objective, index) => (
            <div key={objective.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-medium text-gray-900">Objective {index + 1}</h3>
                <button
                  type="button"
                  onClick={() => removeLearningObjective(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={objective.title}
                    onChange={(e) => handleLearningObjectiveChange(index, "title", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Learning objective title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={objective.description}
                    onChange={(e) => handleLearningObjectiveChange(index, "description", e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe what students will learn..."
                  />
                </div>
              </div>
            </div>
          ))}
          
          {(!formData.learning_objectives || formData.learning_objectives.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2">No learning objectives added yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Subjects */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium text-gray-900">Subjects</h2>
          <button
            type="button"
            onClick={addSubject}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Subject
          </button>
        </div>

        <div className="space-y-6">
          {formData.subjects?.map((subject, subjectIndex) => (
            <div key={subject.id} className="border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-medium text-gray-900">Subject {subjectIndex + 1}</h3>
                <button
                  type="button"
                  onClick={() => removeSubject(subjectIndex)}
                  className="text-red-600 hover:text-red-800"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject ID</label>
                  <input
                    type="text"
                    value={subject.id}
                    onChange={(e) => handleSubjectChange(subjectIndex, "id", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., maa5_trigonometry"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name</label>
                  <input
                    type="text"
                    value={subject.name}
                    onChange={(e) => handleSubjectChange(subjectIndex, "name", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Trigonometry"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={subject.description}
                    onChange={(e) => handleSubjectChange(subjectIndex, "description", e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe the subject content..."
                  />
                </div>
              </div>

              {/* Subject Learning Objectives */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-medium text-gray-900">Subject Learning Objectives</h4>
                  <button
                    type="button"
                    onClick={() => addSubjectLearningObjective(subjectIndex)}
                    className="inline-flex items-center px-2 py-1 border border-transparent text-xs leading-4 font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Objective
                  </button>
                </div>

                <div className="space-y-3">
                  {subject.learning_objectives?.map((objective, objIndex) => (
                    <div key={objective.id} className="border border-gray-200 rounded p-3">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-medium text-gray-700">Objective {objIndex + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeSubjectLearningObjective(subjectIndex, objIndex)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2">
                        <input
                          type="text"
                          value={objective.title}
                          onChange={(e) => handleSubjectLearningObjectiveChange(subjectIndex, objIndex, "title", e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Objective title"
                        />
                        <textarea
                          value={objective.description}
                          onChange={(e) => handleSubjectLearningObjectiveChange(subjectIndex, objIndex, "description", e.target.value)}
                          rows={1}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Objective description"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subject formulas & theory */}
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Formulas & Theory (per subject)</h4>
                <div className="space-y-3">
                  {(subject.formulas_with_explanations || []).map((fxe, fxIndex) => (
                    <div key={fxIndex} className="border border-gray-200 rounded p-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">LaTeX Formula</label>
                          <input
                            type="text"
                            value={fxe.formula}
                            onChange={(e) => {
                              const updatedSubjects = [...(formData.subjects || [])];
                              const s = updatedSubjects[subjectIndex];
                              const list = [...(s.formulas_with_explanations || [])];
                              list[fxIndex] = { ...list[fxIndex], formula: e.target.value };
                              updatedSubjects[subjectIndex] = { ...s, formulas_with_explanations: list } as Subject;
                              handleFieldChange("subjects", updatedSubjects);
                            }}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="e.g., \\sin^2(x)+\\cos^2(x)=1"
                          />
                          <div className="mt-1 text-xs text-gray-600">
                            Preview: <InlineMath math={fxe.formula || ''} />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Explanation</label>
                          <input
                            type="text"
                            value={fxe.explanation}
                            onChange={(e) => {
                              const updatedSubjects = [...(formData.subjects || [])];
                              const s = updatedSubjects[subjectIndex];
                              const list = [...(s.formulas_with_explanations || [])];
                              list[fxIndex] = { ...list[fxIndex], explanation: e.target.value };
                              updatedSubjects[subjectIndex] = { ...s, formulas_with_explanations: list } as Subject;
                              handleFieldChange("subjects", updatedSubjects);
                            }}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Short explanation for the formula"
                          />
                        </div>
                      </div>
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            const updatedSubjects = [...(formData.subjects || [])];
                            const s = updatedSubjects[subjectIndex];
                            const list = [...(s.formulas_with_explanations || [])];
                            list.splice(fxIndex, 1);
                            updatedSubjects[subjectIndex] = { ...s, formulas_with_explanations: list } as Subject;
                            handleFieldChange("subjects", updatedSubjects);
                          }}
                          className="text-red-600 hover:text-red-800 text-xs"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      const updatedSubjects = [...(formData.subjects || [])];
                      const s = updatedSubjects[subjectIndex];
                      const list = [...(s.formulas_with_explanations || [])];
                      list.push({ formula: "", explanation: "" });
                      updatedSubjects[subjectIndex] = { ...s, formulas_with_explanations: list } as Subject;
                      handleFieldChange("subjects", updatedSubjects);
                    }}
                    className="inline-flex items-center px-2 py-1 border border-transparent text-xs leading-4 font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200"
                  >
                    Add Formula
                  </button>
                </div>
              </div>
              {/* End formulas */}
            </div>
          ))}
          
          {(!formData.subjects || formData.subjects.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="mt-2">No subjects added yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => router.push("/admin/courses")}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Saving..." : mode === "edit" ? "Update Course" : "Create Course"}
        </button>
      </div>
    </form>
  );
} 