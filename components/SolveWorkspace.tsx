"use client";

import { useRef, useState, useEffect } from "react";
import RichMathEditor, { type RichMathEditorHandle } from "@/components/RichMathEditor";
import MathChat from "@/components/MathChat";
import TaskNavigation from "@/components/TaskNavigation";

type Props = {
	taskId: string;
};

export default function SolveWorkspace({ taskId }: Props) {
	const [editorContent, setEditorContent] = useState<string>("");
	const [leftWidth, setLeftWidth] = useState(50); // Percentage
	const editorRef = useRef<RichMathEditorHandle>(null);
	const isDragging = useRef(false);
	
	const handleMouseDown = (e: React.MouseEvent) => {
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
		
		// Limit to 20% - 80% range
		const clampedWidth = Math.max(20, Math.min(80, newLeftWidth));
		setLeftWidth(clampedWidth);
	};
	
	const handleMouseUp = () => {
		isDragging.current = false;
		document.body.style.cursor = '';
		document.body.style.userSelect = '';
	};
	
	// Add event listeners
	useEffect(() => {
		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
		
		return () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		};
	}, []);
	
	return (
		<div className="resize-container flex h-full w-full p-3 md:p-4 gap-2 md:gap-4">
			{/* Left side: Chat */}
			<div 
				className="flex flex-col min-h-0 bg-white/30 backdrop-blur-sm border border-white/40 rounded-xl shadow-lg"
				style={{ width: `${leftWidth}%` }}
			>
				<MathChat 
					taskId={taskId} 
					editorRef={editorRef} 
					editorContent={editorContent}
				/>
			</div>
			
			{/* Resizable divider */}
			<div 
				className="w-0.5 bg-white/40 hover:bg-white/60 cursor-col-resize flex-shrink-0 transition-colors rounded-full"
				onMouseDown={handleMouseDown}
			/>
			
			{/* Right side: Editor + Instructions */}
			<div 
				className="flex flex-col min-h-0"
				style={{ width: `${100 - leftWidth}%` }}
			>
				{/* Math Editor */}
				<div className="flex-1 min-h-0 bg-white/30 backdrop-blur-sm border border-white/40 rounded-xl shadow-lg mb-3 md:mb-4">
					<RichMathEditor 
						ref={editorRef} 
						initialText="" 
						onChange={setEditorContent} 
					/>
				</div>
				
				{/* Editor Instructions */}
				<div className="bg-white/30 backdrop-blur-sm border border-white/40 rounded-xl shadow-lg p-3 md:p-4">
					<h3 className="text-xs md:text-sm font-medium text-gray-900 mb-2">Editorin käyttö:</h3>
					<div className="text-[11px] md:text-xs text-gray-600 space-y-1">
						<p>• Lisää kaava: Ctrl+E (Mac: Cmd+E)</p>
						<p>• Kirjoita matematiikkaa suoraan editoriin</p>
						<p>• Pyydä apua chatista — AI lukee ratkaisusi ja ohjaa eteenpäin</p>
					</div>
				</div>
			</div>
		</div>
	);
} 