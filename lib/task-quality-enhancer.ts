import type { TaskData } from "./task-data";
import type { TaskQualityMetrics } from "./task-quality-validator";

export interface TaskImprovementResult {
  improvedTask: TaskData;
  improvements: string[];
  qualityBefore: number;
  qualityAfter: number;
}

export class TaskQualityEnhancer {
  static async enhanceTaskQuality(
    task: TaskData, 
    metrics: TaskQualityMetrics, 
    section: any
  ): Promise<TaskImprovementResult> {
    const qualityBefore = metrics.overallQuality;
    
    // If quality is already good, return as is
    if (qualityBefore >= 0.8) {
      return {
        improvedTask: task,
        improvements: ["Task quality already high"],
        qualityBefore,
        qualityAfter: qualityBefore
      };
    }

    // Generate improvement prompt
    const improvementPrompt = this.createImprovementPrompt(task, metrics, section);
    
    try {
      // Call AI to improve the task
      const improvedTask = await this.callAIForImprovement(improvementPrompt);
      
      // Validate the improved task
      const improvedMetrics = await this.validateImprovedTask(improvedTask, section);
      const qualityAfter = improvedMetrics.overallQuality;

      return {
        improvedTask,
        improvements: this.generateImprovementList(metrics, improvedMetrics),
        qualityBefore,
        qualityAfter
      };
    } catch (error) {
      console.error("Task improvement failed:", error);
      
      // Return original task if improvement fails
      return {
        improvedTask: task,
        improvements: ["Improvement failed, using original task"],
        qualityBefore,
        qualityAfter: qualityBefore
      };
    }
  }

  private static createImprovementPrompt(
    task: TaskData, 
    metrics: TaskQualityMetrics, 
    section: any
  ): string {
    const issues = metrics.issues.join(', ');
    const suggestions = this.generateSuggestions(metrics);

    return `Paranna seuraavaa matematiikan tehtävää:

ALKUPERÄINEN TEHTÄVÄ:
${JSON.stringify(task, null, 2)}

LAATUMITTAUKSET:
- Matemaattinen tarkkuus: ${(metrics.mathematicalAccuracy * 100).toFixed(1)}%
- Rakenteellinen täydellisyys: ${(metrics.structuralCompleteness * 100).toFixed(1)}%
- Vaikeustason sopivuus: ${(metrics.difficultyAppropriateness * 100).toFixed(1)}%
- Sisällön relevanssi: ${(metrics.contentRelevance * 100).toFixed(1)}%
- Kokonaislaatu: ${(metrics.overallQuality * 100).toFixed(1)}%

ONGELMAT:
${issues}

PARANNETTAVAT ASPEKTIT:
${suggestions}

AIHE: ${section.name}
KUVaus: ${section.description}
VAIKEUSTASO: ${task.difficulty}

PARANNA TEHTÄVÄÄ SEURAAVIEN KRIITEERIEN MUKAAN:
1. Korjaa matemaattiset virheet ja epäjohdonmukaisuudet
2. Lisää puuttuvat välivaiheet ratkaisuun
3. Varmista vaikeustason sopivuus (${task.difficulty})
4. Varmista aiheen relevanssi (${section.name})
5. Tee ratkaisusta selkeämpi ja ymmärrettävämpi
6. Varmista että jokainen vaihe on loogisesti yhteydessä edelliseen
7. Tarkista että lopullinen vastaus on oikein ja perusteltu

RATKAISUVASTAUKSEN RAKENNE:
- Vaihe 1: Ongelman tunnistaminen ja strategian valinta
- Vaihe 2: Tarvittavien kaavojen ja sääntöjen soveltaminen
- Vaihe 3: Laskujen suorittaminen selkeästi
- Vaihe 4: Tulosten tarkistaminen ja validointi
- Vaihe 5: Lopullisen vastauksen esittäminen

Vastaa parannellulla tehtävällä JSON-muodossa seuraavalla rakenteella:
{
  "question": "Paranneltu kysymys",
  "solution_steps": ["Vaihe 1", "Vaihe 2", "Vaihe 3", "Vaihe 4", "Vaihe 5"],
  "final_answer": "Tarkka lopullinen vastaus",
  "hints": ["Hyödyllinen vihje 1", "Hyödyllinen vihje 2"],
  "common_mistakes": ["Yleinen virhe 1", "Yleinen virhe 2"]
}

Vastaa vain JSON-muodossa, ilman ylimääräisiä selityksiä.`;
  }

  private static generateSuggestions(metrics: TaskQualityMetrics): string[] {
    const suggestions: string[] = [];

    if (metrics.mathematicalAccuracy < 0.7) {
      suggestions.push("Korjaa matemaattiset virheet ja epäjohdonmukaisuudet");
      suggestions.push("Varmista että ratkaisuvaiheet ovat loogisesti yhteydessä toisiinsa");
      suggestions.push("Tarkista että lopullinen vastaus on oikein");
    }

    if (metrics.structuralCompleteness < 0.7) {
      suggestions.push("Lisää puuttuvat välivaiheet ratkaisuun");
      suggestions.push("Varmista että ratkaisu sisältää kaikki tarvittavat askeleet");
      suggestions.push("Tee ratkaisuvaiheet selkeämmiksi");
    }

    if (metrics.difficultyAppropriateness < 0.7) {
      suggestions.push("Sovita tehtävän vaikeustaso vastaamaan " + metrics.difficultyAppropriateness);
      suggestions.push("Lisää tai vähennä monimutkaisuutta tarpeen mukaan");
    }

    if (metrics.contentRelevance < 0.7) {
      suggestions.push("Varmista että tehtävä liittyy suoraan aiheeseen");
      suggestions.push("Käytä aiheeseen liittyviä käsitteitä ja kaavoja");
    }

    return suggestions;
  }

  private static async callAIForImprovement(prompt: string): Promise<TaskData> {
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
            content: "Olet matematiikan opettaja, joka parantaa matematiikan tehtäviä. Vastaa aina JSON-muodossa ja varmista että kaikki matemaattiset laskut ja kaavat ovat oikeita. Tehtävän tulee olla selkeä, ymmärrettävä ja sopivaa vaikeustasoa."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.2, // Lower temperature for more consistent improvements
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
        task_id: "", // Will be set by caller
        module: "", // Will be set by caller
        section: "", // Will be set by caller
        question: parsed.question || "",
        solution_steps: parsed.solution_steps || [],
        final_answer: parsed.final_answer || "",
        difficulty: "keskitaso", // Default value
        task_type: "verbal", // Default value
        category: "", // Will be set by caller
        hints: parsed.hints || [],
        common_mistakes: parsed.common_mistakes || []
      };
    } catch (parseError) {
      throw new Error("Failed to parse AI response as JSON");
    }
  }

  private static async validateImprovedTask(task: TaskData, section: any): Promise<TaskQualityMetrics> {
    // Import here to avoid circular dependency
    const { TaskQualityValidator } = await import("./task-quality-validator");
    return TaskQualityValidator.validateGeneratedTask(task, section);
  }

  private static generateImprovementList(
    beforeMetrics: TaskQualityMetrics, 
    afterMetrics: TaskQualityMetrics
  ): string[] {
    const improvements: string[] = [];

    if (afterMetrics.mathematicalAccuracy > beforeMetrics.mathematicalAccuracy) {
      improvements.push("Matemaattinen tarkkuus parannettu");
    }

    if (afterMetrics.structuralCompleteness > beforeMetrics.structuralCompleteness) {
      improvements.push("Rakenteellinen täydellisyys parannettu");
    }

    if (afterMetrics.difficultyAppropriateness > beforeMetrics.difficultyAppropriateness) {
      improvements.push("Vaikeustason sopivuus parannettu");
    }

    if (afterMetrics.contentRelevance > beforeMetrics.contentRelevance) {
      improvements.push("Sisällön relevanssi parannettu");
    }

    if (improvements.length === 0) {
      improvements.push("Laatu pysyi samana");
    }

    return improvements;
  }

  // Public method to enhance task with retry logic
  static async enhanceTaskWithRetry(
    task: TaskData, 
    metrics: TaskQualityMetrics, 
    section: any,
    maxRetries: number = 2
  ): Promise<TaskImprovementResult> {
    let currentTask = task;
    let currentMetrics = metrics;
    let attempts = 0;

    while (attempts < maxRetries && currentMetrics.overallQuality < 0.7) {
      try {
        const result = await this.enhanceTaskQuality(currentTask, currentMetrics, section);
        
        // If improvement was successful, use the improved task
        if (result.qualityAfter > currentMetrics.overallQuality) {
          currentTask = result.improvedTask;
          currentMetrics = await this.validateImprovedTask(currentTask, section);
        }

        attempts++;
      } catch (error) {
        console.error(`Improvement attempt ${attempts + 1} failed:`, error);
        attempts++;
      }
    }

    return {
      improvedTask: currentTask,
      improvements: [`Enhanced after ${attempts} attempts`],
      qualityBefore: metrics.overallQuality,
      qualityAfter: currentMetrics.overallQuality
    };
  }
} 