"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type TaskSummary = {
  task_id: string;
  subject_id?: string;
  question?: string;
  difficulty?: "helppo" | "keskitaso" | "haastava" | string;
};

interface Props {
  taskId: string;
}

export default function TaskNavigation({ taskId }: Props) {
  const router = useRouter();

  const [currentTask, setCurrentTask] = useState<TaskSummary | null>(null);
  const [allTasks, setAllTasks] = useState<TaskSummary[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isNavigating, setIsNavigating] = useState(false);

  // Load current task (tasks2 first, then fallback)
  useEffect(() => {
    const loadCurrent = async () => {
      try {
        let res = await fetch(`/api/tasks2/${taskId}`);
        if (!res.ok) {
          res = await fetch(`/api/tasks/${taskId}`);
        }
        if (res.ok) {
          const data = await res.json();
          setCurrentTask({
            task_id: data.task_id,
            subject_id: data.subject_id,
            question: data.question,
            difficulty: data.difficulty,
          });
        } else {
          setCurrentTask(null);
        }
      } catch {
        setCurrentTask(null);
      }
    };
    loadCurrent();
  }, [taskId]);

  // Load all tasks for the same subject and sort
  useEffect(() => {
    const loadAll = async () => {
      if (!currentTask?.subject_id) {
        setAllTasks([]);
        setCurrentIndex(-1);
        return;
      }
      try {
        const res = await fetch(`/api/admin/tasks2?subject_id=${currentTask.subject_id}&status=published`);
        if (!res.ok) {
          setAllTasks([]);
          setCurrentIndex(-1);
          return;
        }
        const json = await res.json();
        const tasks: TaskSummary[] = (json.tasks || []).map((t: any) => ({
          task_id: t.task_id,
          subject_id: t.subject_id,
          question: t.question,
          difficulty: t.difficulty,
        }));
        const order: Record<string, number> = { helppo: 1, keskitaso: 2, haastava: 3 };
        tasks.sort((a, b) => {
          const da = order[a.difficulty || "keskitaso"] || 2;
          const db = order[b.difficulty || "keskitaso"] || 2;
          if (da !== db) return da - db;
          const na = parseInt(a.task_id.replace(/\D/g, "")) || 0;
          const nb = parseInt(b.task_id.replace(/\D/g, "")) || 0;
          return na - nb;
        });
        setAllTasks(tasks);
        setCurrentIndex(tasks.findIndex(t => t.task_id === taskId));
      } catch {
        setAllTasks([]);
        setCurrentIndex(-1);
      }
    };
    loadAll();
  }, [currentTask, taskId]);

  const prevTask = currentIndex > 0 ? allTasks[currentIndex - 1] : null;
  const nextTask = currentIndex >= 0 && currentIndex < allTasks.length - 1 ? allTasks[currentIndex + 1] : null;

  const go = async (direction: "prev" | "next") => {
    setIsNavigating(true);
    try {
      const target = direction === "prev" ? prevTask : nextTask;
      if (target) {
        router.push(`/app/math/solve/task/${target.task_id}`);
      } else if (direction === "next") {
        // No next task → go back to app (next section entrypoint TBD)
        router.push("/app");
      }
    } finally {
      setIsNavigating(false);
    }
  };

  return (
    <div className="px-3 py-0.5">
      <div className="flex items-center justify-between">
        {currentIndex >= 0 && allTasks.length > 0 ? (
          <div className="text-[11px] text-gray-600">Tehtävä {currentIndex + 1} / {allTasks.length}</div>
        ) : <div />}

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => go("prev")}
            disabled={isNavigating || !prevTask}
            className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium text-gray-600 bg-white/50 backdrop-blur-sm border border-white/40 rounded-md hover:bg-white/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Edellinen
          </button>

          <button
            onClick={() => go("next")}
            disabled={isNavigating || (!nextTask && !(currentIndex >= 0))}
            className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium text-gray-600 bg-white/50 backdrop-blur-sm border border-white/40 rounded-md hover:bg-white/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {nextTask ? "Seuraava" : "Seuraava aihe"}
            <svg className="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {isNavigating && (
        <div className="mt-0.5 flex items-center justify-center text-[10px] text-gray-600">
          <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Siirrytään...
        </div>
      )}
    </div>
  );
}
