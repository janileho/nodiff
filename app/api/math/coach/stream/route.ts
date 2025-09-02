import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUserFromSession } from "@/lib/auth";
import { createMathTutorSystemPrompt, createMathTutorUserMessage } from "@/lib/prompts/math-tutor-backup";
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

export async function POST(req: NextRequest) {
	const body = await req.json();
	const taskId = String(body.taskId ?? "eq_001");
	const editorContent = String(body.editorContent ?? "");
	const conversation = (body.conversation as Array<{ role: string; content: string }>) || [];
	const isInitialMessage = Boolean(body.isInitialMessage ?? false);

	// Last user message
	const lastUser = [...conversation].reverse().find((m) => m.role === "user")?.content ?? "";

	// Resolve task data (user-scoped → tasks2 → legacy tasks)
	let taskData: any;
	try {
		const user = await getCurrentUserFromSession();
		if (user) {
			const userDoc = await adminDb
				.collection("users").doc(user.uid)
				.collection("tasks").doc(taskId)
				.get();
			if (userDoc.exists) {
				taskData = { id: userDoc.id, ...userDoc.data() };
			}
		}
		if (!taskData) {
			const v2Doc = await adminDb.collection("tasks2").doc(taskId).get();
			if (v2Doc.exists) {
				taskData = { id: v2Doc.id, ...v2Doc.data() };
			} else {
				const legacySnap = await adminDb
					.collection("tasks")
					.where("task_id", "==", taskId)
					.limit(1)
					.get();
				if (legacySnap.empty) {
					return new Response("data: {\"error\":\"not_found\"}\n\n", {
						status: 404,
						headers: { "Content-Type": "text/event-stream; charset=utf-8" },
					});
				}
				const doc = legacySnap.docs[0];
				taskData = { id: doc.id, ...doc.data() } as any;
			}
		}
	} catch (e) {
		return new Response("data: {\"error\":\"task_fetch_failed\"}\n\n", {
			status: 500,
			headers: { "Content-Type": "text/event-stream; charset=utf-8" },
		});
	}

	// Detect free chat vs structured math prompts (case-insensitive)
	const trimmed = lastUser.trim();
	const actionRegex = /^(vihje|kaavat|tarkista|ratkaisu)$/i;
	const keywordsRegex = /(täydellinen ratkaisu|palauta vain|tarkista ratkaisu|tehtävä:|ratkaise:)/i;
	const looksLikeStructured = isInitialMessage || actionRegex.test(trimmed) || keywordsRegex.test(trimmed);

	const system = looksLikeStructured
		? createMathTutorSystemPrompt({ isInitialMessage, taskData })
		: "Olet avulias keskusteluassistentti. Keskustele vapaasti käyttäjän kanssa. Vastaa suomeksi, ellei käyttäjä pyydä muuta.";

	const userMsg = looksLikeStructured
		? createMathTutorUserMessage({ taskData, editorContent, lastUserMessage: lastUser, isInitialMessage })
		: lastUser;

	// Build model messages
	let modelMessages: Array<{ role: "user" | "assistant"; content: string }> = [];
	if (looksLikeStructured) {
		modelMessages = [{ role: "user", content: userMsg }];
	} else {
		modelMessages = conversation
			.filter(m => m.role === "user" || m.role === "assistant")
			.map(m => ({ role: m.role as "user" | "assistant", content: String(m.content ?? "") }));
	}

	// Stream via Vercel AI SDK and wrap into OpenAI-compatible SSE deltas
	try {
		const result = await streamText({
			model: openai("gpt-4o-mini"),
			system,
			messages: modelMessages,
			maxOutputTokens: 1000,
			temperature: 0.3,
		});

		const encoder = new TextEncoder();
		const textStream = result.textStream;

		const stream = new ReadableStream({
			start(controller) {
				const reader = textStream.getReader();
				const pump = (): void => {
					reader.read().then(({ done, value }) => {
						if (done) {
							controller.enqueue(encoder.encode("data: [DONE]\n\n"));
							controller.close();
							return;
						}
						if (value) {
							const line = JSON.stringify({ choices: [{ delta: { content: value } }] });
							controller.enqueue(encoder.encode(`data: ${line}\n\n`));
						}
						pump();
					}).catch((err) => {
						controller.error(err);
					});
				};
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
	} catch (e) {
		return new Response("data: {\"error\":\"stream_failed\"}\n\n", {
			status: 500,
			headers: { "Content-Type": "text/event-stream; charset=utf-8" },
		});
	}
} 