import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
	const body = await req.json();
	const level = String(body.level ?? "perusteet");
	const basedOn = String(body.basedOn ?? "");

	const apiKey = process.env.OPENAI_API_KEY;
	if (!apiKey) {
		return NextResponse.json({
			problem: level === "perusteet" ? "Laske: 3x + 6 = 21. Ratkaise x." : "Ratkaise: x^2 - 5x + 6 = 0.",
		});
	}

	const prompt = `Luo yksi suomenkielinen matematiikan tehtävä LaTeX-muodossa tasolle: ${level}.
${basedOn ? `Tee samantapainen kuin: ${basedOn}` : ""}
Palauta vain varsinainen tehtäväteksti (ei ratkaisua), sopivalla LaTeX-merkinnällä.`;

	const res = await fetch("https://api.openai.com/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			model: "gpt-4o-mini",
			messages: [
				{ role: "system", content: "Olet matematiikan opettaja. Palauta tehtävät LaTeXissa." },
				{ role: "user", content: prompt },
			],
			temperature: 0.7,
			tools: [
				{
					type: "function",
					function: {
						name: "calculate",
						description: "Calculate mathematical expressions to verify problem difficulty",
						parameters: {
							type: "object",
							properties: {
								expression: {
									type: "string",
									description: "The mathematical expression to calculate"
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
	const json = await res.json();
	let problem = json?.choices?.[0]?.message?.content?.trim() || "Laske: 2x + 3 = 11.";

	// Handle tool calls for problem generation
	if (json.choices?.[0]?.message?.tool_calls) {
		const toolCalls = json.choices[0].message.tool_calls;
		const messages = [
			{ role: "system", content: "Olet matematiikan opettaja. Palauta tehtävät LaTeXissa." },
			{ role: "user", content: prompt },
			json.choices[0].message
		];

		// Add tool results
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
				} catch (error) {
					console.error("Calculator error in problem generation:", error);
					messages.push({
						role: "tool",
						tool_call_id: toolCall.id,
						content: "Error: Could not calculate expression"
					});
				}
			}
		}

		// Get final response with calculations
		const finalRes = await fetch("https://api.openai.com/v1/chat/completions", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				model: "gpt-4o-mini",
				messages: messages,
				temperature: 0.7,
			}),
		});

		if (finalRes.ok) {
			const finalJson = await finalRes.json();
			problem = finalJson?.choices?.[0]?.message?.content?.trim() || problem;
		}
	}
	return NextResponse.json({ problem });
} 