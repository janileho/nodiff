"use client";

import { useRef, useState, useEffect } from "react";
import TeX from "@matejmazur/react-katex";
import type { RichMathEditorHandle } from "@/components/RichMathEditor";
import { getTaskData, getTaskQuestion } from "@/lib/task-data";

type Message = { role: "user" | "assistant"; content: string };

type Props = {
	taskId: string;
	editorRef: React.RefObject<RichMathEditorHandle | null>;
	editorContent: string;
};

// Function to render text with LaTeX formulas and bold formatting
function renderMessageContent(content: string) {
	// First, handle markdown headers (###text) and convert them to bold text
	let processedContent = content.replace(/###\s*([^\n]+)/g, '**$1:**');
	
	// Handle nested LaTeX properly - only convert $$ to \[ \] for display math
	processedContent = processedContent
		.replace(/\$\$([^$]+)\$\$/g, '\\[$1\\]') // Convert $$ to \[ \]
		.replace(/\\\[([^\]]*)\\\]/g, '\\[$1\\]'); // Fix display math
	
	// Split content by LaTeX delimiters with better regex
	const parts = processedContent.split(/(\$[^$\n]+\$|\\\[[^\]]*\\\])/);
	
	return parts.map((part, index) => {
		try {
			if (part.startsWith('$') && part.endsWith('$')) {
				// This is inline LaTeX, render it
				const latex = part.slice(1, -1).trim();
				if (latex.length === 0) return <span key={index}>{part}</span>;
				
				return (
					<span key={index} className="inline-block">
						<TeX 
							settings={{ 
								throwOnError: false,
								errorColor: '#cc0000',
								macros: {
									"\\RR": "\\mathbb{R}",
									"\\NN": "\\mathbb{N}",
									"\\ZZ": "\\mathbb{Z}",
									"\\QQ": "\\mathbb{Q}",
									"\\CC": "\\mathbb{C}"
								}
							}}
						>
							{latex}
						</TeX>
					</span>
				);
			} else if (part.startsWith('\\[') && part.endsWith('\\]')) {
				// This is display LaTeX, render it
				const latex = part.slice(2, -2).trim();
				if (latex.length === 0) return <span key={index}>{part}</span>;
				
				return (
					<div key={index} className="my-2">
						<TeX 
							settings={{ 
								throwOnError: false,
								errorColor: '#cc0000',
								macros: {
									"\\RR": "\\mathbb{R}",
									"\\NN": "\\mathbb{N}",
									"\\ZZ": "\\mathbb{Z}",
									"\\QQ": "\\mathbb{Q}",
									"\\CC": "\\mathbb{C}"
								}
							}}
						>
							{latex}
						</TeX>
					</div>
				);
			} else {
				// This is regular text - handle bold formatting
				return <span key={index}>{renderBoldText(part)}</span>;
			}
		} catch (error) {
			// If LaTeX rendering fails, show the raw LaTeX with error styling
			console.warn('LaTeX rendering error:', error, 'for part:', part);
			return (
				<span key={index} className="text-red-500 font-mono text-sm">
					{part}
				</span>
			);
		}
	});
}

// Function to render bold text (**word**) with improved regex
function renderBoldText(text: string) {
	// Handle nested bold text and other edge cases
	const parts = text.split(/(\*\*[^*]+\*\*)/);
	
	return parts.map((part, index) => {
		if (part.startsWith('**') && part.endsWith('**')) {
			// This is bold text
			const boldContent = part.slice(2, -2);
			return <strong key={index}>{boldContent}</strong>;
		} else {
			// This is regular text - handle line breaks
			return part.split('\n').map((line, lineIndex) => (
				<span key={`${index}-${lineIndex}`}>
					{line}
					{lineIndex < part.split('\n').length - 1 && <br />}
				</span>
			));
		}
	});
}



export default function MathChat({ taskId, editorRef, editorContent }: Props) {
	const [input, setInput] = useState("");
	const [messages, setMessages] = useState<Message[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const [isInitialized, setIsInitialized] = useState(false);

	// Auto-resize textarea
	useEffect(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = "44px";
		}
	}, [input]);

	// Prevent body scrolling
	useEffect(() => {
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = 'auto';
		};
	}, []);

	// Initialize chat with task data
	useEffect(() => {
		console.log('Initializing chat for taskId:', taskId);
		if (!isInitialized) {
			getTaskData(taskId).then(async taskData => {
				console.log('Task data received:', taskData);
				if (!taskData) {
					console.log('No task data found');
					return;
				}
				
				// Get initial message from AI with proper LaTeX formatting
				try {
					const response = await fetch('/api/math/coach/stream', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							taskId,
							editorContent: "",
							conversation: [],
							isInitialMessage: true
						}),
					});

					if (!response.ok) {
						throw new Error(`HTTP error! status: ${response.status}`);
					}

					// Handle streaming response
					const reader = response.body?.getReader();
					if (!reader) {
						throw new Error('No response body');
					}

					let assistantMessage = "";
					setMessages([{ role: "assistant", content: assistantMessage }]);

					const decoder = new TextDecoder();
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;

						const chunk = decoder.decode(value);
						const lines = chunk.split('\n');
						
						for (const line of lines) {
							if (line.startsWith('data: ')) {
								const data = line.slice(6);
								
								if (data === '[DONE]') break;
								
								try {
									const parsed = JSON.parse(data);
									
									// Handle OpenAI streaming format
									if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
										const content = parsed.choices[0].delta.content;
										assistantMessage += content;
										setMessages([{ 
											role: "assistant", 
											content: assistantMessage 
										}]);
									}
								} catch (e) {
									// Ignore parsing errors for incomplete JSON
								}
							}
						}
					}
				} catch (err) {
					console.error('Error fetching initial message:', err);
					// Fallback to simple message if AI fails
					const question = getTaskQuestion(taskData);
					const fallbackMessage = `**Tehtävä:** ${question}

Kirjoita ratkaisusi editoriin ja minä autan sinua tehtävän loppuun asti.`;
					
					setMessages([{ 
						role: "assistant", 
						content: fallbackMessage 
					}]);
				}
				
				setIsInitialized(true);
			});
		}
	}, [taskId, isInitialized]);





	// Send message function
	const sendMessage = async (messageContent: string) => {
		console.log('sendMessage called with:', messageContent);
		if (!messageContent.trim() || isLoading) {
			console.log('Message empty or already loading, returning');
			return;
		}

		const userMessage: Message = { role: "user", content: messageContent };
		console.log('Adding user message to chat');
		setMessages(prev => [...prev, userMessage]);
		setInput("");
		setIsLoading(true);
		setError(null);

		try {
			// Get current editor content
			const currentEditorContent = editorRef.current?.getContent() || "";

			const response = await fetch('/api/math/coach/stream', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					taskId,
					editorContent: currentEditorContent,
					conversation: [...messages, userMessage],
					isInitialMessage: false
				}),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			// Handle streaming response
			const reader = response.body?.getReader();
			if (!reader) {
				throw new Error('No response body');
			}

			let assistantMessage = "";
			setMessages(prev => [...prev, { role: "assistant", content: assistantMessage }]);

			const decoder = new TextDecoder();
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value);
				console.log('Raw chunk:', chunk); // Debug log
				
				const lines = chunk.split('\n');
				
				for (const line of lines) {
					if (line.startsWith('data: ')) {
						const data = line.slice(6);
						console.log('Data line:', data); // Debug log
						
						if (data === '[DONE]') break;
						
						try {
							const parsed = JSON.parse(data);
							console.log('Parsed data:', parsed); // Debug log
							
							// Handle OpenAI streaming format
							if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
								const content = parsed.choices[0].delta.content;
								assistantMessage += content;
								setMessages(prev => {
									const newMessages = [...prev];
									if (newMessages.length > 0) {
										newMessages[newMessages.length - 1] = {
											...newMessages[newMessages.length - 1],
											content: assistantMessage
										};
									}
									return newMessages;
								});
							}
						} catch (e) {
							console.log('Parse error for line:', data, e); // Debug log
							// Ignore parsing errors for incomplete JSON
						}
					}
				}
			}
		} catch (err) {
			console.error('Chat error:', err);
			setError(err instanceof Error ? err.message : 'An error occurred');
			setMessages(prev => [...prev, { 
				role: "assistant", 
				content: "Pahoittelut, tapahtui virhe. Yritä uudelleen." 
			}]);
		} finally {
			setIsLoading(false);
		}
	};

	// Action button handlers
	const requestHint = () => {
		// Show only "Vihje" in chat, but send the full prompt to API
		const displayMessage: Message = { role: "user", content: "Vihje" };
		setMessages(prev => [...prev, displayMessage]);
		setIsLoading(true);
		setError(null);

		const hintPrompt = "Anna vain yksi seuraava askel ratkaisussa. Älä selitä liikaa, vain seuraava askel.";
		console.log('Sending hint prompt:', hintPrompt);

		// Send the actual prompt in the background
		sendMessageInternal(hintPrompt);
	};

	const requestFormulas = () => {
		// Show only "Kaavat" in chat, but send the full prompt to API
		const displayMessage: Message = { role: "user", content: "Kaavat" };
		setMessages(prev => [...prev, displayMessage]);
		setIsLoading(true);
		setError(null);

		const formulasPrompt = "Listaa kaikki kaavat ja sääntöjä, joita tarvitaan tämän tehtävän ratkaisemiseen. Selitä lyhyesti mitä kukin kaava tarkoittaa ja milloin sitä käytetään. Käytä LaTeX-syntaksia kaavoille.";
		console.log('Sending formulas prompt:', formulasPrompt);

		// Send the actual prompt in the background
		sendMessageInternal(formulasPrompt);
	};

	const checkSolution = () => {
		// Show only "Tarkista" in chat, but send the full prompt to API
		const displayMessage: Message = { role: "user", content: "Tarkista" };
		setMessages(prev => [...prev, displayMessage]);
		setIsLoading(true);
		setError(null);

		// Get task data to include the correct answer in the prompt
		getTaskData(taskId).then(taskData => {
			if (!taskData) {
				setError('Tehtävän tietoja ei löytynyt');
				setIsLoading(false);
				return;
			}

			const correctAnswer = taskData.final_answer || 'Ei annettu';
			const editorContent = editorRef.current?.getContent() || "";
			
			// Check if editor is empty
			if (!editorContent.trim()) {
				const emptyPrompt = `Editori on tyhjä. Pyydä käyttäjää kirjoittamaan ratkaisunsa editoriin ennen tarkistamista. Älä anna oikeaa vastausta.`;
				console.log('Sending empty editor prompt:', emptyPrompt);
				sendMessageInternal(emptyPrompt);
				return;
			}

			const fullPrompt = `Tarkista ratkaisu vertaamalla editorista saatavaa vastausta annettuun oikeaan vastaukseen.

Editorin sisältö: "${editorContent}"
Oikea vastaus: ${correctAnswer}

Jos ratkaisu on väärin, älä anna oikeaa vastausta, vaan kerro missä virhe on ja miten jatkaa korjaamista. Jos se on oikein, sano että se on oikein.`;

			console.log('Sending check prompt:', fullPrompt);

			// Send the actual prompt in the background
			sendMessageInternal(fullPrompt);
		});
	};

	const requestSolution = () => {
		// Show only "Ratkaisu" in chat, but send the full prompt to API
		const displayMessage: Message = { role: "user", content: "Ratkaisu" };
		setMessages(prev => [...prev, displayMessage]);
		setIsLoading(true);
		setError(null);

		const solutionPrompt = "Anna täydellinen ratkaisu tälle tehtävälle. Näytä kaikki vaiheet selkeästi ja selitä mitä teet jokaisessa vaiheessa.";
		console.log('Sending solution prompt:', solutionPrompt);

		// Send the actual prompt in the background - this should give full solution
		sendMessageInternal(solutionPrompt);
	};

	// Internal function to send message without adding to chat display
	const sendMessageInternal = async (messageContent: string) => {
		try {
			// Get current editor content
			const currentEditorContent = editorRef.current?.getContent() || "";

			// Create the full conversation including the current message
			const fullConversation = [...messages, { role: "user", content: messageContent }];

			const response = await fetch('/api/math/coach/stream', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					taskId,
					editorContent: currentEditorContent,
					conversation: fullConversation, // Include the current message
					isInitialMessage: false
				}),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			// Handle streaming response
			const reader = response.body?.getReader();
			if (!reader) {
				throw new Error('No response body');
			}

			let assistantMessage = "";
			setMessages(prev => [...prev, { role: "assistant", content: assistantMessage }]);

			const decoder = new TextDecoder();
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value);
				console.log('Raw chunk:', chunk); // Debug log
				
				const lines = chunk.split('\n');
				
				for (const line of lines) {
					if (line.startsWith('data: ')) {
						const data = line.slice(6);
						console.log('Data line:', data); // Debug log
						
						if (data === '[DONE]') break;
						
						try {
							const parsed = JSON.parse(data);
							console.log('Parsed data:', parsed); // Debug log
							
							// Handle OpenAI streaming format
							if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
								const content = parsed.choices[0].delta.content;
								assistantMessage += content;
								setMessages(prev => {
									const newMessages = [...prev];
									if (newMessages.length > 0) {
										newMessages[newMessages.length - 1] = {
											...newMessages[newMessages.length - 1],
											content: assistantMessage
										};
									}
									return newMessages;
								});
							}
						} catch (e) {
							console.log('Parse error for line:', data, e); // Debug log
							// Ignore parsing errors for incomplete JSON
						}
					}
				}
			}
		} catch (err) {
			console.error('Chat error:', err);
			setError(err instanceof Error ? err.message : 'An error occurred');
			setMessages(prev => [...prev, { 
				role: "assistant", 
				content: "Pahoittelut, tapahtui virhe. Yritä uudelleen." 
			}]);
		} finally {
			setIsLoading(false);
		}
	};

	// Handle form submission
	const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		console.log('Form submitted with input:', input);
		sendMessage(input);
	};

	// Handle key press for Enter
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			console.log('Enter key pressed, sending message:', input);
			sendMessage(input);
		}
	};

	return (
		<div className="flex flex-col h-full overflow-hidden text-xs md:text-sm" style={{ overflow: 'hidden' }}>
			{/* Messages */}
			<div className="flex-1 overflow-y-auto min-h-0 p-4" style={{
				direction: 'rtl',
				scrollbarWidth: 'thin',
				scrollbarColor: 'rgba(59, 130, 246, 0.3) transparent'
			}}>
				<div style={{ direction: 'ltr' }}>
					{messages.map((msg, idx) => (
						<div key={idx} className="py-4">
							<div className="max-w-4xl mx-auto px-4">
								{msg.role === "assistant" ? (
									<div className="flex gap-3">
										{/* Avatar */}
										<div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 bg-blue-600 text-white">
											AI
										</div>
										
										{/* Message content */}
										<div className="flex-1 min-w-0 pt-1">
											<div className="text-sm leading-relaxed text-gray-900">
												<div className="whitespace-pre-wrap text-gray-900">
													{renderMessageContent(msg.content)}
												</div>
											</div>
										</div>
									</div>
								) : (
									<div className="flex justify-end">
										<div className="max-w-md">
											<div className="bg-blue-50/50 backdrop-blur-sm border border-blue-200/50 rounded-lg px-4 py-3">
												<div className="text-sm leading-relaxed text-gray-900 whitespace-pre-wrap">
													{msg.content}
												</div>
											</div>
										</div>
									</div>
								)}
							</div>
						</div>
					))}
					
					{/* Loading indicator */}
					{isLoading && (
						<div className="py-4">
							<div className="max-w-4xl mx-auto px-4">
								<div className="flex gap-3">
									<div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
										AI
									</div>
									<div className="flex-1 pt-1">
										<div className="flex space-x-1">
											<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
											<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
											<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
										</div>
									</div>
								</div>
							</div>
						</div>
					)}

					{/* Error message */}
					{error && (
						<div className="py-4">
							<div className="max-w-4xl mx-auto px-4">
								<div className="bg-red-50/50 backdrop-blur-sm border border-red-200/50 rounded-lg px-4 py-3">
									<div className="text-sm text-red-800">
										Virhe: {error}
									</div>
								</div>
							</div>
						</div>
					)}
					
					{/* Invisible spacer to allow scrolling to user messages */}
					<div className="h-64"></div>
				</div>
			</div>
			
			{/* Input area */}
			<div className="flex-shrink-0 p-4">
				<div className="max-w-4xl mx-auto">
					{/* Action buttons */}
					<div className="mb-3 flex gap-3">
						<button
							onClick={requestHint}
							disabled={isLoading}
							className="inline-flex items-center gap-2 px-3 py-1.5 text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
						>
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
							</svg>
							Vihje
						</button>
						<button
							onClick={requestFormulas}
							disabled={isLoading}
							className="inline-flex items-center gap-2 px-3 py-1.5 text-orange-600 hover:text-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
						>
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
							</svg>
							Kaavat
						</button>
						<button
							onClick={checkSolution}
							disabled={isLoading}
							className="inline-flex items-center gap-2 px-3 py-1.5 text-green-600 hover:text-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
						>
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							Tarkista
						</button>
						<button
							onClick={requestSolution}
							disabled={isLoading}
							className="inline-flex items-center gap-2 px-3 py-1.5 text-purple-600 hover:text-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
						>
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
							</svg>
							Ratkaisu
						</button>
					</div>
					
					<form onSubmit={onSubmit} className="relative">
						<textarea
							ref={textareaRef}
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={handleKeyDown}
							className="w-full resize-none rounded-full border border-white/40 bg-white/50 backdrop-blur-sm px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm shadow-sm"
							placeholder="Kysy mitä tahansa..."
							rows={1}
							style={{ height: "44px" }}
							disabled={isLoading}
						/>
						<button 
							type="submit"
							className="absolute right-2 bottom-2 p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
							disabled={isLoading || !input.trim()}
						>
							<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
							</svg>
						</button>
					</form>
				</div>
			</div>
		</div>
	);
} 