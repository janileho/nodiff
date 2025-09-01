export interface LearningObjective {
  id: string;
  title: string;
  description: string;
}

export interface Subject {
  id: string;
  name: string;
  description: string;
  learning_objectives: LearningObjective[];
}

export interface Course {
  id: string;
  name: string;
  description: string;
  learning_objectives: LearningObjective[];
  subjects: Subject[];
  created_at: Date;
  updated_at: Date;
  status: 'active' | 'draft' | 'archived';
}


// Helper functions
export function getCourseById(courses: Course[], courseId: string): Course | undefined {
  return courses.find(course => course.id === courseId);
}

export function getSubjectById(course: Course, subjectId: string): Subject | undefined {
  return course.subjects.find(subject => subject.id === subjectId);
}

export function getAllSubjects(courses: Course[]): Subject[] {
  return courses.flatMap(course => course.subjects);
} 