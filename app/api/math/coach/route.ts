import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { createMathTutorSystemPrompt, createMathTutorUserMessage } from "@/lib/prompts/math-tutor-backup";
import { getCurrentUserFromSession } from "@/lib/auth";

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
		// Check user-scoped tasks first if session exists
		const user = await getCurrentUserFromSession();
		if (user) {
			const userDoc = await adminDb
				.collection("users").doc(user.uid)
				.collection("tasks").doc(taskId)
				.get();
			if (userDoc.exists) {
				const data = userDoc.data();
				taskData = { id: userDoc.id, ...data };
			}
		}
		// Fall back to global tasks2
		if (!taskData) {
			let taskDoc = await adminDb.collection("tasks2").doc(taskId).get();
			if (!taskDoc.exists) {
				// Fall back to original tasks collection
				const originalTaskDoc = await adminDb.collection("tasks")
					.where('task_id', '==', taskId)
					.limit(1)
					.get();
				if (originalTaskDoc.empty) {
					return NextResponse.json({ reply: "Tehtävää ei löytynyt." }, { status: 404 });
				}
				const doc = originalTaskDoc.docs[0];
				taskData = { id: doc.id, ...doc.data() };
			} else {
				const data = taskDoc.data();
				taskData = { id: taskDoc.id, ...data };
			}
		}
	} catch (error) {
		console.error("Error fetching task data:", error);
		return NextResponse.json({ reply: "Virhe haettaessa tehtävän tietoja." }, { status: 500 });
	}

	// Stream from OpenAI and proxy as SSE
	try {
		const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
			method: "POST",
			headers: {
				"Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: "gpt-4o-mini",
				messages: [
					{ role: "system", content: createMathTutorSystemPrompt({ isInitialMessage, taskData }) },
					{ role: "user", content: createMathTutorUserMessage({ taskData, editorContent, lastUserMessage: lastUser, isInitialMessage }) }
				],
				max_tokens: 1000,
				temperature: 0.3,
				stream: true,
			}),
		});

		if (!upstream.ok || !upstream.body) {
			throw new Error(`OpenAI API error: ${upstream.status}`);
		}

		const stream = new ReadableStream({
			start(controller) {
				const reader = upstream.body!.getReader();
				const encoder = new TextEncoder();

				const pump = () => {
					reader.read().then(({ done, value }) => {
						if (done) {
							controller.enqueue(encoder.encode("data: [DONE]\n\n"));
							controller.close();
							return;
						}
						if (value) {
							controller.enqueue(value);
						}
						pump();
					}).catch((err) => {
						console.error("SSE stream error:", err);
						controller.error(err);
					});
				};

				controller.enqueue(encoder.encode(": keep-alive\n\n"));
				pump();
			},
		});

		return new Response(stream, {
			status: 200,
			headers: {
				"Content-Type": "text/event-stream; charset=utf-8",
				"Cache-Control": "no-cache, no-transform",
				"Connection": "keep-alive",
				"Transfer-Encoding": "chunked",
			},
		});
	} catch (error) {
		console.error("Math coach error:", error);
		return new Response("data: {\"error\":\"stream_failed\"}\n\n", {
			status: 500,
			headers: {
				"Content-Type": "text/event-stream; charset=utf-8",
				"Cache-Control": "no-cache, no-transform",
				"Connection": "keep-alive",
			},
		});
	}
} 