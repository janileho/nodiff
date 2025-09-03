"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Course } from "@/lib/course-data";
import { TaskV2 } from "@/lib/task-data-v2";
import type { CurrentUser } from "@/lib/auth";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import FormulaVisual from "@/components/FormulaVisual";

// Animation variants for smoother task appearance
const listVariants = {
	hidden: { opacity: 0 },
	show: {
		opacity: 1,
		transition: { staggerChildren: 0.06, delayChildren: 0.02 },
	},
	exit: { opacity: 0 },
};

const itemVariants = {
	hidden: { opacity: 0, y: 10, scale: 0.98 },
	show: {
		opacity: 1,
		y: 0,
		scale: 1,
		transition: { type: "spring", stiffness: 420, damping: 30, mass: 0.8 },
	},
	exit: { opacity: 0, y: -6, scale: 0.98, transition: { duration: 0.15 } },
};

// Subject list animations
const subjectsListVariants = {
	initial: { opacity: 0 },
	animate: {
		opacity: 1,
		transition: { staggerChildren: 0.04, delayChildren: 0.02 },
	},
};

const subjectItemVariants = {
	initial: { opacity: 0, y: 6 },
	animate: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 28 } },
};

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
	const [loadingCourses, setLoadingCourses] = useState<boolean>(false);
	const router = useRouter();
	const [selectedUserTaskIds, setSelectedUserTaskIds] = useState<Set<string>>(new Set());
	const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);
	const [showUser, setShowUser] = useState(false);

	// Load courses on component mount
	useEffect(() => {
		loadCourses();
	}, []);

	const loadCourses = async () => {
		try {
			setLoadingCourses(true);
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
		} finally {
			setLoadingCourses(false);
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

	function toggleSelectUserTask(taskId: string) {
		setSelectedUserTaskIds((prev) => {
			const next = new Set(prev);
			if (next.has(taskId)) next.delete(taskId); else next.add(taskId);
			return next;
		});
	}

	async function bulkDeleteSelectedUserTasks() {
		if (selectedUserTaskIds.size === 0) return;
		setIsBulkDeleting(true);
		try {
			const ids = Array.from(selectedUserTaskIds);
			await Promise.all(ids.map((id) => fetch(`/api/user-tasks/${id}`, { method: "DELETE" })));
			setUserTasks((prev) => prev.filter((t: any) => !selectedUserTaskIds.has((t as any).task_id)) as any);
			setSelectedUserTaskIds(new Set());
		} finally {
			setIsBulkDeleting(false);
		}
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
							<label className="block text-xs font-medium text-gray-700 mb-1 flex items-center justify-between">
								<span>Kurssi</span>
								<span className="ml-2 inline-block w-16 h-1 relative overflow-hidden rounded bg-white/50">
									{loadingCourses && (
										<motion.span
											className="absolute inset-y-0 left-0 bg-blue-600/80"
											initial={{ width: '10%' }}
											animate={{ width: ['10%', '55%', '85%'] }}
											transition={{ duration: 1.1, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' }}
										/>
									)}
								</span>
							</label>
							<select
								className="w-full bg-white/70 backdrop-blur-sm border border-white/60 rounded-md px-2.5 py-1.5 text-sm"
								value={selectedCourse?.id || ''}
								onChange={(e) => {
									const course = courses.find(c => c.id === e.target.value);
									if (course) handleCourseSelect(course);
								}}
								disabled={loadingCourses}
							>
								{loadingCourses ? (
									<option value="" disabled>Ladataan…</option>
								) : (
									<option value="" disabled>Valitse kurssi</option>
								)}
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
							<motion.div className="space-y-1" variants={subjectsListVariants} initial="initial" animate="animate" key={selectedCourse?.id || 'no-course'}>
								{selectedCourse?.subjects.map((s) => {
									const active = selectedSubject?.id === s.id;
									const count = subjectTaskCounts[s.id] || 0;
									return (
										<motion.button
											variants={subjectItemVariants}
											key={s.id}
											onClick={() => handleSubjectSelect(s)}
											className={`w-full relative flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors ${active ? 'bg-blue-600 text-white' : 'bg-white/60 hover:bg-white/80 text-gray-800'}`}
										>
											<span className="truncate text-left">{s.name}</span>
											<span className={`ml-2 inline-flex items-center justify-center min-w-6 h-5 px-1.5 rounded-full text-[10px] ${active ? 'bg-white/30' : 'bg-gray-100 text-gray-700'}`}>{count}</span>
											{/* subtle per-subject loading bar when fetching tasks */}
											{active && loading && (
												<motion.span
													className={`absolute left-2 right-2 bottom-1 h-0.5 ${active ? 'bg-transparent' : ''}`}
													initial={{ opacity: 0 }}
													animate={{ opacity: [0.2, 1, 0.2] }}
													transition={{ duration: 1.2, repeat: Infinity }}
												>
													<motion.span
														className="block w-1/5 h-full bg-white/80"
														initial={{ x: '0%' }}
														animate={{ x: ['0%', '60%', '100%'] }}
														transition={{ duration: 1.2, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut' }}
													/>
												</motion.span>
											)}
										</motion.button>
									);
								})}
								{!selectedCourse && (
									<div className="text-xs text-gray-500">Valitse ensin kurssi</div>
								)}
							</motion.div>
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

									{/* Subtle glassy top section with theory and centered tabs */}
									<motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }} className="mb-3 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 shadow-[0_1px_8px_rgba(0,0,0,0.04)] overflow-hidden">
										<div className="px-3 pt-3">
											<FormulaVisual moduleId={selectedCourse?.id || ""} sectionId={selectedSubject?.id || undefined} compact={false} />
										</div>
										<div className="px-3 pb-3">
											<div className="flex justify-center">
												<div className="inline-flex items-center rounded-full bg-white/30 border border-white/40 shadow-inner p-0.5">
													<button
														onClick={() => setShowUser(false)}
														className={`px-3 py-1.5 text-xs rounded-full transition-colors ${!showUser ? 'bg-white/80 text-gray-900 shadow' : 'bg-transparent text-gray-800 hover:bg-white/40'}`}
													>
														Harjoitus
													</button>
													<button
														onClick={() => setShowUser(true)}
														className={`px-3 py-1.5 text-xs rounded-full transition-colors ${showUser ? 'bg-white/80 text-gray-900 shadow' : 'bg-transparent text-gray-800 hover:bg-white/40'}`}
													>
														Omat tehtävät
													</button>
												</div>
											</div>
										</div>
									</motion.div>

									{/* Tasks content depending on tab */}
									{!showUser ? (
										<motion.div className="grid grid-cols-1 md:grid-cols-2 gap-4" variants={listVariants} initial="hidden" animate="show" exit="exit" key={`sys-${selectedSubject?.id}-${tasks.length}`}>
											{tasks.filter(task => (task as any).question && (task as any).task_id).map((task, index) => (
												<motion.button
													layout
													variants={itemVariants}
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
													</div>
													<h3 className="text-sm font-medium text-gray-900 mb-1">{(((task as any).question || 'No question') as string).substring(0, 100)}...</h3>
													{openingTaskId === (task as any).task_id && (
														<div className="absolute inset-0 grid place-items-center bg-white/50 rounded-lg">
															<svg className="animate-spin h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none">
																<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
																<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v3a5 5 0 0 0-5 5H4z"></path>
															</svg>
														</div>
													)}
												</motion.button>
											))}
										</motion.div>
									) : (
										userTasks.filter(t => (t as any).question && (t as any).task_id).length > 0 ? (
											<div className="mt-0">
												<div className="flex items-center justify-between mb-2">
													<h3 className="text-xs font-semibold text-gray-700">User tasks</h3>
													<div className="w-5 h-5 flex items-center justify-center">
														<button
															onClick={bulkDeleteSelectedUserTasks}
															disabled={isBulkDeleting || selectedUserTaskIds.size === 0}
															className={`inline-flex items-center justify-center h-4 w-4 rounded text-red-600 hover:text-red-700 disabled:opacity-0 disabled:pointer-events-none transition`}
															title="Poista valitut"
														>
															{isBulkDeleting ? (
																<svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
																	<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
																	<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v3a5 5 0 0 0-5 5H4z"></path>
																</svg>
															) : (
																<svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
																	<path d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m-9 0h10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
																</svg>
															)}
														</button>
													</div>
												</div>
												<motion.div className="grid grid-cols-1 md:grid-cols-2 gap-4" variants={listVariants} initial="hidden" animate="show" exit="exit" key={`usr-${selectedSubject?.id}-${userTasks.length}`}>
													{userTasks.filter(task => (task as any).question && (task as any).task_id).map((task, index) => (
														<motion.div
															layout
															variants={itemVariants}
															key={(task as any).task_id}
															onClick={() => handleTaskSelect((task as any).task_id)}
															className={`group relative p-4 ${selectedUserTaskIds.has((task as any).task_id) ? 'bg-white/50' : 'bg-white/70'} backdrop-blur-sm border border-white/60 rounded-lg hover:bg-white transition-all duration-200 shadow-md text-left ${openingTaskId === (task as any).task_id ? 'ring-2 ring-blue-500 opacity-75 cursor-wait' : ''}`}
															whileHover={{ scale: 1.02 }}
															whileTap={{ scale: 0.98 }}
															animate={selectedUserTaskIds.has((task as any).task_id) ? { rotate: [0, 0.15, -0.15, 0], x: [0, 0.3, -0.3, 0] } : { rotate: 0, x: 0 }}
															transition={selectedUserTaskIds.has((task as any).task_id) ? { duration: 1.6, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut', repeatDelay: 2.2 } : {}}
														>
															{/* Subtle selected overlay layer */}
															{selectedUserTaskIds.has((task as any).task_id) && (
																<>
																	<div className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-br from-white/40 via-white/20 to-transparent" />
																	<motion.span
																		className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-white/10 blur-[2px] rounded"
																		initial={{ x: '-30%', opacity: 0 }}
																		animate={{ x: ['-30%', '140%'], opacity: [0, 0.5, 0] }}
																		transition={{ duration: 2.4, repeat: Infinity, repeatType: 'loop', ease: 'easeInOut', repeatDelay: 1.8 }}
																	/>
																</>
															)}

															<div className="flex justify-between items-start mb-2">
																<span className="text-sm font-medium text-gray-600">Oma</span>
															</div>
															<h4 className="text-sm font-medium text-gray-900 mb-1">{(((task as any).question || 'No question') as string).substring(0, 100)}...</h4>

															{/* Hover-only select toggle (absolute, no layout shift). If selected, keep visible */}
															<button
																onClick={(e) => { e.stopPropagation(); toggleSelectUserTask((task as any).task_id); }}
																title={selectedUserTaskIds.has((task as any).task_id) ? 'Poista valinta' : 'Valitse'}
																className={`absolute top-2 right-2 ${selectedUserTaskIds.has((task as any).task_id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity inline-flex items-center justify-center h-5 w-5 rounded-full border ${selectedUserTaskIds.has((task as any).task_id) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/80 text-gray-600 border-white/60'} hover:shadow`}
															>
																{selectedUserTaskIds.has((task as any).task_id) ? (
																	<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
																		<path d="M20 6L9 17l-5-5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
																	</svg>
																) : (
																	<svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
																		<circle cx="12" cy="12" r="8" strokeWidth="2.5" />
																	</svg>
																)}
															</button>
														</motion.div>
													))}
												</motion.div>
											</div>
										) : null
									)}
								</>
							) : (
								<div className="h-full grid place-items-center text-gray-600 text-sm">
									Valitse kurssi ja aihe vasemmalta
								</div>
							)
						) : (
							<div className="h-full grid place-items-center text-gray-600 text-sm">
								Valitse kurssi ja aihe vasemmalta
							</div>
						)}
					</main>
					{/* Right rail in outer grid column 3 */}
					<aside className="hidden lg:block col-start-3 col-end-4 w-64 lg:w-72 justify-self-start">
						{selectedSubject && (
							<UserTaskQuickAddCard
								courseId={selectedCourse?.id || null}
								subjectId={selectedSubject?.id || null}
								onCreated={(taskId) => {
									if (!taskId) return;
									handleSubjectSelect(selectedSubject);
								}}
							/>
						)}
					</aside>
				</div>
			</div>
		</div>
	);
} 