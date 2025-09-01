import TaskForm from "../TaskForm";

export default function CreateTaskPage() {
	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-2xl font-bold text-gray-900">Create New Task</h1>
				<p className="text-gray-600 mt-1">Add a new math task to the system</p>
			</div>

			{/* Task Form */}
			<TaskForm />
		</div>
	);
} 