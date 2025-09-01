"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSectionsByModule } from "@/lib/task-data";

interface TaskFormData {
	task_id: string;
	task_type: "verbal" | "nonverbal";
	module: string;
	section: string;
	question: string;
	solution_steps: string[];
	final_answer: string;
	points: number;
	difficulty: string;
	status: "draft" | "published";
	hints: string[];
	common_mistakes: string[];
	prerequisites: string[];
	learning_objectives: string[];
	exam_year?: number;
	exam_session?: string;
	exam_type?: string;
}

interface TaskFormProps {
	task?: TaskFormData & { id?: string };
	isEditing?: boolean;
}

export default function TaskForm({ task, isEditing = false }: TaskFormProps) {
	const router = useRouter();
	const [formData, setFormData] = useState<TaskFormData>({
		task_id: "",
		task_type: "verbal",
		module: "MAA5",
		section: "",
		question: "",
		solution_steps: [""],
		final_answer: "",
		points: 2,
		difficulty: "keskitaso",
		status: "draft",
		hints: [""],
		common_mistakes: [""],
		prerequisites: [""],
		learning_objectives: [""],
		exam_year: undefined,
		exam_session: "",
		exam_type: ""
	});

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [generating, setGenerating] = useState(false);

	// Generate next available task ID
	const generateNextTaskId = async () => {
		try {
			const response = await fetch('/api/admin/tasks/next-id');
			if (response.ok) {
				const data = await response.json();
				handleInputChange("task_id", data.nextId);
			}
		} catch (error) {
			console.error("Error generating task ID:", error);
		}
	};

	// Load task data if editing, or generate new ID if creating
	useEffect(() => {
		if (task) {
			setFormData(task);
		} else if (!isEditing) {
			// Generate next available ID for new tasks
			generateNextTaskId();
		}
	}, [task, isEditing]);

	// Generate task content using AI
	const generateTaskContent = async () => {
		if (!formData.module || !formData.section || !formData.difficulty) {
			setError("Please select module, section, and difficulty first");
			return;
		}

		setGenerating(true);
		setError("");

		try {
			const response = await fetch('/api/admin/tasks/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					module: formData.module,
					section: formData.section,
					difficulty: formData.difficulty,
					task_type: formData.task_type
				})
			});

			if (!response.ok) {
				throw new Error('Failed to generate task');
			}

			const data = await response.json();
			
			// Update form with generated content
			setFormData(prev => ({
				...prev,
				question: data.question,
				solution_steps: data.solution_steps,
				final_answer: data.final_answer,
				hints: data.hints || [""],
				common_mistakes: data.common_mistakes || [""]
			}));

		} catch (error) {
			console.error("Error generating task:", error);
			setError("Failed to generate task content");
		} finally {
			setGenerating(false);
		}
	};

	// Get sections for selected module
	const getSections = () => {
			return getSectionsByModule(formData.module);
	};

	const handleInputChange = (field: keyof TaskFormData, value: any) => {
		setFormData(prev => ({ ...prev, [field]: value }));
	};

	const handleArrayChange = (field: keyof TaskFormData, index: number, value: string) => {
		setFormData(prev => ({
			...prev,
			[field]: (prev[field] as string[]).map((item, i) => i === index ? value : item)
		}));
	};

	const addArrayItem = (field: keyof TaskFormData) => {
		setFormData(prev => ({
			...prev,
			[field]: [...(prev[field] as string[]), ""]
		}));
	};

	const removeArrayItem = (field: keyof TaskFormData, index: number) => {
		setFormData(prev => ({
			...prev,
			[field]: (prev[field] as string[]).filter((_, i) => i !== index)
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError("");

		try {
			// Clean up empty array items
			const cleanedData = {
				...formData,
				solution_steps: formData.solution_steps.filter(step => step.trim()),
				hints: formData.hints.filter(hint => hint.trim()),
				common_mistakes: formData.common_mistakes.filter(mistake => mistake.trim()),
				prerequisites: formData.prerequisites.filter(prereq => prereq.trim()),
				learning_objectives: formData.learning_objectives.filter(obj => obj.trim())
			};

			const url = isEditing ? `/api/admin/tasks/${task?.id}` : "/api/admin/tasks";
			const method = isEditing ? "PUT" : "POST";

			const response = await fetch(url, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(cleanedData)
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to save task");
			}

			router.push("/admin/tasks");
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{error && (
				<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
					{error}
				</div>
			)}

			<div className="bg-white shadow rounded-lg p-6">
				<h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
				
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Task ID *
						</label>
						<div className="flex gap-2">
							<input
								type="text"
								value={formData.task_id}
								onChange={(e) => handleInputChange("task_id", e.target.value)}
								className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
								placeholder="Auto-generated..."
								required
								readOnly={!isEditing}
							/>
							{!isEditing && (
								<button
									type="button"
									onClick={generateNextTaskId}
									className="px-3 py-2 text-sm text-blue-600 border border-blue-300 rounded-md hover:bg-blue-50"
								>
									Regenerate
								</button>
							)}
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Task Type *
						</label>
						<select
							value={formData.task_type}
							onChange={(e) => handleInputChange("task_type", e.target.value as "verbal" | "nonverbal")}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							required
						>
							<option value="verbal">Verbal Task</option>
							<option value="nonverbal">Nonverbal Task</option>
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Module *
						</label>
						<select
							value={formData.module}
							onChange={(e) => handleInputChange("module", e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							required
						>
													<option value="MAA5">MAA5</option>
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Section *
						</label>
						<select
							value={formData.section}
							onChange={(e) => handleInputChange("section", e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							required
						>
							<option value="">Select a section</option>
							{getSections().map(section => (
								<option key={section.id} value={section.id}>
									{section.name}
								</option>
							))}
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Difficulty
						</label>
						<select
							value={formData.difficulty}
							onChange={(e) => handleInputChange("difficulty", e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<option value="helppo">Helppo</option>
							<option value="keskitaso">Keskitaso</option>
							<option value="haastava">Haastava</option>
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Points
						</label>
						<input
							type="number"
							value={formData.points}
							onChange={(e) => handleInputChange("points", parseInt(e.target.value))}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							min="1"
							max="10"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Status
						</label>
						<select
							value={formData.status}
							onChange={(e) => handleInputChange("status", e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<option value="draft">Draft</option>
							<option value="published">Published</option>
						</select>
					</div>
				</div>
			</div>

			<div className="bg-white shadow rounded-lg p-6">
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-lg font-medium text-gray-900">Question & Solution</h2>
					{!isEditing && (
						<button
							type="button"
							onClick={generateTaskContent}
							disabled={generating || !formData.module || !formData.section || !formData.difficulty}
							className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{generating ? (
								<>
									<svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
										<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
										<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
									</svg>
									Generating...
								</>
							) : (
								<>
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
									</svg>
									AI Generate
								</>
							)}
						</button>
					)}
				</div>
				
				<div className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Question *
						</label>
						<textarea
							value={formData.question}
							onChange={(e) => handleInputChange("question", e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							rows={4}
							placeholder="Enter the math question..."
							required
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Solution Steps *
						</label>
						{formData.solution_steps.map((step, index) => (
							<div key={index} className="flex gap-2 mb-2">
								<input
									type="text"
									value={step}
									onChange={(e) => handleArrayChange("solution_steps", index, e.target.value)}
									className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
									placeholder={`Step ${index + 1}`}
									required={index === 0}
								/>
								{formData.solution_steps.length > 1 && (
									<button
										type="button"
										onClick={() => removeArrayItem("solution_steps", index)}
										className="px-3 py-2 text-red-600 hover:text-red-800"
									>
										Remove
									</button>
								)}
							</div>
						))}
						<button
							type="button"
							onClick={() => addArrayItem("solution_steps")}
							className="text-blue-600 hover:text-blue-800 text-sm"
						>
							+ Add Step
						</button>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Final Answer *
						</label>
						<input
							type="text"
							value={formData.final_answer}
							onChange={(e) => handleInputChange("final_answer", e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="e.g., x = 5"
							required
						/>
					</div>
				</div>
			</div>

			<div className="bg-white shadow rounded-lg p-6">
				<h2 className="text-lg font-medium text-gray-900 mb-4">Educational Content</h2>
				
				<div className="space-y-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Hints
						</label>
						{formData.hints.map((hint, index) => (
							<div key={index} className="flex gap-2 mb-2">
								<input
									type="text"
									value={hint}
									onChange={(e) => handleArrayChange("hints", index, e.target.value)}
									className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
									placeholder="Enter a hint..."
								/>
								<button
									type="button"
									onClick={() => removeArrayItem("hints", index)}
									className="px-3 py-2 text-red-600 hover:text-red-800"
								>
									Remove
								</button>
							</div>
						))}
						<button
							type="button"
							onClick={() => addArrayItem("hints")}
							className="text-blue-600 hover:text-blue-800 text-sm"
						>
							+ Add Hint
						</button>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Common Mistakes
						</label>
						{formData.common_mistakes.map((mistake, index) => (
							<div key={index} className="flex gap-2 mb-2">
								<input
									type="text"
									value={mistake}
									onChange={(e) => handleArrayChange("common_mistakes", index, e.target.value)}
									className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
									placeholder="Enter a common mistake..."
								/>
								<button
									type="button"
									onClick={() => removeArrayItem("common_mistakes", index)}
									className="px-3 py-2 text-red-600 hover:text-red-800"
								>
									Remove
								</button>
							</div>
						))}
						<button
							type="button"
							onClick={() => addArrayItem("common_mistakes")}
							className="text-blue-600 hover:text-blue-800 text-sm"
						>
							+ Add Common Mistake
						</button>
					</div>
				</div>
			</div>

			<div className="bg-white shadow rounded-lg p-6">
				<h2 className="text-lg font-medium text-gray-900 mb-4">Exam Information (Optional)</h2>
				
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Exam Year
						</label>
						<input
							type="number"
							value={formData.exam_year || ""}
							onChange={(e) => handleInputChange("exam_year", e.target.value ? parseInt(e.target.value) : undefined)}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
							min="2000"
							max="2030"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Exam Session
						</label>
						<select
							value={formData.exam_session}
							onChange={(e) => handleInputChange("exam_session", e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<option value="">Select session</option>
							<option value="kevät">Kevät</option>
							<option value="syksy">Syksy</option>
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">
							Exam Type
						</label>
						<select
							value={formData.exam_type}
							onChange={(e) => handleInputChange("exam_type", e.target.value)}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<option value="">Select type</option>
							<option value="pääsykoe">Pääsykoe</option>
							<option value="ylioppilaskoe">Ylioppilaskoe</option>
						</select>
					</div>
				</div>
			</div>

			<div className="flex justify-end space-x-4">
				<button
					type="button"
					onClick={() => router.push("/admin/tasks")}
					className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={loading}
					className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
				>
					{loading ? "Saving..." : (isEditing ? "Update Task" : "Create Task")}
				</button>
			</div>
		</form>
	);
} 