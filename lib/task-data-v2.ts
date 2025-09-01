export interface TaskV2 {
  // Core task data - same as original TaskData
  task_id: string; // Primary identifier (e.g., eq_001, eq_002)
  module: string;
  section: string;
  question: string;
  solution_steps: string[];
  final_answer: string;
  difficulty: "helppo" | "keskitaso" | "haastava";
  task_type: "verbal" | "nonverbal";
  category: string;
  
  // Optional fields - same as original TaskData
  exam_year?: number;
  exam_session?: string;
  time_limit?: number;
  hints?: string[];
  common_mistakes?: string[];
  status?: "draft" | "published" | "archived";
  created_at?: Date;
  updated_at?: Date;
  
  // Additional fields for Tasks V2
  course_id: string; // Course reference (new)
  subject_id: string; // Subject reference (new)
  created_by: string; // User ID (new)
  ai_generated: boolean; // AI flag (new)
}

export interface TaskGenerationRequestV2 {
  course_id: string;
  subject_id?: string;
  learning_objective_ids?: string[];
  difficulty: 'helppo' | 'keskitaso' | 'haastava';
  task_type: 'verbal' | 'nonverbal';
  count: number;
  example_task?: string;
}

export interface TaskGenerationResultV2 {
  success: boolean;
  tasks: TaskV2[];
  total_requested: number;
  total_generated: number;
  total_failed: number;
  errors?: string[];
  message?: string;
}

// Helper functions - same as original task-data.ts
export function getTaskQuestion(taskData: TaskV2): string {
  return taskData.question;
}

export function getTaskSolutionSteps(taskData: TaskV2): string[] {
  return taskData.solution_steps;
}

export function formatTaskDataForAI(taskData: TaskV2): string {
  return `
TEHTÄVÄN TIEDOT:
- Tyyppi: ${taskData.task_type}
- ID: ${taskData.task_id}
- Kysymys: ${taskData.question}
- Vaikeustaso: ${taskData.difficulty}
- Kategoria: ${taskData.category}
- Moduuli: ${taskData.module}
${taskData.exam_year ? `- Koevuosi: ${taskData.exam_year} ${taskData.exam_session}` : ''}
${taskData.hints && taskData.hints.length > 0 ? `- Vihjeet: ${taskData.hints.join(', ')}` : ''}
${taskData.common_mistakes && taskData.common_mistakes.length > 0 ? `- Yleiset virheet: ${taskData.common_mistakes.join(', ')}` : ''}

RATKAISU:
${taskData.solution_steps.map((step, index) => `${index + 1}. ${step}`).join('\n')}

LOPPULLINEN VASTAUS: ${taskData.final_answer}
`;
}

// Helper functions
export function createTaskV2Id(): string {
  return `task2_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function validateTaskV2(task: Partial<TaskV2>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!task.question || task.question.trim().length === 0) {
    errors.push("Question is required");
  }
  
  if (!task.solution_steps || task.solution_steps.length === 0) {
    errors.push("Solution steps are required");
  }
  
  if (!task.final_answer || task.final_answer.trim().length === 0) {
    errors.push("Final answer is required");
  }
  
  if (!task.module) {
    errors.push("Module is required");
  }
  
  if (!task.section) {
    errors.push("Section is required");
  }
  
  if (!task.difficulty) {
    errors.push("Difficulty level is required");
  }
  
  if (!task.task_type) {
    errors.push("Task type is required");
  }
  
  if (!task.category) {
    errors.push("Category is required");
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

 