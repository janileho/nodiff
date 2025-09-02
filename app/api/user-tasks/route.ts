import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getCurrentUserFromSession } from "@/lib/auth";

export const runtime = "nodejs";

type UserTask = {
  task_id: string;
  user_id: string;
  course_id: string;
  subject_id: string;
  question: string;
  solution_steps: string[];
  final_answer?: string;
  difficulty?: string;
  createdAt: number;
};

export async function GET(req: NextRequest) {
  const user = await getCurrentUserFromSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("course_id");
  const subjectId = searchParams.get("subject_id");

  try {
    const col = adminDb.collection("users").doc(user.uid).collection("tasks");
    const snap = await col.get();
    let tasks: UserTask[] = snap.docs.map(d => {
      const data = d.data() as any;
      const createdAtMs = (data.created_at as any)?.toMillis?.() || 0;
      return {
        task_id: data.task_id || d.id,
        user_id: user.uid,
        course_id: data.course_id,
        subject_id: data.subject_id,
        question: data.question,
        solution_steps: data.solution_steps || [],
        final_answer: data.final_answer,
        difficulty: data.difficulty,
        createdAt: createdAtMs,
      };
    });
    if (courseId) tasks = tasks.filter(t => t.course_id === courseId);
    if (subjectId) tasks = tasks.filter(t => t.subject_id === subjectId);
    tasks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return NextResponse.json({ tasks });
  } catch (e) {
    return NextResponse.json({ error: "Failed to load user tasks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUserFromSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const generateOnly = Boolean(body.generateOnly);

    // If steps provided, just save (no generation)
    if (Array.isArray(body.solution_steps) && body.question && body.course_id && body.subject_id) {
      const nextId = await getNextUserTaskId(user.uid);
      const newDoc = adminDb.collection("users").doc(user.uid).collection("tasks").doc(nextId);
      const now = new Date();
      const toSave = {
        task_id: nextId,
        question: String(body.question),
        solution_steps: (body.solution_steps as string[]).map(String),
        final_answer: body.final_answer ? String(body.final_answer) : "",
        difficulty: body.difficulty ? String(body.difficulty) : "keskitaso",
        course_id: String(body.course_id),
        subject_id: String(body.subject_id),
        scope: "user",
        created_at: now,
        updated_at: now,
      };
      await newDoc.set(toSave);
      return NextResponse.json({ task: toSave }, { status: 201 });
    }

    const question = String(body.question ?? "").trim();
    if (!question) {
      return NextResponse.json({ error: "Missing question" }, { status: 400 });
    }

    const { steps, answer } = await generateSteps(question);

    if (generateOnly) {
      return NextResponse.json({ solution_steps: steps, final_answer: answer }, { status: 200 });
    }

    const course_id = String(body.course_id ?? "").trim();
    const subject_id = String(body.subject_id ?? "").trim();
    const difficulty = body.difficulty ? String(body.difficulty) : undefined;
    if (!course_id || !subject_id) {
      return NextResponse.json({ error: "Missing course_id/subject_id" }, { status: 400 });
    }

    const nextId = await getNextUserTaskId(user.uid);
    const docRef = adminDb.collection("users").doc(user.uid).collection("tasks").doc(nextId);
    const now = new Date();
    const task: any = {
      task_id: nextId,
      question,
      solution_steps: steps,
      final_answer: answer || "",
      difficulty: difficulty || "keskitaso",
      course_id,
      subject_id,
      scope: "user",
      created_at: now,
      updated_at: now,
    };
    await docRef.set(task);
    return NextResponse.json({ task }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: "Failed to create user task" }, { status: 500 });
  }
}

async function generateSteps(question: string): Promise<{ steps: string[]; answer?: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      steps: [
        "Tulkitse tehtävä ja kirjoita tunnetut suureet.",
        "Muodosta yhtälö ja ratkaise vaiheittain.",
        "Yksinkertaista ja anna vastaus siistissä muodossa.",
      ],
      answer: undefined,
    };
  }

  const prompt = `Olet kokenut matematiikan opettaja. Saat käyttäjän oman tehtävän LaTeX- tai tavallisena tekstinä. Laadi ratkaisuun selkeät, lyhyet välivaiheet suomeksi (1–2 lausetta per vaihe). Anna lopuksi lyhyt lopullinen vastaus.\n\nPALAUTA VAIN PUHDAS JSON, EI SELITYKSIÄ, EI MARKDOWNIA:\n{\n  "solution_steps": ["vaihe 1", "vaihe 2", "..."],\n  "final_answer": "lopullinen vastaus"\n}\n\nTehtävä: ${question}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Palauta vain JSON pyydetyssä muodossa." },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    });
    const json = await res.json();
    let content: string = json.choices?.[0]?.message?.content ?? "";
    content = String(content).replace(/^```[a-z]*\n?|```$/gim, "").trim();

    let steps: string[] = [];
    let answer: string | undefined = undefined;
    try {
      const parsed = JSON.parse(content);
      steps = Array.isArray(parsed.solution_steps) ? parsed.solution_steps.map(String) : [];
      answer = parsed.final_answer ? String(parsed.final_answer) : undefined;
    } catch {
      try {
        const mSteps = content.match(/"solution_steps"\s*:\s*\[(.*?)\]/s);
        if (mSteps) {
          const inner = mSteps[1];
          steps = inner
            .split(/\n|,/)
            .map(s => s.replace(/^\s*\"?|\"?\s*$/g, "").trim())
            .filter(Boolean);
        }
        const mAns = content.match(/"final_answer"\s*:\s*\"([\s\S]*?)\"/);
        if (mAns) answer = mAns[1];
      } catch {}
    }
    steps = steps
      .map(s => s.replace(/^\s*[-*]\s*/, "").replace(/^\s*\d+\.?\s*/, "").replace(/[\s,]*$/g, "").trim())
      .filter(Boolean)
      .slice(0, 12);
    if (answer) answer = answer.replace(/^\s*[-*]\s*/, "").replace(/[\s,]*$/g, "").trim();
    if (steps.length === 0) {
      steps = [
        "Kirjoita annetut tiedot ylös.",
        "Muodosta ratkaiseva yhtälö ja eristä tuntematon.",
        "Laske ja yksinkertaista lopputulos.",
      ];
    }
    return { steps, answer };
  } catch {
    return {
      steps: [
        "Tulkitse tehtävä ja muodosta ratkaisuaskelmat.",
        "Ratkaise yhtälö ja tarkista yksiköt.",
      ],
      answer: undefined,
    };
  }
}

async function getNextUserTaskId(uid: string): Promise<string> {
  // Generate sequential id: user_001, user_002 per user
  const snap = await adminDb.collection("users").doc(uid).collection("tasks").select("task_id").get();
  let max = 0;
  snap.docs.forEach(d => {
    const data = d.data() as any;
    const id = (data.task_id as string) || d.id;
    const m = id?.match(/^user_(\d+)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!isNaN(n)) max = Math.max(max, n);
    }
  });
  const next = max + 1;
  return `user_${String(next).padStart(3, '0')}`;
}
