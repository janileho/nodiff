"use client";

import TaskNavigation from "@/components/TaskNavigation";

export default function TaskNavClient({ taskId }: { taskId: string }) {
	return <TaskNavigation taskId={taskId} />;
}
