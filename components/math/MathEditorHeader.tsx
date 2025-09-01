"use client";

import TeX from "@matejmazur/react-katex";
import { useState } from "react";

interface MathEditorHeaderProps {
	onAddFormula: () => void;
	onInsertIntoActive: (content: string) => boolean;
	onSymbolClick: (symbol: string) => void;
}

export default function MathEditorHeader({ onAddFormula, onInsertIntoActive, onSymbolClick }: MathEditorHeaderProps) {
	const [showMoreSymbols, setShowMoreSymbols] = useState(false);
	
	const handleAddFormula = () => {
		if (!onInsertIntoActive("")) {
			onAddFormula();
		}
	};

	return (
		<div className="px-3 py-1.5 mx-2 mt-2 mb-2">
			{/* Row 1: Button + ALL Symbols */}
			<div className="flex items-center justify-center mb-1">
				{/* Left side - Button in its own box, positioned top-right within its div */}
				<div className="mr-4 flex justify-end">
					<button
						onMouseDown={(e) => e.preventDefault()}
						onClick={handleAddFormula}
						className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
					>
						<svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
							<path d="M4 4h16v2H4V4zm3 4h10l-5 6 5 6H7v-2h8.5L11 14l4.5-6H7V8z" />
						</svg>
						<span>Lisää kaava</span>
					</button>
				</div>
				
				{/* Center - ALL Symbols in one box, perfectly centered */}
				<div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg p-2">
					{/* Row 1: Greek Letters + Math Symbols */}
					<div className="flex items-center gap-4 mb-2">
						{/* Greek Letters */}
						<div className="flex items-center gap-1">
							<span className="text-xs text-gray-600 mr-1 w-12">Kreikka:</span>
							{['\\pi', '\\theta', '\\alpha', '\\beta', '\\gamma', '\\delta', '\\epsilon', '\\phi', '\\lambda', '\\mu', '\\sigma', '\\omega'].map(symbol => (
								<button
									key={symbol}
									onMouseDown={(e) => e.preventDefault()}
									className="px-1 py-0.5 text-xs bg-white/80 backdrop-blur-sm border border-white/60 rounded hover:bg-white/90 transition-colors flex items-center justify-center min-w-5 text-gray-900"
									title={symbol}
									onClick={() => onSymbolClick(symbol)}
								>
									<TeX math={symbol} />
								</button>
							))}
						</div>
						
						{/* Math Symbols */}
						<div className="flex items-center gap-1">
							<span className="text-xs text-gray-600 mr-1 w-12">Symbolit:</span>
							{[
								{ label: '\\infty', insert: '\\infty' },
								{ label: '\\pm', insert: '\\pm' },
								{ label: '\\times', insert: '\\times' },
								{ label: '\\div', insert: '\\div' },
								{ label: '\\sqrt{x}', insert: '\\sqrt{}' },
								{ label: '\\sum', insert: '\\sum' },
								{ label: '\\int', insert: '\\int' },
								{ label: '\\frac{a}{b}', insert: '\\frac{}{}' },
								{ label: 'x^{2}', insert: '^{}' },
								{ label: 'x_{1}', insert: '_{}' },
								{ label: '90^{\\circ}', insert: '^{\\circ}' }
							].map(({ label, insert }) => (
								<button
									key={label}
									onMouseDown={(e) => e.preventDefault()}
									className="px-1 py-0.5 text-xs bg-white/80 backdrop-blur-sm border border-white/60 rounded hover:bg-white/90 transition-colors flex items-center justify-center min-w-5 text-gray-900"
									title={insert}
									onClick={() => onSymbolClick(insert)}
								>
									<TeX math={label} />
								</button>
							))}
						</div>
					</div>
					
					{/* Expandable rows */}
					{showMoreSymbols && (
						<>
							{/* Row 2: Functions + Sets */}
							<div className="flex items-center gap-4 mb-2">
								{/* Functions */}
								<div className="flex items-center gap-1">
									<span className="text-xs text-gray-600 mr-1 w-12">Funktiot:</span>
									{[
										{ label: '\\sin x', insert: '\\sin()' },
										{ label: '\\cos x', insert: '\\cos()' },
										{ label: '\\tan x', insert: '\\tan()' },
										{ label: '\\log x', insert: '\\log()' },
										{ label: '\\ln x', insert: '\\ln()' },
										{ label: '\\exp x', insert: '\\exp()' }
									].map(({ label, insert }) => (
										<button
											key={label}
											onMouseDown={(e) => e.preventDefault()}
											className="px-1 py-0.5 text-xs bg-white/80 backdrop-blur-sm border border-white/60 rounded hover:bg-white/90 transition-colors flex items-center justify-center min-w-5 text-gray-900"
											title={insert}
											onClick={() => onSymbolClick(insert)}
										>
											<TeX math={label} />
										</button>
									))}
								</div>
								
								{/* Sets */}
								<div className="flex items-center gap-1">
									<span className="text-xs text-gray-600 mr-1 w-8">Joukot:</span>
									{['\\mathbb{R}', '\\mathbb{N}', '\\mathbb{Z}', '\\mathbb{Q}', '\\mathbb{C}'].map(symbol => (
										<button
											key={symbol}
											onMouseDown={(e) => e.preventDefault()}
											className="px-1 py-0.5 text-xs bg-white/80 backdrop-blur-sm border border-white/60 rounded hover:bg-white/90 transition-colors flex items-center justify-center min-w-5 text-gray-900"
											title={symbol}
											onClick={() => onSymbolClick(symbol)}
										>
											<TeX math={symbol} />
										</button>
									))}
								</div>
							</div>
						</>
					)}
				</div>
				
				{/* Right side - Expand/Collapse button */}
				<div className="ml-4">
					<button
						onClick={() => setShowMoreSymbols(!showMoreSymbols)}
						className="text-gray-600 hover:text-gray-800 transition-colors p-1 rounded"
						title={showMoreSymbols ? 'Näytä vähemmän' : 'Näytä enemmän'}
					>
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							{showMoreSymbols ? (
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
							) : (
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
							)}
						</svg>
					</button>
				</div>
			</div>
		</div>
	);
}
