export interface TaskV2 {
  task_id: string;
  question: string;
  solution_steps: string[];
  final_answer: string;
  difficulty: "helppo" | "keskitaso" | "haastava";
  course_id: string;
  subject_id: string;
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
- ID: ${taskData.task_id}
- Kysymys: ${taskData.question}
- Vaikeustaso: ${taskData.difficulty}

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
  
  if (!task.difficulty) {
    errors.push("Difficulty level is required");
  }
  
  if (!task.course_id) {
    errors.push("Course is required");
  }
  if (!task.subject_id) {
    errors.push("Subject is required");
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

 