"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Course } from "@/lib/course-data";
import { TaskV2 } from "@/lib/task-data-v2";
import type { CurrentUser } from "@/lib/auth";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";

const UserTaskQuickAddCard = dynamic(() => import("@/components/UserTaskQuickAddCard"), {
	ssr: false,
	loading: () => (
		<div className="w-72 bg-white/30 backdrop-blur-sm border border-white/40 rounded-xl p-4 text-xs text-gray-600">
			Ladataan...
		</div>
	),
});

interface AppClientProps {
	user: CurrentUser;
}

export default function AppClient({ user }: AppClientProps) {
	const [courses, setCourses] = useState<Course[]>([]);
	const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
	const [selectedSubject, setSelectedSubject] = useState<any>(null);
	const [tasks, setTasks] = useState<TaskV2[]>([]);
	const [userTasks, setUserTasks] = useState<TaskV2[]>([]);
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
					// Set both states in same frame to reduce extra renders
					const firstCourse = fetched[0];
					setSelectedCourse(firstCourse);
					if (firstCourse.subjects && firstCourse.subjects.length > 0) {
						setSelectedSubject(firstCourse.subjects[0]);
						// Kick off loads
						loadSubjectTaskCounts(firstCourse.id);
						handleSubjectSelect(firstCourse.subjects[0]);
					}
				}
			}
		} catch (error) {
			// swallow in prod
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
				const counts: {[key: string]: number} = {};
				tasks.forEach((task: TaskV2) => {
					if ((task as any).subject_id) {
						counts[(task as any).subject_id] = (counts[(task as any).subject_id] || 0) + 1;
					}
				});
				setSubjectTaskCounts(counts);
				setCountsCache(prev => ({ ...prev, [courseId]: counts }));
			}
		} catch {
			// noop
		}
	};

	const handleCourseSelect = (course: Course) => {
		setSelectedCourse(course);
		setSelectedSubject(null);
		setTasks([]);
		setUserTasks([]);
		loadSubjectTaskCounts(course.id);
		if (course.subjects && course.subjects.length > 0) {
			const first = course.subjects[0];
			setSelectedSubject(first);
			handleSubjectSelect(first);
		}
	};

	const handleSubjectSelect = useCallback(async (subject: any) => {
		setSelectedSubject(subject);
		// Serve from cache if present (system tasks only)
		const cached = tasksCache[subject.id];
		if (cached) {
			setTasks(cached);
			setLoading(false);
			// Defer user tasks fetch to next tick
			setTimeout(async () => {
				try {
					const userRes = await fetch(`/api/user-tasks?subject_id=${subject.id}`);
					const userList = userRes.ok ? (await userRes.json()).tasks || [] : [];
					const sortedUser = sortTasks(userList as any);
					setUserTasks(sortedUser as any);
				} catch {
					setUserTasks([]);
				}
			}, 0);
			return;
		}

		setLoading(true);
		try {
			// Load system tasks
			const systemRes = await fetch(`/api/admin/tasks2?subject_id=${subject.id}&status=published&limit=4`);
			const systemList = systemRes.ok ? (await systemRes.json()).tasks || [] : [];
			const sortedSystem = sortTasks(systemList as any);
			setTasks(sortedSystem as any);
			setTasksCache(prev => ({ ...prev, [subject.id]: sortedSystem as any }));
		} catch {
			setTasks([]);
		} finally {
			setLoading(false);
			// Kick off user tasks load after render
			setTimeout(async () => {
				try {
					const userRes = await fetch(`/api/user-tasks?subject_id=${subject.id}`);
					const userList = userRes.ok ? (await userRes.json()).tasks || [] : [];
					const sortedUser = sortTasks(userList as any);
					setUserTasks(sortedUser as any);
				} catch {
					setUserTasks([]);
				}
			}, 0);
		}
	}, [tasksCache]);

	function sortTasks(list: TaskV2[]): TaskV2[] {
		return [...list].sort((a: TaskV2, b: TaskV2) => {
			const difficultyOrder: { [key: string]: number } = { 'helppo': 1, 'keskitaso': 2, 'haastava': 3 };
			const aDifficulty = difficultyOrder[(a as any).difficulty] || 2;
			const bDifficulty = difficultyOrder[(b as any).difficulty] || 2;
			if (aDifficulty !== bDifficulty) return aDifficulty - bDifficulty;
			const aNum = parseInt(String((a as any).task_id || '').replace(/\D/g, '')) || 0;
			const bNum = parseInt(String((b as any).task_id || '').replace(/\D/g, '')) || 0;
			return aNum - bNum;
		});
	}

	const handleTaskSelect = (taskId: string) => {
		setOpeningTaskId(taskId);
		router.push(`/app/math/solve/task/${taskId}`);
	};

	const handleBackToCourses = () => {
		setSelectedCourse(null);
		setSelectedSubject(null);
		setTasks([]);
		setUserTasks([]);
	};

	const handleBackToSubjects = () => {
		setSelectedSubject(null);
		setTasks([]);
		setUserTasks([]);
	};

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
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
									{Array.from({ length: 4 }).map((_, i) => (
										<div key={i} className="p-4 bg-white/60 border border-white/60 rounded-lg shadow-sm">
											<div className="h-4 w-20 bg-gradient-to-r from-gray-200/80 via-gray-100 to-gray-200/80 rounded mb-3 animate-pulse" />
											<div className="h-4 w-3/4 bg-gradient-to-r from-gray-200/80 via-gray-100 to-gray-200/80 rounded mb-2 animate-pulse" />
											<div className="h-4 w-1/2 bg-gradient-to-r from-gray-200/80 via-gray-100 to-gray-200/80 rounded animate-pulse" />
										</div>
									))}
								</div>
							) : (tasks.filter(task => (task as any).question && (task as any).task_id).length + userTasks.filter(t => (t as any).question && (t as any).task_id).length) > 0 ? (
								<>
									<div className="flex items-center justify-between -mt-2 mb-2">
										<div className="text-xs text-gray-600">{tasks.filter(t=>(t as any).question && (t as any).task_id).length + userTasks.filter(t=>(t as any).question && (t as any).task_id).length} tehtävää</div>
									</div>

									{/* System tasks */}
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										{tasks.filter(task => (task as any).question && (task as any).task_id).map((task, index) => (
											<motion.button
												key={(task as any).task_id}
												onClick={() => handleTaskSelect((task as any).task_id)}
												aria-busy={openingTaskId === (task as any).task_id}
												disabled={openingTaskId === (task as any).task_id}
												className={`relative p-4 bg-white/70 backdrop-blur-sm border border-white/60 rounded-lg hover:bg-white transition-all duration-200 shadow-md text-left ${openingTaskId === (task as any).task_id ? 'ring-2 ring-blue-500 opacity-75 cursor-wait' : ''}`}
												whileHover={{ scale: 1.02 }}
												whileTap={{ scale: 0.98 }}
											>
												<div className="flex justify-between items-start mb-2">
													<span className="text-sm font-medium text-gray-600">Tehtävä {index + 1}</span>
													<span className={`px-2 py-1 text-xs font-semibold rounded-full ${
														(task as any).difficulty === 'helppo' ? 'bg-green-100 text-green-800' :
														(task as any).difficulty === 'keskitaso' ? 'bg-yellow-100 text-yellow-800' :
														'bg-red-100 text-red-800'
													}` }>{(task as any).difficulty}</span>
												</div>
												<h3 className="text-sm font-medium text-gray-900 mb-1">{(((task as any).question || 'No question') as string).substring(0, 100)}...</h3>
												{openingTaskId === (task as any).task_id && (
													<div className="absolute inset-0 grid place-items-center bg-white/50 rounded-lg">
														<svg className="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none">
															<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
															<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
														</svg>
													</div>
												)}
											</motion.button>
										))}
									</div>

									{/* User tasks section */}
									{userTasks.filter(t => (t as any).question && (t as any).task_id).length > 0 && (
										<div className="mt-4">
											<h3 className="text-xs font-semibold text-gray-700 mb-2">User tasks</h3>
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												{userTasks.filter(task => (task as any).question && (task as any).task_id).map((task, index) => (
													<motion.button
														key={(task as any).task_id}
														onClick={() => handleTaskSelect((task as any).task_id)}
														className={`relative p-4 bg-white/70 backdrop-blur-sm border border-white/60 rounded-lg hover:bg-white transition-all duration-200 shadow-md text-left ${openingTaskId === (task as any).task_id ? 'ring-2 ring-blue-500 opacity-75 cursor-wait' : ''}`}
														whileHover={{ scale: 1.02 }}
														whileTap={{ scale: 0.98 }}
													>
														<div className="flex justify-between items-start mb-2">
															<span className="text-sm font-medium text-gray-600">Oma</span>
															<span className={`px-2 py-1 text-xs font-semibold rounded-full ${
																(task as any).difficulty === 'helppo' ? 'bg-green-100 text-green-800' :
																(task as any).difficulty === 'keskitaso' ? 'bg-yellow-100 text-yellow-800' :
																'bg-red-100 text-red-800'
															}` }>{(task as any).difficulty}</span>
														</div>
														<h4 className="text-sm font-medium text-gray-900 mb-1">{(((task as any).question || 'No question') as string).substring(0, 100)}...</h4>
													</motion.button>
												))}
											</div>
										</div>
									)}
								</>
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
					{/* Right rail in outer grid column 3 */}
					<aside className="hidden lg:block col-start-3 col-end-4 w-72 justify-self-start">
						{selectedSubject && (
							<UserTaskQuickAddCard
								courseId={selectedCourse?.id || null}
								subjectId={selectedSubject?.id || null}
								onCreated={(taskId) => {
									if (!taskId) return;
									handleSubjectSelect(selectedSubject);
									router.push(`/app/math/solve/task/${taskId}`);
								}}
							/>
						)}
					</aside>
				</div>
			</div>
		</div>
	);
} 