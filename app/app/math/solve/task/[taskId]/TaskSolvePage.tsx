"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SolveWorkspace from "@/components/SolveWorkspace";
import TaskVoting from "@/components/TaskVoting";
import type { TaskData } from "@/lib/task-data";
import type { CurrentUser } from "@/lib/auth";

interface TaskInfo {
  task_id: string;
  module: string;
  section: string;
  question: string;
  difficulty: string;
}

interface TaskSolvePageProps {
  task: TaskData;
  user: CurrentUser;
}

export default function TaskSolvePage({ task, user }: TaskSolvePageProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskInfo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasksInSection();
  }, [task.module, task.section]);

  const loadTasksInSection = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tasks?module=${task.module}&section=${task.section}`);
      if (response.ok) {
        const fetchedTasks = await response.json();
        // Sort tasks by difficulty: helppo -> keskitaso -> haastava
        const difficultyOrder = { 'helppo': 1, 'keskitaso': 2, 'haastava': 3 };
        const sortedTasks = fetchedTasks.sort((a: TaskInfo, b: TaskInfo) => {
          const aOrder = difficultyOrder[a.difficulty as keyof typeof difficultyOrder] || 4;
          const bOrder = difficultyOrder[b.difficulty as keyof typeof difficultyOrder] || 4;
          if (aOrder !== bOrder) {
            return aOrder - bOrder;
          }
          // If same difficulty, sort by task_id
          return a.task_id.localeCompare(b.task_id);
        });
        setTasks(sortedTasks);
        
        // Find current task index
        const index = sortedTasks.findIndex((t: TaskInfo) => t.task_id === task.task_id);
        setCurrentIndex(index);
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const navigateToTask = (taskId: string) => {
    router.push(`/app/math/solve/task/${taskId}`);
  };

  const navigateToNext = () => {
    if (currentIndex >= 0 && currentIndex < tasks.length - 1) {
      navigateToTask(tasks[currentIndex + 1].task_id);
    } else if (currentIndex === tasks.length - 1) {
      // Wrap around to first task
      navigateToTask(tasks[0].task_id);
    }
  };

  const navigateToPrev = () => {
    if (currentIndex > 0) {
      navigateToTask(tasks[currentIndex - 1].task_id);
    } else if (currentIndex === 0) {
      // Wrap around to last task
      navigateToTask(tasks[tasks.length - 1].task_id);
    }
  };

  const handleBack = () => {
    router.push(`/app?module=${task.module}&section=${task.section}`);
  };

  return (
    <div className="h-full bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-100 flex flex-col">
      {/* Simplified Top Bar with Navigation */}
      <div className="bg-white/30 backdrop-blur-sm border-b border-white/40 flex-shrink-0 p-3">
        <div className="flex items-center justify-between">
          {/* Left side - Task info */}
          <div className="flex items-center space-x-4">
            <button 
              onClick={handleBack}
              className="text-blue-600 hover:underline text-sm inline-flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Takaisin
            </button>
            
            <div className="text-sm text-gray-600">
              <span className="font-medium">{task.module}</span>
              <span className="mx-2">•</span>
              <span className="font-medium">Tehtävä {currentIndex + 1}</span>
            </div>
          </div>

          {/* Right side - Navigation and Quick actions */}
          <div className="flex items-center space-x-2">
            {!loading && tasks.length > 0 && (
              <>
                <button
                  onClick={navigateToPrev}
                  disabled={tasks.length <= 1}
                  className="inline-flex items-center px-2 py-1 text-sm font-medium text-gray-600 bg-white/50 backdrop-blur-sm border border-white/40 rounded hover:bg-white/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Edellinen tehtävä"
                >
                  Edellinen
                </button>

                <span className="text-sm text-gray-500 px-2">
                  {currentIndex + 1} / {tasks.length}
                </span>

                <button
                  onClick={navigateToNext}
                  disabled={tasks.length <= 1}
                  className="inline-flex items-center px-2 py-1 text-sm font-medium text-gray-600 bg-white/50 backdrop-blur-sm border border-white/40 rounded hover:bg-white/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Seuraava tehtävä"
                >
                  Seuraava
                </button>
              </>
            )}

            <button
              onClick={() => router.push('/app')}
              className="inline-flex items-center px-2 py-1 text-sm font-medium text-blue-600 bg-blue-50/50 backdrop-blur-sm border border-blue-200/50 rounded hover:bg-blue-50/70 transition-colors"
              title="Kotiin"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </button>
          </div>
        </div>


      </div>
      
      {/* Workspace */}
      <div className="flex-1 min-h-0">
        <SolveWorkspace taskId={task.task_id} />
      </div>
      
      {/* Task Voting */}
      <div className="flex-shrink-0 p-4">
        <TaskVoting taskId={task.task_id} />
      </div>
    </div>
  );
} 