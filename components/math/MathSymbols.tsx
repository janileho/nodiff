"use client";

import MathButton from "./MathButton";

interface MathSymbolsProps {
	onSymbolClick: (symbol: string) => void;
}

export default function MathSymbols({ onSymbolClick }: MathSymbolsProps) {
	const greekLetters = [
		'\\pi', '\\theta', '\\alpha', '\\beta', '\\gamma', '\\delta', 
		'\\epsilon', '\\phi', '\\lambda', '\\mu', '\\sigma', '\\omega'
	];

	const mathematicalSymbols = [
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
	];

	const functions = [
		{ label: '\\sin x', insert: '\\sin()' },
		{ label: '\\cos x', insert: '\\cos()' },
		{ label: '\\tan x', insert: '\\tan()' },
		{ label: '\\log x', insert: '\\log()' },
		{ label: '\\ln x', insert: '\\ln()' },
		{ label: '\\exp x', insert: '\\exp()' }
	];

	const sets = [
		'\\mathbb{R}', '\\mathbb{N}', '\\mathbb{Z}', '\\mathbb{Q}', '\\mathbb{C}'
	];

	return (
		<div className="flex flex-wrap gap-1 items-center">
			{/* Greek Letters */}
			<div className="flex items-center gap-1 flex-shrink-0">
				<span className="text-xs text-gray-500 mr-1">Kreikka:</span>
				{greekLetters.map(symbol => (
					<MathButton
						key={symbol}
						label={symbol}
						insert={symbol}
						onClick={onSymbolClick}
					/>
				))}
			</div>
			
			{/* Mathematical Symbols */}
			<div className="flex items-center gap-1 flex-shrink-0">
				<span className="text-xs text-gray-500 mr-1">Symbolit:</span>
				{mathematicalSymbols.map(({ label, insert }) => (
					<MathButton
						key={label}
						label={label}
						insert={insert}
						onClick={onSymbolClick}
					/>
				))}
			</div>
			
			{/* Functions */}
			<div className="flex items-center gap-1 flex-shrink-0">
				<span className="text-xs text-gray-500 mr-1">Funktiot:</span>
				{functions.map(({ label, insert }) => (
					<MathButton
						key={label}
						label={label}
						insert={insert}
						onClick={onSymbolClick}
					/>
				))}
			</div>
			
			{/* Sets */}
			<div className="flex items-center gap-1 flex-shrink-0">
				<span className="text-xs text-gray-500 mr-1">Joukot:</span>
				{sets.map(symbol => (
					<MathButton
						key={symbol}
						label={symbol}
						insert={symbol}
						onClick={onSymbolClick}
					/>
				))}
			</div>
		</div>
	);
}
