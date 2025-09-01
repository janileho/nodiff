"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Course } from "@/lib/course-data";
import { TaskV2 } from "@/lib/task-data-v2";
import type { CurrentUser } from "@/lib/auth";

interface AppClientProps {
	user: CurrentUser;
}

export default function AppClient({ user }: AppClientProps) {
	const [courses, setCourses] = useState<Course[]>([]);
	const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
	const [selectedSubject, setSelectedSubject] = useState<any>(null);
	const [tasks, setTasks] = useState<TaskV2[]>([]);
	const [loading, setLoading] = useState(false);
	const [subjectTaskCounts, setSubjectTaskCounts] = useState<{[key: string]: number}>({});
	const router = useRouter();

	// Load courses on component mount
	useEffect(() => {
		loadCourses();
	}, []);

	const loadCourses = async () => {
		try {
			const response = await fetch('/api/admin/courses');
			if (response.ok) {
				const data = await response.json();
				setCourses(data.courses || []);
			}
		} catch (error) {
			console.error("Error loading courses:", error);
		}
	};

	const loadSubjectTaskCounts = async (courseId: string) => {
		try {
			const response = await fetch(`/api/admin/tasks2?course_id=${courseId}&status=published`);
			if (response.ok) {
				const data = await response.json();
				const tasks = data.tasks || [];
				
				// Count tasks per subject
				const counts: {[key: string]: number} = {};
				tasks.forEach((task: TaskV2) => {
					if (task.subject_id) {
						counts[task.subject_id] = (counts[task.subject_id] || 0) + 1;
					}
				});
				
				setSubjectTaskCounts(counts);
			}
		} catch (error) {
			console.error("Error loading subject task counts:", error);
		}
	};

	const handleCourseSelect = (course: Course) => {
		setSelectedCourse(course);
		setSelectedSubject(null);
		setTasks([]);
		loadSubjectTaskCounts(course.id);
	};

	const handleSubjectSelect = async (subject: any) => {
		setSelectedSubject(subject);
		setLoading(true);
		
		try {
			// Load tasks2 for this subject
			const response = await fetch(`/api/admin/tasks2?subject_id=${subject.id}&status=published`);
			if (response.ok) {
				const data = await response.json();
				const tasks = data.tasks || [];
				
				// Sort tasks by difficulty (easy to hard) and then by task_id
				const sortedTasks = tasks.sort((a: TaskV2, b: TaskV2) => {
					// Define difficulty order: helppo -> keskitaso -> haastava
					const difficultyOrder: { [key: string]: number } = { 'helppo': 1, 'keskitaso': 2, 'haastava': 3 };
					const aDifficulty = difficultyOrder[a.difficulty] || 2;
					const bDifficulty = difficultyOrder[b.difficulty] || 2;
					
					if (aDifficulty !== bDifficulty) {
						return aDifficulty - bDifficulty;
					}
					
					// If same difficulty, sort by task_id
					const aNum = parseInt(a.task_id.replace(/\D/g, ''));
					const bNum = parseInt(b.task_id.replace(/\D/g, ''));
					return aNum - bNum;
				});
				
				setTasks(sortedTasks);
			}
		} catch (error) {
			console.error("Error loading tasks:", error);
			setTasks([]);
		} finally {
			setLoading(false);
		}
	};

	const handleTaskSelect = (taskId: string) => {
		router.push(`/app/math/solve/task/${taskId}`);
	};

	const handleBackToCourses = () => {
		setSelectedCourse(null);
		setSelectedSubject(null);
		setTasks([]);
	};

	const handleBackToSubjects = () => {
		setSelectedSubject(null);
		setTasks([]);
	};

	// Show subjects view
	if (selectedCourse && !selectedSubject) {
		return (
			<div className="h-full bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-100 overflow-hidden">
				<div className="h-full max-w-4xl mx-auto px-4 py-8 overflow-y-auto">
					{/* Header */}
					<div className="text-center mb-8">
						<button
							onClick={handleBackToCourses}
							className="mb-4 text-blue-600 hover:text-blue-800 flex items-center justify-center mx-auto"
						>
							<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
							</svg>
							Takaisin kursseihin
						</button>
						<h1 className="text-3xl font-bold text-gray-900 mb-2">
							{selectedCourse.name}
						</h1>
						<p className="text-gray-600">
							Valitse aihe
						</p>
					</div>

					{/* Subjects Grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{selectedCourse.subjects.map((subject) => {
							const taskCount = subjectTaskCounts[subject.id] || 0;
							return (
								<button
									key={subject.id}
									onClick={() => handleSubjectSelect(subject)}
									className="p-6 bg-white/30 backdrop-blur-sm border border-white/40 rounded-xl hover:bg-white/40 transition-all duration-200 shadow-lg text-left"
								>
									<h3 className="text-lg font-semibold text-gray-900 mb-2">
										{subject.name}
									</h3>
									<p className="text-sm text-gray-500 font-medium mb-1">
										Tehtäviä: {taskCount}
									</p>
									<p className="text-sm text-gray-500 italic">
										tulossa...
									</p>
								</button>
							);
						})}
					</div>
				</div>
			</div>
		);
	}

	// Show tasks view
	if (selectedCourse && selectedSubject) {
		return (
			<div className="h-full bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-100 overflow-hidden">
				<div className="h-full max-w-4xl mx-auto px-4 py-8 overflow-y-auto">
					{/* Header */}
					<div className="text-center mb-8">
						<button
							onClick={handleBackToSubjects}
							className="mb-4 text-blue-600 hover:text-blue-800 flex items-center justify-center mx-auto"
						>
							<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
							</svg>
							Takaisin aiheisiin
						</button>
						<h1 className="text-3xl font-bold text-gray-900 mb-2">
							{selectedSubject.name}
						</h1>
						<p className="text-sm text-gray-500 italic">
							tulossa: teoria, kaavat, testit...
						</p>
					</div>

					{/* Tasks */}
					{loading ? (
						<div className="text-center py-8">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
							<p className="mt-2 text-gray-600">Ladataan tehtäviä...</p>
						</div>
					) : tasks.filter(task => task.question && task.task_id).length > 0 ? (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{tasks.filter(task => task.question && task.task_id).map((task, index) => (
								<button
									key={task.task_id}
									onClick={() => handleTaskSelect(task.task_id)}
									className="p-4 bg-white/30 backdrop-blur-sm border border-white/40 rounded-lg hover:bg-white/40 transition-all duration-200 shadow-lg text-left"
								>
									<div className="flex justify-between items-start mb-2">
										<span className="text-sm font-medium text-gray-500">
											Tehtävä {index + 1}
										</span>
										<span className={`px-2 py-1 text-xs font-semibold rounded-full ${
											task.difficulty === 'helppo' ? 'bg-green-100 text-green-800' :
											task.difficulty === 'keskitaso' ? 'bg-yellow-100 text-yellow-800' :
											'bg-red-100 text-red-800'
										}`}>
											{task.difficulty}
										</span>
									</div>
									<h3 className="text-sm font-medium text-gray-900 mb-1">
										{(task.question || 'No question').substring(0, 100)}...
									</h3>
								</button>
							))}
						</div>
					) : (
						<div className="text-center py-8">
							<p className="text-gray-600">Ei tehtäviä tälle aiheelle.</p>
						</div>
					)}
				</div>
			</div>
		);
	}

	// Main courses view
	return (
		<div className="h-full bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-100 overflow-hidden">
			<div className="h-full max-w-4xl mx-auto px-4 py-8 overflow-y-auto">
				{/* Welcome Header */}
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold text-gray-900 mb-2">
						Matematiikka
					</h1>
					<p className="text-gray-600">
						Valitse kurssi ja aloita
					</p>
				</div>

				{/* Courses Grid */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{courses.map((course) => (
						<button
							key={course.id}
							onClick={() => handleCourseSelect(course)}
							className="p-6 bg-white/30 backdrop-blur-sm border border-white/40 rounded-xl hover:bg-white/40 transition-all duration-200 shadow-lg text-left"
						>
							<h3 className="text-lg font-semibold text-gray-900 mb-2">
								{course.name}
							</h3>
							<p className="text-sm text-gray-600">
								{course.description}
							</p>
						</button>
					))}
				</div>

				{courses.length === 0 && (
					<div className="text-center py-8">
						<p className="text-gray-600">Ei kursseja saatavilla.</p>
					</div>
				)}
			</div>
		</div>
	);
} 