"use client";

import TeX from "@matejmazur/react-katex";

interface MathButtonProps {
	label: string;
	insert: string;
	onClick: (symbol: string) => void;
	className?: string;
}

export default function MathButton({ label, insert, onClick, className = "" }: MathButtonProps) {
	return (
		<button
			onMouseDown={(e) => e.preventDefault()}
			className={`px-1.5 py-0.5 text-xs bg-white/80 backdrop-blur-sm border border-white/60 rounded hover:bg-white/90 transition-colors flex items-center justify-center min-w-6 text-gray-900 ${className}`}
			title={insert}
			onClick={() => onClick(insert)}
		>
			<TeX math={label} />
		</button>
	);
}
