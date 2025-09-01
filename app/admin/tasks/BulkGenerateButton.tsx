'use client';

import { useState } from "react";
import { mathModules, getSectionsByModule } from '@/lib/task-data';

export default function BulkGenerateButton() {
	const [isGenerating, setIsGenerating] = useState(false);
	const [taskType, setTaskType] = useState<'verbal' | 'nonverbal'>('verbal');
	const [showModal, setShowModal] = useState(false);
	const [results, setResults] = useState<any>(null);
	
	// Selection states
	const [selectedModules, setSelectedModules] = useState<string[]>(['MAA5']);
	const [selectedSections, setSelectedSections] = useState<string[]>([]);
	const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>(['helppo', 'keskitaso', 'haastava']);
	const [tasksPerDifficulty, setTasksPerDifficulty] = useState(3);

	// Get available sections for MAA5
	const maa5SectionOptions = getSectionsByModule('MAA5').map((section: any) => ({
		id: section.id,
		name: section.name
	}));

	const handleBulkGenerate = async () => {
		setIsGenerating(true);
		setResults(null);

		try {
			const response = await fetch('/api/admin/tasks/bulk-generate', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					task_type: taskType,
					selected_modules: selectedModules,
					selected_sections: selectedSections,
					difficulties: selectedDifficulties,
					tasks_per_difficulty: tasksPerDifficulty
				})
			});

			const data = await response.json();
			setResults(data);
			
			if (response.ok && data.success) {
				// Refresh the page to show new tasks
				window.location.reload();
			}
		} catch (error) {
			console.error('Error generating tasks:', error);
			setResults({ error: 'Failed to generate tasks' });
		} finally {
			setIsGenerating(false);
		}
	};

	const handleModuleChange = (moduleId: string, checked: boolean) => {
		if (checked) {
			setSelectedModules([...selectedModules, moduleId]);
		} else {
			setSelectedModules(selectedModules.filter(id => id !== moduleId));
		}
	};

	const handleSectionChange = (sectionId: string, checked: boolean) => {
		if (checked) {
			setSelectedSections([...selectedSections, sectionId]);
		} else {
			setSelectedSections(selectedSections.filter(id => id !== sectionId));
		}
	};

	const handleDifficultyChange = (difficulty: string, checked: boolean) => {
		if (checked) {
			setSelectedDifficulties([...selectedDifficulties, difficulty]);
		} else {
			setSelectedDifficulties(selectedDifficulties.filter(d => d !== difficulty));
		}
	};

	// Calculate total tasks
	const calculateTotalTasks = () => {
		let totalSections = 0;
		for (const moduleId of selectedModules) {
					if (moduleId === "MAA5") {
			const moduleSections = selectedSections.length > 0 
				? getSectionsByModule('MAA5').filter((s: any) => selectedSections.includes(s.id))
				: getSectionsByModule('MAA5');
			totalSections += moduleSections.length;
		} else {
			totalSections += 1; // Each non-MAA5 module has 1 section
		}
		}
		return totalSections * selectedDifficulties.length * tasksPerDifficulty;
	};

	return (
		<>
			<button
				onClick={() => setShowModal(true)}
				className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
			>
				<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
				</svg>
				Bulk Generate
			</button>

			{/* Modal */}
			{showModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
						<h2 className="text-xl font-bold mb-4">Bulk Generate Tasks</h2>
						
						{/* Task Type Selection */}
						<div className="mb-6">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Task Type
							</label>
							<select
								value={taskType}
								onChange={(e) => setTaskType(e.target.value as 'verbal' | 'nonverbal')}
								className="w-full border border-gray-300 rounded-md px-3 py-2"
							>
								<option value="verbal">Verbal Tasks</option>
								<option value="nonverbal">Nonverbal Tasks</option>
							</select>
						</div>

						{/* Module Selection */}
						<div className="mb-6">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Select Modules
							</label>
							<div className="grid grid-cols-2 gap-3">
								{mathModules.map(module => (
									<label key={module.id} className="flex items-center space-x-2">
										<input
											type="checkbox"
											checked={selectedModules.includes(module.id)}
											onChange={(e) => handleModuleChange(module.id, e.target.checked)}
											className="rounded border-gray-300"
										/>
										<span className="text-sm">
											{module.id}: {module.name}
										</span>
									</label>
								))}
							</div>
						</div>

						{/* Section Selection (only for MAA5) */}
						{selectedModules.includes('MAA5') && (
							<div className="mb-6">
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Select MAA5 Sections (leave empty for all)
								</label>
								<div className="grid grid-cols-2 gap-3">
									{maa5SectionOptions.map((section: any) => (
										<label key={section.id} className="flex items-center space-x-2">
											<input
												type="checkbox"
												checked={selectedSections.includes(section.id)}
												onChange={(e) => handleSectionChange(section.id, e.target.checked)}
												className="rounded border-gray-300"
											/>
											<span className="text-sm">{section.name}</span>
										</label>
									))}
								</div>
							</div>
						)}

						{/* Difficulty Selection */}
						<div className="mb-6">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Select Difficulties
							</label>
							<div className="flex gap-4">
								{['helppo', 'keskitaso', 'haastava'].map(difficulty => (
									<label key={difficulty} className="flex items-center space-x-2">
										<input
											type="checkbox"
											checked={selectedDifficulties.includes(difficulty)}
											onChange={(e) => handleDifficultyChange(difficulty, e.target.checked)}
											className="rounded border-gray-300"
										/>
										<span className="text-sm capitalize">{difficulty}</span>
									</label>
								))}
							</div>
						</div>

						{/* Tasks per difficulty */}
						<div className="mb-6">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Tasks per difficulty
							</label>
							<input
								type="number"
								min="1"
								max="10"
								value={tasksPerDifficulty || ''}
								onChange={(e) => {
									const value = parseInt(e.target.value);
									setTasksPerDifficulty(isNaN(value) ? 1 : value);
								}}
								className="w-24 border border-gray-300 rounded-md px-3 py-2"
							/>
						</div>

						{/* Summary */}
						<div className="mb-6 p-4 bg-gray-50 rounded-md">
							<h3 className="font-medium text-gray-900 mb-2">Summary</h3>
							<p className="text-sm text-gray-600">
								This will generate <strong>{calculateTotalTasks()}</strong> tasks total:
							</p>
							<ul className="text-sm text-gray-600 mt-1 list-disc list-inside">
								{selectedModules.map(moduleId => {
									const module = mathModules.find(m => m.id === moduleId);
									if (moduleId === 'MAA5') {
										const sections = selectedSections.length > 0 
											? getSectionsByModule('MAA5').filter((s: any) => selectedSections.includes(s.id))
											: getSectionsByModule('MAA5');
										return (
											<li key={moduleId}>
												{module?.name}: {sections.length} sections × {selectedDifficulties.length} difficulties × {tasksPerDifficulty} tasks = {sections.length * selectedDifficulties.length * tasksPerDifficulty} tasks
											</li>
										);
									} else {
										return (
											<li key={moduleId}>
												{module?.name}: 1 section × {selectedDifficulties.length} difficulties × {tasksPerDifficulty} tasks = {selectedDifficulties.length * tasksPerDifficulty} tasks
											</li>
										);
									}
								})}
							</ul>
						</div>

						{results && (
							<div className="mb-6 p-3 rounded-md bg-gray-100">
								{results.error ? (
									<div>
										<p className="text-red-600 font-medium">{results.error}</p>
										{results.details && (
											<p className="text-red-500 text-sm mt-1">{results.details}</p>
										)}
									</div>
								) : (
									<div>
										<p className="text-green-600 font-medium">{results.message}</p>
										{results.summary && (
											<div className="text-sm mt-2">
												<p>Created: {results.summary.totalGenerated}/{results.summary.totalRequested}</p>
												{results.summary.totalFailed > 0 && (
													<p className="text-orange-600">Failed: {results.summary.totalFailed}</p>
												)}
											</div>
										)}
									</div>
								)}
							</div>
						)}

						<div className="flex gap-3">
							<button
								onClick={() => setShowModal(false)}
								className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
								disabled={isGenerating}
							>
								Cancel
							</button>
							<button
								onClick={handleBulkGenerate}
								disabled={isGenerating || selectedModules.length === 0 || selectedDifficulties.length === 0}
								className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
							>
								{isGenerating ? (
									<>
										<svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
											<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
											<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
										</svg>
										Generating...
									</>
								) : (
									`Generate ${calculateTotalTasks()} Tasks`
								)}
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
} 