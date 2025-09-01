"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import TeX from "@matejmazur/react-katex";

type FormulaState = {
	id: string;
	content: string;
	editing: boolean;
};

type Props = {
	initialText?: string;
	onChange: (text: string) => void;
};

export type RichMathEditorHandle = {
	appendText: (content: string) => void;
	appendFormula: (latex: string) => void;
	getContent: () => string;
};

function generateId() {
	return Math.random().toString(36).slice(2, 9);
}

function sanitizeLatex(input: string): string {
	const s = (input ?? "").trim();
	if ((s.startsWith("$$") && s.endsWith("$$")) || (s.startsWith("$ ") && s.endsWith(" $"))) {
		return s.replace(/^\${2}/, "").replace(/\${2}$/, "").trim();
	}
	if (s.startsWith("$") && s.endsWith("$")) {
		return s.slice(1, -1).trim();
	}
	return s;
}

function convertAsteriskToCdot(input: string): string {
	// Convert * to \cdot for multiplication, but avoid converting in LaTeX commands
	return input.replace(/(?<!\\)\*/g, "\\cdot");
}

function expandFractionShorthand(input: string): string {
	let out = (input ?? "");
	let prev = "";
	let guard = 0;
	
	// Handle nested fractions: (expr)/(expr), (expr)/token, token/(expr), token/token
	const rePP = /\(\s*([^()]+?)\s*\)\s*\/\s*\(\s*([^()]+?)\s*\)/g;
	const rePT = /\(\s*([^()]+?)\s*\)\s*\/\s*([A-Za-z0-9]+)/g;
	const reTP = /([A-Za-z0-9]+)\s*\/\s*\(\s*([^()]+?)\s*\)/g;
	const reTT = /([A-Za-z0-9]+)\s*\/\s*([A-Za-z0-9]+)/g;
	
	while (out !== prev && guard++ < 10) {
		prev = out;
		out = out
			.replace(rePP, "\\frac{$1}{$2}")
			.replace(rePT, "\\frac{$1}{$2}")
			.replace(reTP, "\\frac{$1}{$2}")
			.replace(reTT, "\\frac{$1}{$2}");
	}
	
	return out;
}

function expandExponentShorthand(input: string): string {
	let out = (input ?? "");
	
	// Handle parentheses exponents: a^(b) -> a^{b}
	out = out.replace(/([A-Za-z0-9\}\]])\s*\^\s*\(\s*([^()]+?)\s*\)/g, "$1^{ $2 }");
	
	// Handle parentheses base with exponent: (a)^b -> {a}^{b}
	out = out.replace(/\(\s*([^()]+?)\s*\)\s*\^\s*([A-Za-z0-9\{\(]+)/g, "{ $1 }^{ $2 }");
	
	// Handle simple exponents: a^b -> a^{b}
	out = out.replace(/([A-Za-z0-9])\s*\^\s*([A-Za-z0-9])/g, "$1^{ $2 }");
	
	// Handle chained exponents right-associatively: a^b^c -> a^{b^{c}}
	let prev = "";
	let guard = 0;
	while (out !== prev && guard++ < 10) {
		prev = out;
		// Find patterns like ^{a}^{b} and convert to ^{a^{b}}
		out = out.replace(/\^\s*\{([^{}]+)\}\s*\^\s*\{([^{}]+)\}/g, "^{ $1^{ $2 } }");
	}
	
	return out;
}

const RichMathEditor = forwardRef<RichMathEditorHandle, Props>(function RichMathEditor({ initialText = "", onChange }, ref) {
	const [formulas, setFormulas] = useState<FormulaState[]>([]);
	const editorRef = useRef<HTMLDivElement>(null);
	const [currentEditingId, setCurrentEditingId] = useState<string | null>(null);
	const [showPlaceholder, setShowPlaceholder] = useState<boolean>(true);
	const [showToolbar, setShowToolbar] = useState<boolean>(false);

	useEffect(() => {
		// Default: show toolbar on md+ screens, collapse on small
		if (typeof window !== 'undefined') {
			setShowToolbar(window.innerWidth >= 768);
		}
	}, []);

	function updatePlaceholderVisibility() {
		const el = editorRef.current;
		if (!el) return;
		const hasText = (el.innerText || "").trim().length > 0;
		const hasFormula = !!el.querySelector('[data-formula]');
		setShowPlaceholder(!(hasText || hasFormula));
	}

	// Keep formula editor open on clicks inside the editor and move caret
	useEffect(() => {
		const root = editorRef.current;
		if (!root) return;
		const onMouseDown = (e: MouseEvent) => {
			if (!currentEditingId) return;
			const input = document.querySelector(`input[data-formula-input="${currentEditingId}"]`) as HTMLInputElement | null;
			if (!input) return;
			const target = e.target as HTMLElement;
			// If clicking outside the input (anywhere in the editor), keep focus on input
			const isInsideInput = target === input || input.contains(target);
			if (!isInsideInput) {
				e.preventDefault();
				input.focus();
				const len = input.value.length;
				input.selectionStart = input.selectionEnd = len;
			}
		};
		root.addEventListener('mousedown', onMouseDown);
		return () => root.removeEventListener('mousedown', onMouseDown);
	}, [currentEditingId]);

	function insertIntoActiveFormula(latex: string): boolean {
		if (!currentEditingId) return false;
		const input = document.querySelector(`input[data-formula-input="${currentEditingId}"]`) as HTMLInputElement | null;
		if (!input) return false;
		const start = input.selectionStart ?? input.value.length;
		const end = input.selectionEnd ?? start;
		const newValue = input.value.slice(0, start) + latex + input.value.slice(end);
		input.value = newValue;
		// move caret to end of inserted text
		const caret = start + latex.length;
		input.selectionStart = input.selectionEnd = caret;
		// trigger existing input listener to update preview/state
		input.dispatchEvent(new Event('input', { bubbles: true }));
		input.focus();
		return true;
	}

	// Render all formulas in the editor
	useEffect(() => {
		formulas.forEach(formula => {
			const span = editorRef.current?.querySelector(`[data-formula="${formula.id}"]`) as HTMLElement;
			if (span && !formula.editing) {
				span.innerHTML = "";
				span.className = "inline-block align-middle mx-1 cursor-pointer border border-transparent hover:border-gray-200 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors";
				
				if (formula.content.trim()) {
					// Use KaTeX directly to render the formula
					const processedContent = expandExponentShorthand(expandFractionShorthand(convertAsteriskToCdot(sanitizeLatex(formula.content))));
					try {
						// Import KaTeX dynamically
						import('katex').then((katex) => {
							const rendered = katex.default.renderToString(processedContent, {
								throwOnError: false,
								displayMode: false
							});
							span.innerHTML = rendered;
						}).catch(() => {
							// Fallback to text if KaTeX fails to load
							span.textContent = processedContent;
						});
					} catch (error) {
						// Fallback to text
						span.textContent = processedContent;
					}
				} else {
					const textNode = document.createTextNode("Click to edit");
					span.appendChild(textNode);
				}
				
				// Add click listener
				span.onclick = (e) => {
					e.stopPropagation();
					handleFormulaClick(formula.id);
				};
			}
		});
	}, [formulas]);

	function insertFormula(latex: string = "") {
		const id = generateId();
		setFormulas(prev => [...prev, { id, content: latex, editing: true }]);
		
		const sel = window.getSelection();
		if (!sel || !sel.rangeCount) return;
		const range = sel.getRangeAt(0);
		
		// Create formula span
		const span = document.createElement("span");
		span.setAttribute("data-formula", id);
		span.setAttribute("contenteditable", "false");
		span.className = "inline-block align-middle mx-0.5 cursor-pointer border border-gray-300 rounded px-2 py-1 bg-white";
		
		// Create input for editing
		const input = document.createElement("input");
		input.type = "text";
		input.className = "w-32 px-1 py-0.5 border-0 rounded font-mono text-sm outline-none";
		input.value = latex;
		input.setAttribute("data-formula-input", id);
		
		// Create preview container
		const preview = document.createElement("div");
		preview.className = "mt-1 p-1 border rounded bg-gray-50 min-h-[20px] text-sm";
		updatePreview(preview, latex);
		
		span.appendChild(input);
		span.appendChild(preview);
		
		// Insert the span at the current cursor position
		range.insertNode(span);
		
		// Create and select a text node after the formula
		const after = document.createTextNode("\u200B"); // Zero-width space
		range.setStartAfter(span);
		range.insertNode(after);
		range.setStartAfter(after);
		range.collapse(true);
		sel.removeAllRanges();
		sel.addRange(range);
		
		// Focus the input with a small delay to ensure DOM is ready
		setTimeout(() => {
			if (input && document.contains(input)) {
				input.focus();
				input.select();
				setCurrentEditingId(id);
				setShowPlaceholder(false);
			}
		}, 10);
		
		// Add event listeners
		const handleInput = (e: Event) => {
			const newValue = (e.target as HTMLInputElement).value;
			setFormulas(prev => 
				prev.map(f => f.id === id ? { ...f, content: newValue } : f)
			);
			updatePreview(preview, newValue);
		};
		
		const handleKeydown = (e: KeyboardEvent) => {
			if (e.key === "Enter" && e.shiftKey) {
				e.preventDefault();
				const span = handleFormulaCommit(id, input.value);
				
				// After committing, insert a new line and continue with normal text
				setTimeout(() => {
					if (span && editorRef.current) {
						// Focus the editor first
						editorRef.current.focus();
						
						// Create a new line after the committed formula
						const newLine = document.createTextNode("\n");
						span.parentNode?.insertBefore(newLine, span.nextSibling);
						
						// Set cursor position after the new line for normal text editing
						const sel = window.getSelection();
						if (sel) {
							const range = document.createRange();
							range.setStartAfter(newLine);
							range.collapse(true);
							sel.removeAllRanges();
							sel.addRange(range);
						}
					}
				}, 50);
			} else if (e.key === "Enter") {
				e.preventDefault();
				const span = handleFormulaCommit(id, input.value);
				
				// After committing, insert a new line and start a new formula
				setTimeout(() => {
					if (span && editorRef.current) {
						// Focus the editor first
						editorRef.current.focus();
						
						// Create a new line after the committed formula
						const newLine = document.createTextNode("\n");
						span.parentNode?.insertBefore(newLine, span.nextSibling);
						
						// Set cursor position after the new line
						const sel = window.getSelection();
						if (sel) {
							const range = document.createRange();
							range.setStartAfter(newLine);
							range.collapse(true);
							sel.removeAllRanges();
							sel.addRange(range);
							
							// Start a new formula
							insertFormula();
						}
					}
				}, 50);
			} else if ((e.key === "Backspace" || e.key === "Tab") && input.value === "") {
				e.preventDefault();
				// Remove the formula entirely and return to text mode
				const span = editorRef.current?.querySelector(`[data-formula="${id}"]`) as HTMLElement;
				if (span) {
					// Create a text node to replace the formula
					const textNode = document.createTextNode("");
					span.parentNode?.replaceChild(textNode, span);
					
					// Set cursor position at the text node
					const sel = window.getSelection();
					if (sel) {
						const range = document.createRange();
						range.setStart(textNode, 0);
						range.collapse(true);
						sel.removeAllRanges();
						sel.addRange(range);
					}
					
					// Remove from formulas state
					setFormulas(prev => prev.filter(f => f.id !== id));
					setCurrentEditingId(prev => (prev === id ? null : prev)); // Clear current editing ID
					
					// Focus the editor
					editorRef.current?.focus();
				}
			}
		};
		
		const handleBlur = () => {
			handleFormulaCommit(id, input.value);
			setCurrentEditingId(prev => (prev === id ? null : prev));
			updatePlaceholderVisibility();
		};
		
		input.addEventListener("input", handleInput);
		input.addEventListener("keydown", handleKeydown);
		input.addEventListener("blur", handleBlur);
		input.addEventListener('focus', () => setCurrentEditingId(id));
		
		// Clean up event listeners when formula is committed
		const cleanup = () => {
			input.removeEventListener("input", handleInput);
			input.removeEventListener("keydown", handleKeydown);
			input.removeEventListener("blur", handleBlur);
		};
		
		// Store cleanup function for later use
		(span as any)._cleanup = cleanup;
	}

	function handleFormulaCommit(id: string, content: string) {
		const span = editorRef.current?.querySelector(`[data-formula="${id}"]`) as HTMLElement;
		// If empty content, remove the formula entirely
		if (!content || content.trim() === "") {
			// Clean up listeners
			if (span && (span as any)._cleanup) {
				(span as any)._cleanup();
				delete (span as any)._cleanup;
			}
			// Replace span with an empty text node and set cursor
			if (span) {
				const textNode = document.createTextNode("");
				span.parentNode?.replaceChild(textNode, span);
				const sel = window.getSelection();
				if (sel) {
					const range = document.createRange();
					range.setStart(textNode, 0);
					range.collapse(true);
					sel.removeAllRanges();
					sel.addRange(range);
				}
			}
			// Remove from state and clear editing id
			setFormulas(prev => prev.filter(f => f.id !== id));
			setCurrentEditingId(prev => (prev === id ? null : prev));
			// Focus editor and return null to signal removal
			editorRef.current?.focus();
			updatePlaceholderVisibility();
			return null as unknown as HTMLElement;
		}
		// Non-empty: commit and leave rendered
		setFormulas(prev => prev.map(f => f.id === id ? { ...f, content, editing: false } : f));
		// Clean up event listeners
		if (span && (span as any)._cleanup) {
			(span as any)._cleanup();
			delete (span as any)._cleanup;
		}
		updatePlaceholderVisibility();
		return span;
	}

	function updatePreview(previewElement: HTMLElement, content: string) {
		if (content.trim()) {
			try {
				const processedContent = expandExponentShorthand(expandFractionShorthand(convertAsteriskToCdot(sanitizeLatex(content))));
				// Use KaTeX to render the preview
				import('katex').then((katex) => {
					const rendered = katex.default.renderToString(processedContent, {
						throwOnError: false,
						displayMode: false
					});
					previewElement.innerHTML = rendered;
				}).catch(() => {
					// Fallback to text if KaTeX fails to load
					previewElement.innerHTML = `<span class="text-red-500 text-xs">Invalid LaTeX</span>`;
				});
			} catch (error) {
				previewElement.innerHTML = `<span class="text-red-500 text-xs">Invalid LaTeX: ${error instanceof Error ? error.message : 'Unknown error'}</span>`;
			}
		} else {
			previewElement.innerHTML = `<span class="text-gray-400 text-xs">Preview</span>`;
		}
	}

	useImperativeHandle(ref, () => ({
		appendText: (content: string) => {
			const el = editorRef.current;
			if (!el) return;
			
			// Focus the editor first
			el.focus();
			
			// Check if there's a selection
			const sel = window.getSelection();
			if (sel && sel.rangeCount > 0) {
				// Insert at current cursor position
				const range = sel.getRangeAt(0);
				range.deleteContents();
				range.insertNode(document.createTextNode(content));
				
				// Move cursor to end of inserted text
				range.collapse(false);
				sel.removeAllRanges();
				sel.addRange(range);
			} else {
				// No selection, append to end
				document.execCommand("insertText", false, content);
			}
		},
		appendFormula: (latex: string) => {
			const el = editorRef.current;
			if (!el) return;
			el.focus();
			
			// Insert formula in rendered state, not editing state
			const id = generateId();
			setFormulas(prev => [...prev, { id, content: latex, editing: false }]);
			
			const sel = window.getSelection();
			if (!sel || !sel.rangeCount) return;
			const range = sel.getRangeAt(0);
			
			// Create formula span
			const span = document.createElement("span");
			span.setAttribute("data-formula", id);
			span.setAttribute("contenteditable", "false");
			span.className = "inline-block align-middle mx-0.5 cursor-pointer border border-transparent hover:border-gray-300 rounded px-1";
			
			// Render the LaTeX immediately
			const processedContent = expandExponentShorthand(expandFractionShorthand(convertAsteriskToCdot(sanitizeLatex(latex))));
			import('katex').then((katex) => {
				const rendered = katex.default.renderToString(processedContent, {
					throwOnError: false,
					displayMode: false
				});
				span.innerHTML = rendered;
				
				// Add click handler for editing
				const clickHandler = (e: Event) => {
					e.preventDefault();
					e.stopPropagation();
					handleFormulaClick(id);
				};
				span.addEventListener("click", clickHandler);
				
				// Store cleanup function
				(span as any)._cleanup = () => {
					span.removeEventListener("click", clickHandler);
				};
			}).catch(() => {
				span.innerHTML = `<span class="text-red-500 text-xs">Invalid LaTeX</span>`;
			});
			
			range.insertNode(span);
			
			// Create and select a text node after the formula
			const after = document.createTextNode("\u200B"); // Zero-width space
			range.setStartAfter(span);
			range.insertNode(after);
			range.setStartAfter(after);
			range.collapse(true);
			sel.removeAllRanges();
			sel.addRange(range);
		},
		getContent: () => {
			const el = editorRef.current;
			if (!el) return "";
			
			// Clone the element to avoid modifying the original
			const clone = el.cloneNode(true) as HTMLElement;
			
			// Replace formula spans with their LaTeX content
			const formulaSpans = clone.querySelectorAll('[data-formula]');
			formulaSpans.forEach(span => {
				const formulaId = span.getAttribute('data-formula');
				const formula = formulas.find(f => f.id === formulaId);
				if (formula) {
					// Replace the span with the LaTeX content wrapped in $...$
					const latexNode = document.createTextNode(`$${formula.content}$`);
					span.parentNode?.replaceChild(latexNode, span);
				}
			});
			
			// Get the text content
			return clone.textContent || "";
		},
	}));

	function handleFormulaClick(id: string) {
		console.log("handleFormulaClick called with id:", id); // Debug log
		const formula = formulas.find(f => f.id === id);
		console.log("Found formula:", formula); // Debug log
		
		if (formula && !formula.editing) {
			console.log("Converting to editing mode"); // Debug log
			setFormulas(prev => prev.map(f => f.id === id ? { ...f, editing: true } : f));
			setCurrentEditingId(id);
			
			// Convert to editing mode
			const span = editorRef.current?.querySelector(`[data-formula="${id}"]`) as HTMLElement;
			if (span) {
				console.log("Found span, converting to edit mode"); // Debug log
				span.innerHTML = "";
				span.className = "inline-block align-middle mx-1 cursor-pointer border border-gray-200 rounded-lg px-2 py-1 bg-gray-50 hover:bg-gray-100 transition-colors";
				
				// Create input for editing
				const input = document.createElement("input");
				input.type = "text";
				input.className = "w-40 px-2 py-1 border-0 rounded-lg font-mono text-sm outline-none bg-white";
				input.value = formula.content;
				input.setAttribute("data-formula-input", id);
				
				// Create preview container
				const preview = document.createElement("div");
				preview.className = "mt-2 p-2 border border-gray-200 rounded-lg bg-white min-h-[24px] text-sm shadow-sm";
				updatePreview(preview, formula.content);
				
				span.appendChild(input);
				span.appendChild(preview);
				
				// Add event listeners
				input.addEventListener("input", (e) => {
					const newValue = (e.target as HTMLInputElement).value;
					setFormulas(prev => 
						prev.map(f => f.id === id ? { ...f, content: newValue } : f)
					);
					updatePreview(preview, newValue);
				});
				
				input.addEventListener("keydown", (e) => {
					if (e.key === "Enter" && e.shiftKey) {
						e.preventDefault();
						const span = handleFormulaCommit(id, input.value);
						
						// After committing, insert a new line and continue with normal text
						setTimeout(() => {
							if (span && editorRef.current) {
								// Focus the editor first
								editorRef.current.focus();
								
								// Create a new line after the committed formula
								const newLine = document.createTextNode("\n");
								span.parentNode?.insertBefore(newLine, span.nextSibling);
								
								// Set cursor position after the new line for normal text editing
								const sel = window.getSelection();
								if (sel) {
									const range = document.createRange();
									range.setStartAfter(newLine);
									range.collapse(true);
									sel.removeAllRanges();
									sel.addRange(range);
								}
							}
						}, 50);
					} else if (e.key === "Enter") {
						e.preventDefault();
						const span = handleFormulaCommit(id, input.value);
						
						// After committing, insert a new line and start a new formula
						setTimeout(() => {
							if (span && editorRef.current) {
								// Focus the editor first
								editorRef.current.focus();
								
								// Create a new line after the committed formula
								const newLine = document.createTextNode("\n");
								span.parentNode?.insertBefore(newLine, span.nextSibling);
								
								// Set cursor position after the new line
								const sel = window.getSelection();
								if (sel) {
									const range = document.createRange();
									range.setStartAfter(newLine);
									range.collapse(true);
									sel.removeAllRanges();
									sel.addRange(range);
									
									// Start a new formula
									insertFormula();
								}
							}
						}, 50);
					} else if ((e.key === "Backspace" || e.key === "Tab") && input.value === "") {
						e.preventDefault();
						// Remove the formula entirely and return to text mode
						const span = editorRef.current?.querySelector(`[data-formula="${id}"]`) as HTMLElement;
						if (span) {
							// Create a text node to replace the formula
							const textNode = document.createTextNode("");
							span.parentNode?.replaceChild(textNode, span);
							
							// Set cursor position at the text node
							const sel = window.getSelection();
							if (sel) {
								const range = document.createRange();
								range.setStart(textNode, 0);
								range.collapse(true);
								sel.removeAllRanges();
								sel.addRange(range);
							}
							
							// Remove from formulas state
							setFormulas(prev => prev.filter(f => f.id !== id));
							setCurrentEditingId(prev => (prev === id ? null : prev)); // Clear current editing ID
							
							// Focus the editor
							editorRef.current?.focus();
						}
					}
				});
				
				input.addEventListener("blur", () => {
					handleFormulaCommit(id, input.value);
					setCurrentEditingId(prev => (prev === id ? null : prev));
				});
				
				// Focus the input
				setTimeout(() => {
					input.focus();
					input.select();
				}, 0);
			} else {
				console.log("Span not found!"); // Debug log
			}
		} else {
			console.log("Formula not found or already editing"); // Debug log
		}
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && (e.key === "E" || e.key === "e")) {
			e.preventDefault();
			insertFormula();
		}
	}

	function handleClick(e: React.MouseEvent) {
		const target = e.target as HTMLElement;
		
		// Check if we clicked on a formula or its children
		const formulaElement = target.closest('[data-formula]') as HTMLElement;
		if (formulaElement) {
			e.preventDefault();
			e.stopPropagation();
			const id = formulaElement.getAttribute("data-formula")!;
			console.log("Formula clicked:", id); // Debug log
			handleFormulaClick(id);
			return;
		}
	}

	return (
		<div className="flex flex-col h-full overflow-hidden">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
				<div className="text-sm font-medium text-gray-700">Matematiikan editori</div>
				<div className="flex items-center gap-2 text-xs">
					<button
						onMouseDown={(e) => e.preventDefault()}
						onClick={() => setShowToolbar(v => !v)}
						className="px-2.5 py-1 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
					>
						Kaavat
					</button>
					<button 
						className="px-2.5 py-1 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
						onMouseDown={(e) => e.preventDefault()}
						onClick={() => {
							if (!insertIntoActiveFormula("") ) {
								editorRef.current?.focus();
								insertFormula();
							}
						}}
					>
						+ Kaava
					</button>
					<span className="text-gray-500 hidden sm:inline">Ctrl+E</span>
				</div>
			</div>
 
			{/* LaTeX Toolbar (collapsible) */}
			{showToolbar && (
				<div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
					<div className="flex flex-nowrap gap-2 overflow-x-auto no-scrollbar items-center">
						{/* Greek Letters */}
						<div className="flex items-center gap-1 flex-shrink-0">
							<span className="text-xs text-gray-500 mr-2">Kreikka:</span>
							{['\\pi', '\\theta', '\\alpha', '\\beta', '\\gamma', '\\delta', '\\epsilon', '\\phi', '\\lambda', '\\mu', '\\sigma', '\\omega'].map(symbol => (
								<button
									key={symbol}
									onMouseDown={(e) => e.preventDefault()}
									className="px-2 py-1 text-[11px] bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center justify-center min-w-[26px] text-gray-900"
									title={symbol}
									onClick={() => { if (!insertIntoActiveFormula(symbol)) { insertFormula(symbol); } }}
								>
									<TeX math={symbol} />
								</button>
							))}
						</div>
						
						{/* Mathematical Symbols */}
						<div className="flex items-center gap-1 flex-shrink-0">
							<span className="text-xs text-gray-500 mr-2">Symbolit:</span>
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
									className="px-2 py-1 text-[11px] bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center justify-center min-w-[26px] text-gray-900"
									title={insert}
									onClick={() => { if (!insertIntoActiveFormula(insert)) { insertFormula(insert); } }}
								>
									<TeX math={label} />
								</button>
							))}
						</div>
						
						{/* Functions */}
						<div className="flex items-center gap-1 flex-shrink-0">
							<span className="text-xs text-gray-500 mr-2">Funktiot:</span>
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
									className="px-2 py-1 text-[11px] bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center justify-center min-w-[26px] text-gray-900"
									title={insert}
									onClick={() => { if (!insertIntoActiveFormula(insert)) { insertFormula(insert); } }}
								>
									<TeX math={label} />
								</button>
							))}
						</div>
						
						{/* Sets */}
						<div className="flex items-center gap-1 flex-shrink-0">
							<span className="text-xs text-gray-500 mr-2">Joukot:</span>
							{['\\mathbb{R}', '\\mathbb{N}', '\\mathbb{Z}', '\\mathbb{Q}', '\\mathbb{C}'].map(symbol => (
								<button
									key={symbol}
									onMouseDown={(e) => e.preventDefault()}
									className="px-2 py-1 text-[11px] bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center justify-center min-w-[26px] text-gray-900"
									title={symbol}
									onClick={() => { if (!insertIntoActiveFormula(symbol)) { insertFormula(symbol); } }}
								>
									<TeX math={symbol} />
								</button>
							))}
						</div>
					</div>
				</div>
			)}
			
			{/* Editor */}
			<div className="flex-1 overflow-hidden p-4">
				<div className="relative h-full">
					{/* In-editor placeholder */}
					{showPlaceholder && (
						<div className="pointer-events-none absolute top-6 left-6 text-gray-400 text-sm select-none">
							Lisää kaava: Ctrl+E (Mac: Cmd+E)
						</div>
					)}
					<div
						ref={editorRef}
						className="h-full p-6 outline-none whitespace-pre-wrap text-base leading-7 text-gray-900 bg-white rounded-xl border border-gray-200 shadow-sm focus:ring-1 focus:ring-[#10a37f] focus:border-[#10a37f] focus:bg-gradient-to-r focus:from-white focus:to-gray-50 transition-all duration-200 overflow-y-auto"
						contentEditable
						onKeyDown={handleKeyDown}
						onClick={(e) => { handleClick(e); updatePlaceholderVisibility(); }}
						onInput={() => { onChange(editorRef.current?.innerText ?? ""); updatePlaceholderVisibility(); }}
						style={{ 
							fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
						}}
					/>
				</div>
			</div>
		</div>
	);
});

export default RichMathEditor; 