import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { createMathTutorSystemPrompt, createMathTutorUserMessage } from "@/lib/prompts/math-tutor-backup";

export async function POST(req: NextRequest) {
	const body = await req.json();
	const taskId = String(body.taskId ?? "eq_001");
	const editorContent = String(body.editorContent ?? "");
	const conversation = body.conversation as Array<{ role: string; content: string }>;
	const isInitialMessage = Boolean(body.isInitialMessage ?? false);

	// Get the last user message
	const lastUser = [...conversation].reverse().find((m) => m.role === "user")?.content ?? "";

	// Get task data directly from Firebase
	let taskData: any;
	try {
		// Try tasks2 first, then fall back to original tasks
		let taskDoc = await adminDb.collection("tasks2").doc(taskId).get();
		
		if (!taskDoc.exists) {
			// Fall back to original tasks collection
			const originalTaskDoc = await adminDb.collection("tasks")
				.where('task_id', '==', taskId)
				.limit(1)
				.get();
			
			if (originalTaskDoc.empty) {
				return NextResponse.json({
					reply: "Tehtävää ei löytynyt."
				}, { status: 404 });
			}
			
			const doc = originalTaskDoc.docs[0];
			taskData = {
				id: doc.id,
				...doc.data()
			};
		} else {
			// Use tasks2 data
			const data = taskDoc.data();
			taskData = {
				id: taskDoc.id,
				...data
			};
		}
	} catch (error) {
		console.error("Error fetching task data:", error);
		return NextResponse.json({
			reply: "Virhe haettaessa tehtävän tietoja."
		}, { status: 500 });
	}

	try {
		// Single agent: Math tutor with LaTeX knowledge
		const response = await fetch("https://api.openai.com/v1/chat/completions", {
			method: "POST",
			headers: {
				"Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: "gpt-4o-mini",
				messages: [
					{
						role: "system",
						content: createMathTutorSystemPrompt({ isInitialMessage, taskData })
					},
					{
						role: "user",
						content: createMathTutorUserMessage({ 
							taskData, 
							editorContent, 
							lastUserMessage: lastUser, 
							isInitialMessage 
						})
					}
				],
				max_tokens: 1000,
				temperature: 0.3,
				tools: [
					{
						type: "function",
						function: {
							name: "calculate",
							description: "Calculate mathematical expressions and equations",
							parameters: {
								type: "object",
								properties: {
									expression: {
										type: "string",
										description: "The mathematical expression to calculate (e.g., '2 + 3', 'sqrt(16)', 'sin(pi/2)')"
									}
								},
								required: ["expression"]
							}
						}
					}
				],
				tool_choice: "auto"
			}),
		});

		if (!response.ok) {
			throw new Error(`OpenAI API error: ${response.status}`);
		}

		const data = await response.json();
		let reply = data.choices[0]?.message?.content ?? "Pahoittelut, en pysty vastaamaan juuri nyt.";

		// Handle calculator tool calls
		if (data.choices[0]?.message?.tool_calls) {
			const toolCalls = data.choices[0].message.tool_calls;
			const messages = [
				{
					role: "system",
					content: createMathTutorSystemPrompt({ isInitialMessage, taskData })
				},
				{
					role: "user",
					content: createMathTutorUserMessage({ 
						taskData, 
						editorContent, 
						lastUserMessage: lastUser, 
						isInitialMessage 
					})
				},
				data.choices[0].message
			];

			// Process calculator tool calls
			for (const toolCall of toolCalls) {
				if (toolCall.function.name === "calculate") {
					try {
						const args = JSON.parse(toolCall.function.arguments);
						const expression = args.expression;
						
						const safeExpression = expression
							.replace(/sqrt/g, 'Math.sqrt')
							.replace(/sin/g, 'Math.sin')
							.replace(/cos/g, 'Math.cos')
							.replace(/tan/g, 'Math.tan')
							.replace(/log/g, 'Math.log')
							.replace(/pi/g, 'Math.PI')
							.replace(/e/g, 'Math.E');
						
						const result = eval(safeExpression);
						
						messages.push({
							role: "tool",
							tool_call_id: toolCall.id,
							content: result.toString()
						});
						
						console.log(`Calculator: ${expression} = ${result}`);
					} catch (error) {
						console.error("Calculator error:", error);
						messages.push({
							role: "tool",
							tool_call_id: toolCall.id,
							content: "Error: Could not calculate expression"
						});
					}
				}
			}

			// Get final response with calculations
			const finalResponse = await fetch("https://api.openai.com/v1/chat/completions", {
				method: "POST",
				headers: {
					"Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					model: "gpt-4o-mini",
					messages: messages,
					max_tokens: 1000,
					temperature: 0.3,
				}),
			});

			if (finalResponse.ok) {
				const finalData = await finalResponse.json();
				reply = finalData.choices[0]?.message?.content ?? reply;
			}
		}

		return NextResponse.json({
			reply: reply
		});

	} catch (error) {
		console.error("Math coach error:", error);
		return NextResponse.json({
			reply: "Pahoittelut, tapahtui virhe. Yritä uudelleen."
		}, { status: 500 });
	}
} 