"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import RichMathEditor, { type RichMathEditorHandle } from "@/components/RichMathEditor";
import MathChat from "@/components/MathChat";
import TaskNavigation from "@/components/TaskNavigation";
import MathEditorHeader from "@/components/math/MathEditorHeader";
import { motion } from "framer-motion";

export default function SolveWorkspace({ taskId }: { taskId: string }) {
	const [editorContent, setEditorContent] = useState<string>("");
	const [leftWidth, setLeftWidth] = useState(50);
	const editorRef = useRef<RichMathEditorHandle>(null);
	const isDragging = useRef(false);
	const router = useRouter();

	const handleMouseDown = () => {
		isDragging.current = true;
		document.body.style.cursor = 'col-resize';
		document.body.style.userSelect = 'none';
	};
	const handleMouseMove = (e: MouseEvent) => {
		if (!isDragging.current) return;
		const container = document.querySelector('.resize-container') as HTMLElement;
		if (!container) return;
		const rect = container.getBoundingClientRect();
		const newLeftWidth = ((e.clientX - rect.left) / rect.width) * 100;
		const clampedWidth = Math.max(20, Math.min(80, newLeftWidth));
		setLeftWidth(clampedWidth);
	};
	const handleMouseUp = () => {
		isDragging.current = false;
		document.body.style.cursor = '';
		document.body.style.userSelect = '';
	};
	useEffect(() => {
		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		};
	}, []);

	return (
		<motion.div className="flex flex-col h-full w-full" initial={{ opacity: 0, y: 12, scale: 0.985 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}>
			<div className="flex-shrink-0 relative">
				<button onClick={() => router.push('/app')} aria-label="Takaisin" className="absolute left-2 top-2 z-[60] inline-flex items-center justify-center rounded-full border border-white/40 bg-white/60 backdrop-blur-sm text-gray-800 hover:bg-white/80 transition-colors shadow-sm h-8 w-8">
					<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
						<path d="M15 19l-7-7 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
					</svg>
				</button>
				<MathEditorHeader 
					onAddFormula={() => { editorRef.current?.focus(); editorRef.current?.insertNewFormula(); }}
					onInsertIntoActive={(content) => editorRef.current?.insertIntoActiveFormula(content) || false}
					onSymbolClick={(symbol) => { if (!editorRef.current?.insertIntoActiveFormula(symbol)) { editorRef.current?.focus(); editorRef.current?.insertNewFormula(symbol); } }}
				/>
			</div>

			<div className="resize-container flex flex-1 min-h-0 p-2 md:p-3 gap-2 md:gap-3 text-xs md:text-sm transform origin-top xl:scale-90 2xl:scale-75">
				{/* Left: Chat (fixed to full column height) */}
				<motion.div className="flex h-full flex-col min-h-0 bg-white/30 backdrop-blur-sm border border-white/40 rounded-xl shadow-lg overflow-hidden" style={{ width: `${leftWidth}%` }} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
					<MathChat taskId={taskId} editorRef={editorRef} editorContent={editorContent} />
				</motion.div>

				<div className="w-0.5 bg-white/40 hover:bg-white/60 cursor-col-resize flex-shrink-0 transition-colors rounded-full" onMouseDown={handleMouseDown} />

				{/* Right: Editor column with fixed section heights */}
				<motion.div className="flex flex-col h-full min-h-0 overflow-hidden" style={{ width: `${100 - leftWidth}%` }} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, delay: 0.05 }}>
					{/* Editor 75% */}
					<div className="basis-[75%] grow-0 min-h-0 bg-white/30 backdrop-blur-sm border border-white/40 rounded-xl shadow-lg mb-2 overflow-hidden">
						<RichMathEditor ref={editorRef} initialText="" onChange={setEditorContent} />
					</div>
					{/* Navigation 10% */}
					<div className="basis-[10%] grow-0 overflow-hidden mb-2">
						<TaskNavigation taskId={taskId} />
					</div>
					{/* Instructions 15% */}
					<div className="basis-[15%] grow-0 overflow-auto bg-white/30 backdrop-blur-sm border border-white/40 rounded-xl shadow-lg p-3 md:p-4">
						<h3 className="text-xs md:text-sm font-medium text-gray-900 mb-2">Editorin käyttö:</h3>
						<div className="text-[11px] md:text-xs text-gray-600 space-y-1">
							<p>• Kirjoita matematiikkaa suoraan editoriin</p>
							<p>• Pyydä apua chatista — AI lukee ratkaisusi ja ohjaa eteenpäin</p>
						</div>
					</div>
				</motion.div>
			</div>
		</motion.div>
	);
} 