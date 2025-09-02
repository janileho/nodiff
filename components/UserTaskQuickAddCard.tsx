"use client";

import { useState, useRef } from "react";
import React from "react";
import TeX from "@matejmazur/react-katex";

type Props = {
  courseId: string | null;
  subjectId: string | null;
  onCreated?: (taskId: string) => void;
};

export default function UserTaskQuickAddCard({ courseId, subjectId, onCreated }: Props) {
  const [question, setQuestion] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle"|"generating"|"show_steps"|"finalizing"|"show_answer"|"ready">("idle");
  const [genSteps, setGenSteps] = useState<string[]>([]);
  const [genAnswer, setGenAnswer] = useState<string>("");
  const [extracting, setExtracting] = useState(false);
  const [typing, setTyping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Render plain text with inline LaTeX: supports $...$, \( ... \), \[ ... \]
  const renderWithLatex = (content: string) => {
    // Normalize display math delimiters to \[ ... \]
    const parts = content.split(/(\$[^$\n]+\$|\\\[[^\]]*\\\]|\\\([^\)]*\\\))/);
    return parts.map((part, idx) => {
      if (!part) return null;
      // $...$
      if (part.startsWith("$") && part.endsWith("$")) {
        const latex = part.slice(1, -1).trim();
        if (!latex) return <span key={idx}></span>;
        return <TeX key={idx}>{latex}</TeX>;
      }
      // \( ... \)
      if (part.startsWith("\\(") && part.endsWith("\\)")) {
        const latex = part.slice(2, -2).trim();
        return <TeX key={idx}>{latex}</TeX>;
      }
      // \[ ... \]
      if (part.startsWith("\\[") && part.endsWith("\\]")) {
        const latex = part.slice(2, -2).trim();
        return (
          <div key={idx} className="my-1">
            <TeX>{latex}</TeX>
          </div>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const canGenerate = question.trim().length > 0 && !loading && !typing;
  const canSave = !!courseId && !!subjectId && genSteps.length > 0 && !!genAnswer && !loading;

  const generate = async () => {
    if (!canGenerate) return;
    setLoading(true);
    setError(null);
    setPhase("generating");
    setGenSteps([]);
    setGenAnswer("");
    try {
      const res = await fetch("/api/user-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, generateOnly: true }),
      });
      if (!res.ok) throw new Error("Generointi epäonnistui");
      const json = await res.json();
      const steps: string[] = Array.isArray(json.solution_steps) ? json.solution_steps : [];
      const answer: string = String(json.final_answer || "");
      // Show steps first
      setGenSteps(steps);
      setPhase("show_steps");
      // Simulate separate finalization phase
      setTimeout(() => {
        setPhase("finalizing");
        setTimeout(() => {
          setGenAnswer(answer || "");
          setPhase("show_answer");
        }, 700);
      }, 300);
    } catch (e: any) {
      setError(e?.message || "Generointi epäonnistui");
      setPhase("idle");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!canSave) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/user-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          solution_steps: genSteps,
          final_answer: genAnswer,
          difficulty: (difficulty || "keskitaso"),
          course_id: courseId,
          subject_id: subjectId,
        }),
      });
      if (!res.ok) throw new Error("Tallennus epäonnistui");
      const json = await res.json();
      const taskId: string = json.task?.task_id;
      setPhase("ready");
      onCreated?.(taskId);
      // Reset inputs for next time
      setQuestion("");
      setDifficulty("");
      setGenSteps([]);
      setGenAnswer("");
      setPhase("idle");
    } catch (e: any) {
      setError(e?.message || "Tallennus epäonnistui");
    } finally {
      setLoading(false);
    }
  };

  const typeIn = (incoming: string) => new Promise<void>((resolve) => {
    const base = question ? question + "\n" : "";
    const target = base + incoming;
    if (incoming.length === 0) { resolve(); return; }
    setTyping(true);
    setQuestion(base);
    let i = 0;
    const tick = () => {
      i++;
      setQuestion(target.slice(0, base.length + i));
      if (base.length + i >= target.length) { setTyping(false); resolve(); return; }
      setTimeout(tick, 12);
    };
    setTimeout(tick, 12);
  });

  const extractFromFile = async (file: File) => {
    setError(null);
    setExtracting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/user-tasks/extract", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error("Kuvan lukeminen epäonnistui");
      const json = await res.json();
      const text = String(json.text || "");
      if (text) {
        await typeIn(text);
        // scroll caret to end
        const ta = document.querySelector('textarea[placeholder="Kuvaa tehtävä..."]') as HTMLTextAreaElement | null;
        if (ta) {
          ta.selectionStart = ta.selectionEnd = ta.value.length;
          ta.scrollTop = ta.scrollHeight;
        }
      }
    } catch (e: any) {
      setError(e?.message || "Kuvan lukeminen epäonnistui");
    } finally {
      setExtracting(false);
    }
  };

  const onImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.currentTarget;
    const file = inputEl.files?.[0];
    if (!file) return;
    await extractFromFile(file);
    // reset input so same file can be reselected
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    } else if (inputEl) {
      inputEl.value = "";
    }
  };

  const onPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.kind === "file" && it.type.startsWith("image/")) {
        const file = it.getAsFile();
        if (file) {
          e.preventDefault();
          await extractFromFile(file);
          break;
        }
      }
    }
  };

  return (
    <div className="bg-white/30 backdrop-blur-sm border border-white/40 rounded-xl shadow-lg p-3 md:p-4 w-64">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs md:text-sm font-medium text-gray-900">Lisää oma tehtävä</h3>
      </div>
      <textarea
        className="w-full rounded-md border border-white/60 bg-white/70 p-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        rows={4}
        placeholder="Kuvaa tehtävä..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        onPaste={onPaste}
        disabled={loading}
      />
      {typing && (
        <div className="mt-1 text-[11px] text-gray-500">Kirjoitetaan tekstiä…</div>
      )}
      {/* Question preview with KaTeX */}
      {question.trim() && (
        <div className="mt-2 p-2 rounded bg-white/60 border border-white/60 text-xs text-gray-800">
          {renderWithLatex(question)}
        </div>
      )}
      <div className="mt-2 flex items-center gap-2">
        <label className="inline-flex items-center gap-2 text-[11px] text-gray-700 cursor-pointer">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={onImageSelected} className="hidden" />
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-white/60 bg-white/70 hover:bg-white/80">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M4 16l4.5-6 3.5 4.5 2-2.5L20 16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {extracting ? "Luetaan…" : "Lue kuvasta"}
          </span>
        </label>
        <select
          className="flex-1 rounded-md border border-white/60 bg-white/70 px-2 py-1 text-xs"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          disabled={loading}
        >
          <option value="">Vaikeustaso (valinnainen)</option>
          <option value="helppo">helppo</option>
          <option value="keskitaso">keskitaso</option>
          <option value="haastava">haastava</option>
        </select>
        <button
          onClick={generate}
          disabled={!canGenerate}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 text-white px-3 py-1.5 text-xs hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading && phase === "generating" ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
          ) : (
            <span>Generoi</span>
          )}
        </button>
      </div>
      {error && <div className="mt-2 text-[11px] text-red-600">{error}</div>}

      {/* Generation progress & result */}
      {phase !== "idle" && (
        <div className="mt-3 text-[11px] text-gray-700">
          {phase === "generating" && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>Luodaan ratkaisuaskeleita…</span>
            </div>
          )}
          {(phase === "show_steps" || phase === "finalizing" || phase === "show_answer") && (
            <div className="space-y-1">
              <div className="font-medium">Vaiheet:</div>
              <ol className="list-decimal ml-4 space-y-1">
                {genSteps.map((s, i) => (
                  <li key={i}>{renderWithLatex(s)}</li>
                ))}
              </ol>
            </div>
          )}
          {phase === "finalizing" && (
            <div className="mt-2 flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
              <span>Lasketaan lopullista vastausta…</span>
            </div>
          )}
          {phase === "show_answer" && (
            <div className="mt-2">
              <div className="font-medium">Lopullinen vastaus: <span className="text-gray-500 font-normal">piilotettu</span></div>
              <div className="mt-2 flex justify-end">
                <button
                  onClick={save}
                  disabled={!canSave}
                  className="inline-flex items-center gap-2 rounded-md bg-green-600 text-white px-3 py-1.5 text-xs hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                  ) : (
                    <span>Tallenna ja avaa</span>
                  )}
                </button>
              </div>
              {(!courseId || !subjectId) && (
                <div className="mt-2 text-[11px] text-gray-500">Valitse kurssi ja aihe ennen tallennusta</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


