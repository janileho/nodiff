"use client";

import { useState } from "react";

type Props = {
  courseId: string | null;
  subjectId: string | null;
  onCreated?: (taskId: string) => void;
};

export default function AddUserTaskButton({ courseId, subjectId, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [difficulty, setDifficulty] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !!courseId && !!subjectId && question.trim().length > 0 && !loading;

  const submit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/user-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          course_id: courseId,
          subject_id: subjectId,
          difficulty: difficulty || undefined,
        }),
      });
      if (!res.ok) throw new Error("Luonti epäonnistui");
      const json = await res.json();
      const taskId: string = json.task?.task_id;
      setOpen(false);
      setQuestion("");
      setDifficulty("");
      onCreated?.(taskId);
    } catch (e: any) {
      setError(e?.message || "Virhe luotaessa tehtävää");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center justify-center rounded-md border border-white/40 bg-white/60 hover:bg-white/80 text-gray-800 transition-colors h-8 w-8 shadow-sm"
        title="Lisää oma tehtävä"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 z-10 bg-white/80 backdrop-blur-sm border border-white/60 rounded-lg shadow-lg p-3">
          <div className="mb-2 text-xs text-gray-600">Lisää oma tehtävä valittuun kurssiin ja aiheeseen</div>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Kuvaa tehtävä..."
            className="w-full rounded-md border border-white/60 bg-white/70 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={3}
          />
          <div className="mt-2 flex items-center gap-2">
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="flex-1 rounded-md border border-white/60 bg-white/70 px-2 py-1 text-xs"
            >
              <option value="">Vaikeustaso (valinnainen)</option>
              <option value="helppo">helppo</option>
              <option value="keskitaso">keskitaso</option>
              <option value="haastava">haastava</option>
            </select>
            <button
              onClick={submit}
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 text-white px-3 py-1.5 text-xs hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
              ) : (
                <span>Luo</span>
              )}
            </button>
          </div>
          {error && <div className="mt-2 text-[11px] text-red-600">{error}</div>}
          {(!courseId || !subjectId) && (
            <div className="mt-2 text-[11px] text-gray-500">Valitse ensin kurssi ja aihe</div>
          )}
        </div>
      )}
    </div>
  );
}


