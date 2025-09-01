import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromSession } from "@/lib/auth";
import { getSectionsByModule } from "@/lib/task-data";

export async function POST(request: NextRequest) {
	try {
		const user = await getCurrentUserFromSession();
		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await request.json();
		const { module, section, difficulty, task_type } = body;

		if (!module || !section || !difficulty) {
			return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
		}

		// Get section information
		let sectionInfo = null;
			if (module === "MAA5") {
		sectionInfo = getSectionsByModule(module).find((s: any) => s.id === section);
	}

		if (!sectionInfo) {
			return NextResponse.json({ error: "Invalid section" }, { status: 400 });
		}

		// Generate task using AI
		const generatedTask = await generateTaskWithAI(module, sectionInfo, difficulty, task_type);

		return NextResponse.json(generatedTask);
	} catch (error) {
		console.error("Error generating task:", error);
		return NextResponse.json({ error: "Failed to generate task" }, { status: 500 });
	}
}

async function generateTaskWithAI(module: string, section: any, difficulty: string, task_type: string = "verbal") {
	// Map difficulty to Finnish
	const difficultyMap = {
		"helppo": "helppo",
		"keskitaso": "keskitaso", 
		"haastava": "haastava"
	};

	const difficultyText = difficultyMap[difficulty as keyof typeof difficultyMap] || "keskitaso";

	// Create different prompts based on task type
	let prompt;
	
	if (task_type === "nonverbal") {
		prompt = `Luo nonverbal matematiikan tehtävä seuraaville tiedoille:

Moduuli: ${module}
Aihe: ${section.name}
Kuvaus: ${section.description}
Vaikeustaso: ${difficultyText}

TÄRKEÄÄ: Tämä on NONVERBAL tehtävä. Tehtävän kysymys saa sisältää AINOASTAAN matemaattisia lausekkeita, yhtälöitä tai kaavoja. EI SAA olla sanoja, selityksiä tai tekstiä.

Vastaa JSON-muodossa seuraavalla rakenteella:
{
  "question": "Pelkkä matemaattinen lauseke tai yhtälö, EI sanoja",
  "solution_steps": ["Vaihe 1", "Vaihe 2", "Vaihe 3", "Vaihe 4", "Vaihe 5", "Vaihe 6", "Vaihe 7", "Vaihe 8", ...],
  "final_answer": "Lopullinen vastaus",
  "hints": ["Vihje 1", "Vihje 2"],
  "common_mistakes": ["Yleinen virhe 1", "Yleinen virhe 2"]
}

TÄRKEÄÄ RATKAISUVASTAUKSESTA:
- Sisällytä JOKAINEN välivaihe, ei missään tapauksessa ohita mitään
- Monimutkaisille operaatioille (integraalit, derivaatat, trigonometria) sisällytä KAIKKI välivaiheet
- Jokainen vaihe on selkeä ja yksittäinen operaatio
- ÄLÄ yhdistä useita vaiheita yhteen
- Esimerkiksi derivaatassa: "d/dx(x^2 + 3x) = d/dx(x^2) + d/dx(3x) = 2x + 3"
- Esimerkiksi integraalissa: "∫(2x+3)dx = ∫2x dx + ∫3 dx = 2∫x dx + 3∫1 dx = 2(x²/2) + 3x + C = x² + 3x + C"
- Esimerkiksi yhtälön ratkaisussa: "2x + 3 = 11 → 2x = 11 - 3 → 2x = 8 → x = 8/2 → x = 4"

ESIMERKKEJÄ nonverbal kysymyksistä:
- "2x + 3 = 11"
- "\\frac{x}{2} + 5 = 8"
- "x^2 - 4 = 0"
- "\\sqrt{x} = 3"
- "\\int (2x + 3) dx"
- "\\frac{d}{dx}(x^2 + 3x)"

EI SAA olla:
- "Ratkaise yhtälö: 2x + 3 = 11"
- "Mikä on x:n arvo kun 2x + 3 = 11?"

Vastaa vain JSON-muodossa, ilman ylimääräisiä selityksiä.`;
	} else {
		// Verbal task (original prompt)
		prompt = `Luo matematiikan tehtävä seuraaville tiedoille:

Moduuli: ${module}
Aihe: ${section.name}
Kuvaus: ${section.description}
Vaikeustaso: ${difficultyText}

Vastaa JSON-muodossa seuraavalla rakenteella:
{
  "question": "Tehtävän kysymys suomeksi",
  "solution_steps": ["Vaihe 1", "Vaihe 2", "Vaihe 3", "Vaihe 4", "Vaihe 5", "Vaihe 6", "Vaihe 7", "Vaihe 8", ...],
  "final_answer": "Lopullinen vastaus",
  "hints": ["Vihje 1", "Vihje 2"],
  "common_mistakes": ["Yleinen virhe 1", "Yleinen virhe 2"]
}

TÄRKEÄÄ RATKAISUVASTAUKSESTA:
- Sisällytä JOKAINEN välivaihe, ei missään tapauksessa ohita mitään
- Monimutkaisille operaatioille (integraalit, derivaatat, trigonometria) sisällytä KAIKKI välivaiheet
- Jokainen vaihe on selkeä ja yksittäinen operaatio
- ÄLÄ yhdistä useita vaiheita yhteen
- Esimerkiksi derivaatassa: "d/dx(x^2 + 3x) = d/dx(x^2) + d/dx(3x) = 2x + 3"
- Esimerkiksi integraalissa: "∫(2x+3)dx = ∫2x dx + ∫3 dx = 2∫x dx + 3∫1 dx = 2(x²/2) + 3x + C = x² + 3x + C"
- Esimerkiksi yhtälön ratkaisussa: "2x + 3 = 11 → 2x = 11 - 3 → 2x = 8 → x = 8/2 → x = 4"

Tehtävän tulee olla:
- Sopivaa vaikeustasoa (${difficultyText})
- Selkeä ja ymmärrettävä
- Sisältää riittävästi haastetta
- Ratkaistavissa annetuilla tiedoilla

Vastaa vain JSON-muodossa, ilman ylimääräisiä selityksiä.`;
	}

	try {
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
						content: "Olet matematiikan opettaja, joka luo laadukkaita matematiikan tehtäviä. Vastaa aina JSON-muodossa ja sisällytä KAIKKI välivaiheet ratkaisuun."
					},
					{
						role: "user",
						content: prompt
					}
				],
				max_tokens: 2000,
				temperature: 0.3,
			}),
		});

		if (!response.ok) {
			throw new Error(`OpenAI API error: ${response.status}`);
		}

		const data = await response.json();
		const content = data.choices[0]?.message?.content;

		if (!content) {
			throw new Error("No content received from AI");
		}

		// Parse JSON response
		try {
			const parsed = JSON.parse(content);
			return {
				question: parsed.question || "Tehtävä",
				solution_steps: parsed.solution_steps || ["Ratkaisu"],
				final_answer: parsed.final_answer || "Vastaus",
				hints: parsed.hints || ["Vihje"],
				common_mistakes: parsed.common_mistakes || ["Virhe"]
			};
		} catch (parseError) {
			// Fallback if JSON parsing fails
			return {
				question: "Ratkaise yhtälö: 2x + 3 = 11",
				solution_steps: [
					"2x + 3 = 11",
					"2x = 11 - 3",
					"2x = 8",
					"x = 8 / 2",
					"x = 4"
				],
				final_answer: "x = 4",
				hints: ["Muista siirtää vakiot yhtälön toiselle puolelle"],
				common_mistakes: ["Väärä merkki vakion siirrossa"]
			};
		}
	} catch (error) {
		console.error("AI generation error:", error);
		// Return fallback content
		return {
			question: "Ratkaise yhtälö: 2x + 3 = 11",
			solution_steps: [
				"2x + 3 = 11",
				"2x = 11 - 3", 
				"2x = 8",
				"x = 8 / 2",
				"x = 4"
			],
			final_answer: "x = 4",
			hints: ["Muista siirtää vakiot yhtälön toiselle puolelle"],
			common_mistakes: ["Väärä merkki vakion siirrossa"]
		};
	}
} 