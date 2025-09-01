"use client";

import { useState } from "react";
import { TaskImporter, exampleImportData } from "@/lib/task-import";
import type { TaskData } from "@/lib/task-data";

export default function AdminPage() {
	const [importResult, setImportResult] = useState<any>(null);
	const [isImporting, setIsImporting] = useState(false);
	const [jsonInput, setJsonInput] = useState("");
	const [csvInput, setCsvInput] = useState("");

	const handleImportExample = async () => {
		setIsImporting(true);
		try {
			const result = await TaskImporter.importFromJSON(exampleImportData);
			setImportResult(result);
		} catch (error) {
			setImportResult({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
		} finally {
			setIsImporting(false);
		}
	};

	const handleImportJSON = async () => {
		if (!jsonInput.trim()) return;
		
		setIsImporting(true);
		try {
			const data = JSON.parse(jsonInput);
			const result = await TaskImporter.importFromJSON(data);
			setImportResult(result);
		} catch (error) {
			setImportResult({ success: false, error: error instanceof Error ? error.message : 'Invalid JSON' });
		} finally {
			setIsImporting(false);
		}
	};

	const handleImportCSV = async () => {
		if (!csvInput.trim()) return;
		
		setIsImporting(true);
		try {
			const result = await TaskImporter.importFromCSV(csvInput);
			setImportResult(result);
		} catch (error) {
			setImportResult({ success: false, error: error instanceof Error ? error.message : 'Invalid CSV' });
		} finally {
			setIsImporting(false);
		}
	};

	return (
		<div className="flex-1 flex flex-col p-6">
			<div className="max-w-4xl mx-auto w-full">
				<h1 className="text-2xl font-semibold mb-6">Task Management</h1>

				{/* Import Example */}
				<div className="mb-8 p-4 border rounded-lg">
					<h2 className="text-lg font-medium mb-4">Quick Import Example</h2>
					<button
						onClick={handleImportExample}
						disabled={isImporting}
						className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
					>
						{isImporting ? "Importing..." : "Import Example Task"}
					</button>
				</div>

				{/* JSON Import */}
				<div className="mb-8 p-4 border rounded-lg">
					<h2 className="text-lg font-medium mb-4">Import from JSON</h2>
					<textarea
						value={jsonInput}
						onChange={(e) => setJsonInput(e.target.value)}
						placeholder="Paste JSON data here..."
						className="w-full h-32 p-2 border rounded font-mono text-sm"
					/>
					<button
						onClick={handleImportJSON}
						disabled={isImporting || !jsonInput.trim()}
						className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
					>
						{isImporting ? "Importing..." : "Import JSON"}
					</button>
				</div>

				{/* CSV Import */}
				<div className="mb-8 p-4 border rounded-lg">
					<h2 className="text-lg font-medium mb-4">Import from CSV</h2>
					<textarea
						value={csvInput}
						onChange={(e) => setCsvInput(e.target.value)}
						placeholder="Paste CSV data here... (comma-separated values)"
						className="w-full h-32 p-2 border rounded font-mono text-sm"
					/>
					<button
						onClick={handleImportCSV}
						disabled={isImporting || !csvInput.trim()}
						className="mt-2 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
					>
						{isImporting ? "Importing..." : "Import CSV"}
					</button>
				</div>

				{/* Results */}
				{importResult && (
					<div className={`p-4 border rounded-lg ${importResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
						<h3 className="font-medium mb-2">
							{importResult.success ? "Import Successful" : "Import Failed"}
						</h3>
						{importResult.success ? (
							<p>Successfully imported {importResult.imported} tasks.</p>
						) : (
							<div>
								<p className="text-red-600 mb-2">{importResult.error}</p>
								{importResult.errors && importResult.errors.length > 0 && (
									<div>
										<p className="font-medium">Errors:</p>
										<ul className="list-disc list-inside text-sm">
											{importResult.errors.map((error: string, index: number) => (
												<li key={index} className="text-red-600">{error}</li>
											))}
										</ul>
									</div>
								)}
							</div>
						)}
					</div>
				)}

				{/* Task Format Guide */}
				<div className="mt-8 p-4 border rounded-lg bg-gray-50">
					<h2 className="text-lg font-medium mb-4">Task Format Guide</h2>
					<div className="text-sm space-y-2">
						<p><strong>Required fields:</strong> task_id, question, solution_steps, final_answer, module, difficulty</p>
						<p><strong>Optional fields:</strong> exam_year, exam_session, exam_type, time_limit, hints, common_mistakes, tags</p>
						<p><strong>Modules:</strong> MAA5</p>
						<p><strong>Difficulties:</strong> perusteet, keskitaso, vaikea, pääsykoetyyli</p>
						<p><strong>Arrays:</strong> Use | to separate items (e.g., "hint1|hint2|hint3")</p>
					</div>
				</div>
			</div>
		</div>
	);
} 