"use client";

import { useState } from "react";
import Link from "next/link";

interface Task {
	id: string;
	task_id: string;
	module: string;
	section: string;
	question: string;
	difficulty: string;
	status: "draft" | "published" | "archived";
	created_at: string;
	updated_at: string;
}

interface TaskListClientProps {
	initialTasks: Task[];
}

export default function TaskListClient({ initialTasks }: TaskListClientProps) {
	const [tasks, setTasks] = useState<Task[]>(initialTasks);
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [moduleFilter, setModuleFilter] = useState<string>("all");
	const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
	const [sectionFilter, setSectionFilter] = useState<string>("all");


	const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
	const [isDeleting, setIsDeleting] = useState(false);

	// Get unique sections for filter dropdown
	const uniqueSections = Array.from(new Set(tasks.map(task => task.section).filter(Boolean))).sort();

	// Filter tasks based on search and filters
	const filteredTasks = tasks.filter(task => {
		const matchesSearch = task.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
			task.task_id.toLowerCase().includes(searchTerm.toLowerCase());
		const matchesStatus = statusFilter === "all" || task.status === statusFilter;
		const matchesModule = moduleFilter === "all" || task.module === moduleFilter;
		const matchesDifficulty = difficultyFilter === "all" || task.difficulty === difficultyFilter;
		const matchesSection = sectionFilter === "all" || task.section === sectionFilter;
		
		return matchesSearch && matchesStatus && matchesModule && matchesDifficulty && matchesSection;
	});

	// Use filtered tasks directly (no sorting)
	const sortedTasks = filteredTasks;

	// Handle individual task selection
	const handleTaskSelect = (taskId: string) => {
		const newSelected = new Set(selectedTasks);
		if (newSelected.has(taskId)) {
			newSelected.delete(taskId);
		} else {
			newSelected.add(taskId);
		}
		setSelectedTasks(newSelected);
	};

	// Handle select all/deselect all
	const handleSelectAll = () => {
		if (selectedTasks.size === sortedTasks.length) {
			setSelectedTasks(new Set());
		} else {
			setSelectedTasks(new Set(sortedTasks.map(task => task.id)));
		}
	};

	// Handle individual task deletion
	const handleDelete = async (taskId: string) => {
		if (!confirm("Are you sure you want to delete this task?")) return;
		
		try {
			const response = await fetch(`/api/admin/tasks/${taskId}`, {
				method: "DELETE",
			});
			
			if (response.ok) {
				setTasks(tasks.filter(task => task.id !== taskId));
				// Remove from selected if it was selected
				const newSelected = new Set(selectedTasks);
				newSelected.delete(taskId);
				setSelectedTasks(newSelected);
			} else {
				alert("Failed to delete task");
			}
		} catch (error) {
			console.error("Error deleting task:", error);
			alert("Error deleting task");
		}
	};

	// Handle bulk deletion
	const handleBulkDelete = async () => {
		if (selectedTasks.size === 0) {
			alert("Please select at least one task to delete");
			return;
		}

		const confirmMessage = `Are you sure you want to delete ${selectedTasks.size} selected task${selectedTasks.size > 1 ? 's' : ''}?`;
		if (!confirm(confirmMessage)) return;

		setIsDeleting(true);
		
		try {
			const deletePromises = Array.from(selectedTasks).map(taskId =>
				fetch(`/api/admin/tasks/${taskId}`, { method: "DELETE" })
			);

			const results = await Promise.allSettled(deletePromises);
			const successful = results.filter(result => 
				result.status === 'fulfilled' && result.value.ok
			).length;

			// Remove successfully deleted tasks from the list
			const failedTaskIds = Array.from(selectedTasks).filter((_, index) => 
				results[index].status === 'rejected' || 
				(results[index].status === 'fulfilled' && !results[index].value.ok)
			);

			setTasks(tasks.filter(task => !selectedTasks.has(task.id)));
			setSelectedTasks(new Set(failedTaskIds));

			if (successful === selectedTasks.size) {
				alert(`Successfully deleted ${successful} task${successful > 1 ? 's' : ''}`);
			} else {
				alert(`Deleted ${successful}/${selectedTasks.size} tasks. Some deletions failed.`);
			}
		} catch (error) {
			console.error("Error during bulk deletion:", error);
			alert("Error during bulk deletion");
		} finally {
			setIsDeleting(false);
		}
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "published":
				return "bg-green-100 text-green-800";
			case "draft":
				return "bg-yellow-100 text-yellow-800";
			case "archived":
				return "bg-gray-100 text-gray-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	const getDifficultyColor = (difficulty: string) => {
		switch (difficulty) {
			case "helppo":
				return "bg-green-100 text-green-800";
			case "keskitaso":
				return "bg-yellow-100 text-yellow-800";
			case "haastava":
				return "bg-red-100 text-red-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	return (
		<div className="bg-white shadow rounded-lg">
			{/* Filters */}
			<div className="p-6 border-b border-gray-200">
				<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Search
						</label>
						<input
							type="text"
							placeholder="Search tasks..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Status
						</label>
						<select
							value={statusFilter}
							onChange={(e) => setStatusFilter(e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<option value="all">All Status</option>
							<option value="draft">Draft</option>
							<option value="published">Published</option>
							<option value="archived">Archived</option>
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Module
						</label>
						<select
							value={moduleFilter}
							onChange={(e) => setModuleFilter(e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<option value="all">All Modules</option>
							<option value="MAA5">MAA5</option>
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Difficulty
						</label>
						<select
							value={difficultyFilter}
							onChange={(e) => setDifficultyFilter(e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<option value="all">All Difficulties</option>
							<option value="helppo">Helppo</option>
							<option value="keskitaso">Keskitaso</option>
							<option value="haastava">Haastava</option>
						</select>
					</div>
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Section
						</label>
						<select
							value={sectionFilter}
							onChange={(e) => setSectionFilter(e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<option value="all">All Sections</option>
							{uniqueSections.map(section => (
								<option key={section} value={section}>{section}</option>
							))}
						</select>
					</div>

				</div>
				
				{/* Clear Filters and Counter */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="flex items-end">
						<button
							onClick={() => {
								setSearchTerm("");
								setStatusFilter("all");
								setModuleFilter("all");
								setDifficultyFilter("all");
								setSectionFilter("all");
								setSelectedTasks(new Set());
							}}
							className="w-full px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
						>
							Clear All Filters
						</button>
					</div>
					<div className="flex items-end">
						<div className="text-sm text-gray-600">
							{filteredTasks.length} of {tasks.length} tasks
						</div>
					</div>
				</div>
			</div>

			{/* Bulk Actions */}
			{selectedTasks.size > 0 && (
				<div className="px-6 py-3 bg-blue-50 border-b border-blue-200">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-4">
							<span className="text-sm font-medium text-blue-900">
								{selectedTasks.size} task{selectedTasks.size > 1 ? 's' : ''} selected
							</span>
							<button
								onClick={() => setSelectedTasks(new Set())}
								className="text-sm text-blue-600 hover:text-blue-800"
							>
								Deselect all
							</button>
						</div>
						<button
							onClick={handleBulkDelete}
							disabled={isDeleting}
							className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
						>
							{isDeleting ? 'Deleting...' : `Delete ${selectedTasks.size} task${selectedTasks.size > 1 ? 's' : ''}`}
						</button>
					</div>
				</div>
			)}

			{/* Task List */}
			<div className="overflow-x-auto">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-6 py-3 text-left">
								<input
									type="checkbox"
									checked={sortedTasks.length > 0 && selectedTasks.size === sortedTasks.length}
									onChange={handleSelectAll}
									className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
								/>
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Task
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Module
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Status
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Difficulty
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Actions
							</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{sortedTasks.map((task) => (
							<tr key={task.id} className="hover:bg-gray-50">
								<td className="px-6 py-4 whitespace-nowrap">
									<input
										type="checkbox"
										checked={selectedTasks.has(task.id)}
										onChange={() => handleTaskSelect(task.id)}
										className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
									/>
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<div>
										<div className="text-sm font-medium text-gray-900">
											{task.task_id}
										</div>
										<div className="text-sm text-gray-500 max-w-xs truncate">
											{task.question}
										</div>
									</div>
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<div className="text-sm text-gray-900">{task.module}</div>
									<div className="text-sm text-gray-500">{task.section}</div>
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>
										{task.status}
									</span>
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDifficultyColor(task.difficulty)}`}>
										{task.difficulty}
									</span>
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
									<div className="flex space-x-2">
										<Link
											href={`/admin/tasks/${task.id}`}
											className="text-blue-600 hover:text-blue-900"
										>
											Edit
										</Link>
										<button
											onClick={() => handleDelete(task.id)}
											className="text-red-600 hover:text-red-900"
										>
											Delete
										</button>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Empty State */}
			{sortedTasks.length === 0 && (
				<div className="text-center py-12">
					<svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
					<h3 className="mt-2 text-sm font-medium text-gray-900">No tasks found</h3>
					<p className="mt-1 text-sm text-gray-500">
						{searchTerm || statusFilter !== "all" || moduleFilter !== "all" 
							? "Try adjusting your filters or search terms."
							: "Get started by creating a new task."
						}
					</p>
					{!searchTerm && statusFilter === "all" && moduleFilter === "all" && (
						<div className="mt-6">
							<Link
								href="/admin/tasks/create"
								className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
							>
								Create Task
							</Link>
						</div>
					)}
				</div>
			)}
		</div>
	);
} 