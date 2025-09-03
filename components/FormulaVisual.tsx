"use client";

import 'katex/dist/katex.min.css';
import InlineMath from '@matejmazur/react-katex';
import { useEffect, useState } from 'react';
import type { Course } from '@/lib/course-data';

interface FormulaVisualProps {
  moduleId: string;
  sectionId?: string;
  compact?: boolean;
}

interface FormulaWithExplanation {
  formula: string;
  explanation: string;
}

export default function FormulaVisual({ moduleId, sectionId, compact = false }: FormulaVisualProps) {
  const [formulas, setFormulas] = useState<FormulaWithExplanation[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    async function fetchCourse() {
      if (!moduleId) { if (mounted) { setFormulas([]); setLoading(false); } return; }
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/courses/${moduleId}`);
        if (!res.ok) { if (mounted) { setFormulas([]); } return; }
        const json = await res.json();
        const course = json.course as Course | undefined;
        if (!course) { if (mounted) { setFormulas([]); } return; }
        const subject = course.subjects?.find((s: any) => s.id === sectionId);
        const list = (subject?.formulas_with_explanations || []) as any[];
        if (mounted) {
          if (Array.isArray(list) && list.length > 0) {
            setFormulas(list.map(f => ({ formula: String(f.formula || ''), explanation: String(f.explanation || '') })));
          } else {
            setFormulas([]);
          }
        }
      } catch {
        if (mounted) setFormulas([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchCourse();
    return () => { mounted = false; };
  }, [moduleId, sectionId]);

  // Compact rendering (single-line preview)
  if (compact) {
    if (loading) return <div className="mt-2 h-4 w-24 bg-white/40 rounded animate-pulse" />;
    if (!formulas || formulas.length === 0) return <div className="mt-2 text-xs text-gray-500">Ei kaavoja</div>;
    return (
      <div className="mt-2">
        <InlineMath math={formulas[0].formula} />
      </div>
    );
  }

  // Full rendering
  if (loading) {
    return (
      <div className="mb-3">
        <div className="text-sm font-medium text-gray-700 mb-1">Teoria:</div>
        <div className="space-y-1 max-w-md">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white/50 px-2 py-1 rounded border border-white/60">
              <div className="h-4 w-3/4 bg-white/70 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!formulas || formulas.length === 0) {
    return (
      <div className="mb-3">
        <div className="text-sm font-medium text-gray-700 mb-1">Teoria:</div>
        <div className="text-xs text-gray-500">Ei kaavoja tälle aiheelle.</div>
      </div>
    );
  }

  return (
    <div className="mb-3">
      <div className="text-sm font-medium text-gray-700 mb-1">Teoria:</div>
      <div className="space-y-1 max-w-md">
        {formulas.map((item, index) => (
          <div key={index} className="bg-white/50 px-2 py-1 rounded border border-white/60">
            <div className="flex items-center gap-2">
              <InlineMath math={item.formula} />
              <span className="text-xs text-gray-500 flex-shrink-0">• {item.explanation}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 