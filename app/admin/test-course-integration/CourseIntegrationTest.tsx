"use client";

import { useState, useEffect } from "react";
import { Course } from "@/lib/course-data";
import { TaskV2 } from "@/lib/task-data-v2";

export default function CourseIntegrationTest() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [tasks, setTasks] = useState<TaskV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");

  // Load courses and tasks
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load courses
        const coursesResponse = await fetch('/api/admin/courses');
        if (coursesResponse.ok) {
          const coursesData = await coursesResponse.json();
          setCourses(coursesData.courses || []);
        }

        // Load tasks
        const tasksResponse = await fetch('/api/admin/tasks2');
        if (tasksResponse.ok) {
          const tasksData = await tasksResponse.json();
          setTasks(tasksData.tasks || []);
        }
      } catch (error) {
        setError("Failed to load data");
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Get selected course
  const currentCourse = courses.find(c => c.id === selectedCourse);
  
  // Get selected subject
  const currentSubject = currentCourse?.subjects.find(s => s.id === selectedSubject);

  // Filter tasks by course and subject
  const filteredTasks = tasks.filter(task => {
    const matchesCourse = !selectedCourse || task.course_id === selectedCourse;
    const matchesSubject = !selectedSubject || task.subject_id === selectedSubject;
    return matchesCourse && matchesSubject;
  });

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Course Selection */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Course Selection</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
            <select
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(e.target.value);
                setSelectedSubject(""); // Reset subject when course changes
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a course</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.name} ({course.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!selectedCourse}
            >
              <option value="">All subjects</option>
              {currentCourse?.subjects.map(subject => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Course Info */}
        {currentCourse && (
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <h3 className="font-medium text-gray-900">{currentCourse.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{currentCourse.description}</p>
            <div className="mt-2 text-sm text-gray-600">
              <strong>Subjects:</strong> {currentCourse.subjects.length}
            </div>
          </div>
        )}

        {/* Subject Info */}
        {currentSubject && (
          <div className="mt-4 p-4 bg-blue-50 rounded-md">
            <h3 className="font-medium text-blue-900">{currentSubject.name}</h3>
            <p className="text-sm text-blue-700 mt-1">{currentSubject.description}</p>
            <div className="mt-2 text-sm text-blue-600">
              <strong>Learning Objectives:</strong> {currentSubject.learning_objectives.length}
            </div>
          </div>
        )}
      </div>

      {/* Tasks Overview */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Tasks Overview</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-md">
            <div className="text-2xl font-bold text-blue-600">{tasks.length}</div>
            <div className="text-sm text-blue-600">Total Tasks</div>
          </div>
          <div className="bg-green-50 p-4 rounded-md">
            <div className="text-2xl font-bold text-green-600">
              {tasks.filter(t => t.status === 'published').length}
            </div>
            <div className="text-sm text-green-600">Published</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-md">
            <div className="text-2xl font-bold text-yellow-600">
              {tasks.filter(t => t.status === 'draft').length}
            </div>
            <div className="text-sm text-yellow-600">Draft</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-md">
            <div className="text-2xl font-bold text-purple-600">
              {tasks.filter(t => t.ai_generated).length}
            </div>
            <div className="text-sm text-purple-600">AI Generated</div>
          </div>
        </div>

        {/* Filtered Tasks */}
        <div>
          <h3 className="text-md font-medium text-gray-900 mb-3">
            Tasks {selectedCourse && `for ${currentCourse?.name}`} {selectedSubject && `- ${currentSubject?.name}`} ({filteredTasks.length})
          </h3>
          
          {filteredTasks.length > 0 ? (
            <div className="space-y-2">
              {filteredTasks.slice(0, 10).map(task => (
                <div key={task.id} className="border border-gray-200 rounded-md p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{task.task_id}</div>
                      <div className="text-sm text-gray-600 mt-1 line-clamp-2">{task.problem}</div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        task.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                        task.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {task.difficulty}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        task.status === 'published' ? 'bg-green-100 text-green-800' :
                        task.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {filteredTasks.length > 10 && (
                <div className="text-center text-sm text-gray-500 mt-4">
                  Showing first 10 of {filteredTasks.length} tasks
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No tasks found for the selected criteria.
            </div>
          )}
        </div>
      </div>

      {/* Course Structure */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Course Structure</h2>
        
        {courses.map(course => (
          <div key={course.id} className="mb-6 last:mb-0">
            <h3 className="font-medium text-gray-900 mb-2">{course.name}</h3>
            <p className="text-sm text-gray-600 mb-3">{course.description}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {course.subjects.map(subject => (
                <div key={subject.id} className="border border-gray-200 rounded-md p-3">
                  <div className="font-medium text-sm text-gray-900">{subject.name}</div>
                  <div className="text-xs text-gray-600 mt-1">{subject.description}</div>
                  <div className="text-xs text-gray-500 mt-2">
                    {subject.learning_objectives.length} learning objectives
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 