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

// Default course data for MAA5 (will be migrated to database)
export const defaultMAA5Course: Course = {
  id: 'MAA5',
  name: 'Matematiikka A5',
  description: 'Lukion matematiikan kurssi, joka käsittelee trigonometriaa, eksponentti- ja logaritmifunktioita sekä matemaattista mallintamista.',
  learning_objectives: [
    {
      id: 'obj_1',
      title: 'Trigonometristen funktioiden hallinta',
      description: 'Opiskelija osaa käyttää trigonometrisiä funktioita ja ymmärtää niiden ominaisuudet.'
    },
    {
      id: 'obj_2',
      title: 'Eksponentti- ja logaritmifunktiot',
      description: 'Opiskelija osaa ratkaista eksponentti- ja logaritmiyhtälöitä.'
    },
    {
      id: 'obj_3',
      title: 'Matemaattinen mallintaminen',
      description: 'Opiskelija osaa mallintaa reaalimaailman ilmiöitä matemaattisilla funktioilla.'
    }
  ],
  subjects: [
    {
      id: 'maa5_mathematical_modeling',
      name: 'Matemaattinen mallintaminen',
      description: 'Ilmiöiden mallintaminen trigonometrisilla ja eksponenttifunktioilla.',
      learning_objectives: [
        {
          id: 'sub_obj_1',
          title: 'Funktioiden mallintaminen',
          description: 'Osaa mallintaa ilmiöitä trigonometrisilla ja eksponenttifunktioilla.'
        }
      ]
    },
    {
      id: 'maa5_unit_circle',
      name: 'Yksikköympyrä',
      description: 'Trigonometristen funktioiden määrittely ja ominaisuudet yksikköympyrän avulla.',
      learning_objectives: [
        {
          id: 'sub_obj_2',
          title: 'Yksikköympyrän käyttö',
          description: 'Osaa määrittää trigonometristen funktioiden arvoja yksikköympyrän avulla.'
        }
      ]
    },
    {
      id: 'maa5_trigonometric_equations',
      name: 'Trigonometriset yhtälöt',
      description: 'Trigonometristen yhtälöiden ratkaiseminen.',
      learning_objectives: [
        {
          id: 'sub_obj_3',
          title: 'Yhtälöiden ratkaiseminen',
          description: 'Osaa ratkaista trigonometrisiä yhtälöitä.'
        }
      ]
    },
    {
      id: 'maa5_trigonometric_identities',
      name: 'Trigonometriset identiteetit',
      description: 'Trigonometristen identiteettien käyttö ja todistaminen.',
      learning_objectives: [
        {
          id: 'sub_obj_4',
          title: 'Identiteettien käyttö',
          description: 'Osaa käyttää ja todistaa trigonometrisiä identiteettejä.'
        }
      ]
    },
    {
      id: 'maa5_exponential_logarithmic',
      name: 'Eksponentti- ja logaritmifunktiot',
      description: 'Eksponentti- ja logaritmifunktioiden ominaisuudet ja laskusäännöt.',
      learning_objectives: [
        {
          id: 'sub_obj_5',
          title: 'Funktioiden ominaisuudet',
          description: 'Osaa käyttää eksponentti- ja logaritmifunktioiden laskusääntöjä.'
        }
      ]
    },
    {
      id: 'maa5_software_applications',
      name: 'Ohjelmistosovellukset',
      description: 'Eksponentti- ja logaritmiyhtälöiden ratkaiseminen.',
      learning_objectives: [
        {
          id: 'sub_obj_6',
          title: 'Yhtälöiden ratkaiseminen',
          description: 'Osaa ratkaista eksponentti- ja logaritmiyhtälöitä.'
        }
      ]
    }
  ],
  created_at: new Date(),
  updated_at: new Date(),
  status: 'active'
};

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