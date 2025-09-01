import { adminDb } from "@/lib/firebase/admin";
import { createMathTutorSystemPrompt, createMathTutorUserMessage } from "@/lib/prompts/math-tutor-backup";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { taskId, editorContent, conversation, isInitialMessage } = await req.json();

    console.log('API received:', { taskId, editorContent, conversation, isInitialMessage });

    // Fetch task data from Firebase
    let taskDoc = await adminDb.collection('tasks2').doc(taskId).get();
    let taskData: any;
    
    if (!taskDoc.exists) {
      // Fall back to original tasks collection
      const originalTaskDoc = await adminDb.collection('tasks')
        .where('task_id', '==', taskId)
        .limit(1)
        .get();
      
      if (originalTaskDoc.empty) {
        return new Response('Task not found', { status: 404 });
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

    if (!taskData) {
      return new Response('Task data not found', { status: 404 });
    }

    // Get the last user message from conversation
    const lastUser = conversation?.[conversation.length - 1]?.content || "";

    console.log('Last user message:', lastUser);
    console.log('Editor content:', editorContent);

    // Create system and user prompts
    const systemPrompt = createMathTutorSystemPrompt({
      isInitialMessage,
      taskData
    });

    const userMessage = createMathTutorUserMessage({
      taskData,
      editorContent,
      lastUserMessage: lastUser,
      isInitialMessage
    });

    console.log('System prompt:', systemPrompt);
    console.log('User message:', userMessage);
    console.log('Last user message:', lastUser);

    // Use OpenAI streaming API directly
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        stream: true,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    console.log('Streaming response...');
    
    // Return the streaming response directly
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
} 