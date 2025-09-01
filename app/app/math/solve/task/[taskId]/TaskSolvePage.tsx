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
      {/* Ultra-thin Header */}
      <div className="flex items-center justify-between px-2 py-1 text-[11px] bg-white/40 backdrop-blur-sm border-b border-white/50">
        <div className="flex items-center gap-2">
          <button onClick={handleBack} className="inline-flex items-center text-blue-700 hover:text-blue-900">
            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Takaisin
          </button>
          <span className="text-gray-600">{task.module}</span>
          <span className="text-gray-400">•</span>
          <span className="text-gray-800">{currentIndex + 1} / {tasks.length || 1}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={navigateToPrev} disabled={tasks.length <= 1} className="px-2 py-0.5 rounded bg-white/60 text-gray-700 disabled:opacity-50">Ed</button>
          <button onClick={navigateToNext} disabled={tasks.length <= 1} className="px-2 py-0.5 rounded bg-white/60 text-gray-700 disabled:opacity-50">Seur</button>
          <button onClick={() => router.push('/app')} className="px-2 py-0.5 rounded bg-blue-600 text-white">Koti</button>
        </div>
      </div>

      {/* Workspace */}
      <div className="ui-scale flex-1 min-h-0">
        <SolveWorkspace taskId={task.task_id} />
      </div>

      {/* Task Voting */}
      <div className="flex-shrink-0 p-2">
        <TaskVoting taskId={task.task_id} />
      </div>
    </div>
  );
} 