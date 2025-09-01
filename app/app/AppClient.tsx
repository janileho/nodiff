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
	const [openingTaskId, setOpeningTaskId] = useState<string | null>(null);
	const [tasksCache, setTasksCache] = useState<{ [subjectId: string]: TaskV2[] }>({});
	const [countsCache, setCountsCache] = useState<{ [courseId: string]: { [subjectId: string]: number } }>({});
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
				const fetched: Course[] = data.courses || [];
				setCourses(fetched);
				// Auto-select first course on initial load
				if (!selectedCourse && fetched.length > 0) {
					// Defer to ensure state update sequence
					setTimeout(() => handleCourseSelect(fetched[0]), 0);
				}
			}
		} catch (error) {
			console.error("Error loading courses:", error);
		}
	};

	const loadSubjectTaskCounts = async (courseId: string) => {
		// Serve from cache if available
		if (countsCache[courseId]) {
			setSubjectTaskCounts(countsCache[courseId]);
			return;
		}
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
				setCountsCache(prev => ({ ...prev, [courseId]: counts }));
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
		// Auto-select first subject if available
		if (course.subjects && course.subjects.length > 0) {
			const first = course.subjects[0];
			setTimeout(() => {
				handleSubjectSelect(first);
			}, 0);
		}
	};

	const handleSubjectSelect = async (subject: any) => {
		setSelectedSubject(subject);
		
		// Serve from cache if present
		const cached = tasksCache[subject.id];
		if (cached) {
			setTasks(cached);
			setLoading(false);
			return;
		}

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
				setTasksCache(prev => ({ ...prev, [subject.id]: sortedTasks }));
			}
		} catch (error) {
			console.error("Error loading tasks:", error);
			setTasks([]);
		} finally {
			setLoading(false);
		}
	};

	const handleTaskSelect = (taskId: string) => {
		setOpeningTaskId(taskId);
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

	// Show subjects view (disabled in unified layout)
	if (false && selectedCourse && !selectedSubject) {
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
							{selectedCourse?.name}
						</h1>
						<p className="text-gray-600">
							Valitse aihe
						</p>
					</div>

					{/* Subjects Grid */}
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{selectedCourse?.subjects.map((subject) => {
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

	// Show tasks view (disabled in unified layout)
	if (false && selectedCourse && selectedSubject) {
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

	// Sidebar + content layout
	return (
		<div className="h-full bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-100 overflow-hidden">
			<div className="h-full w-full px-4 py-6 md:py-8 overflow-hidden">
				<div className="mb-4 text-center">
					<h1 className="text-2xl md:text-3xl font-bold text-gray-900">Matematiikka</h1>
				</div>
				<div className="ui-scale h-[calc(100vh-8rem)] md:h-[calc(100vh-10rem)] grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,clamp(50ch,70vw,80ch))_1fr] items-start gap-3 lg:gap-4">
					{/* Left sidebar */}
					<aside className="w-64 lg:w-72 shrink-0 bg-white/30 backdrop-blur-sm border border-white/40 rounded-xl p-3 md:p-4 overflow-y-auto col-start-1 col-end-2 justify-self-end">
						<div className="mb-3">
							<label className="block text-xs font-medium text-gray-700 mb-1">Kurssi</label>
							<select
								className="w-full bg-white/70 backdrop-blur-sm border border-white/60 rounded-md px-2.5 py-1.5 text-sm"
								value={selectedCourse?.id || ''}
								onChange={(e) => {
									const course = courses.find(c => c.id === e.target.value);
									if (course) handleCourseSelect(course);
								}}
							>
								<option value="" disabled>Valitse kurssi</option>
								{courses.map(c => (
									<option key={c.id} value={c.id}>{c.name}</option>
								))}
							</select>
						</div>

						<div>
							<div className="flex items-center justify-between mb-2">
								<label className="block text-xs font-medium text-gray-700">Aiheet</label>
								{selectedCourse && (
									<span className="text-[10px] text-gray-500">{Object.values(subjectTaskCounts).reduce((a, b) => a + b, 0) || 0} tehtävää</span>
								)}
							</div>
							<div className="space-y-1">
								{selectedCourse?.subjects.map((s) => {
									const active = selectedSubject?.id === s.id;
									const count = subjectTaskCounts[s.id] || 0;
									return (
										<button
											key={s.id}
											onClick={() => handleSubjectSelect(s)}
											className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${active ? 'bg-blue-600 text-white' : 'bg-white/60 hover:bg-white/80 text-gray-800'}`}
										>
											<span className="truncate text-left">{s.name}</span>
											<span className={`ml-2 inline-flex items-center justify-center min-w-6 h-5 px-1.5 rounded-full text-[10px] ${active ? 'bg-white/30' : 'bg-gray-100 text-gray-700'}`}>{count}</span>
										</button>
									);
								})}
								{!selectedCourse && (
									<div className="text-xs text-gray-500">Valitse ensin kurssi</div>
								)}
							</div>
						</div>
					</aside>

					{/* Main content */}
					<main className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl p-4 overflow-y-auto col-start-2 col-end-3 w-full justify-self-center">
						{selectedCourse && selectedSubject ? (
							loading ? (
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
											aria-busy={openingTaskId === task.task_id}
											disabled={openingTaskId === task.task_id}
											className={`relative p-4 bg-white/70 backdrop-blur-sm border border-white/60 rounded-lg hover:bg-white transition-all duration-200 shadow-md text-left ${openingTaskId === task.task_id ? 'ring-2 ring-blue-500 opacity-75 cursor-wait' : ''}`}
										>
											<div className="flex justify-between items-start mb-2">
												<span className="text-sm font-medium text-gray-600">
													Tehtävä {index + 1}
												</span>
												<span className={`px-2 py-1 text-xs font-semibold rounded-full ${
													task.difficulty === 'helppo' ? 'bg-green-100 text-green-800' :
													task.difficulty === 'keskitaso' ? 'bg-yellow-100 text-yellow-800' :
													'bg-red-100 text-red-800'
												}` }>
													{task.difficulty}
												</span>
											</div>
											<h3 className="text-sm font-medium text-gray-900 mb-1">
												{(task.question || 'No question').substring(0, 100)}...
											</h3>
											{openingTaskId === task.task_id && (
												<div className="absolute inset-0 grid place-items-center bg-white/50 rounded-lg">
													<svg className="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none">
														<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
														<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
													</svg>
												</div>
											)}
										</button>
									))}
								</div>
							) : (
								<div className="text-center py-8">
									<p className="text-gray-600">Ei tehtäviä tälle aiheelle.</p>
								</div>
							)
						) : (
							<div className="h-full grid place-items-center text-gray-600 text-sm">
								Valitse kurssi ja aihe vasemmalta
							</div>
						)}
					</main>
				</div>
			</div>
		</div>
	);
} 