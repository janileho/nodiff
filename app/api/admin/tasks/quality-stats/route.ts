import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromSession } from "@/lib/auth";
import { adminDb } from "@/lib/firebase/admin";

interface TaskWithQuality {
	id: string;
	task_id?: string;
	quality_metrics?: {
		overallQuality: number;
		issues: string[];
	};
	created_at?: any;
}

export async function GET(request: NextRequest) {
	try {
		console.log("Quality stats: Starting request");
		
		const user = await getCurrentUserFromSession();
		if (!user) {
			console.log("Quality stats: Unauthorized user");
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		
		console.log("Quality stats: User authenticated:", user.email);

		// Get all tasks and filter for those with quality metrics
		console.log("Quality stats: Fetching tasks from database");
		let tasksSnapshot;
		try {
			tasksSnapshot = await adminDb.collection('tasks')
				.orderBy('created_at', 'desc')
				.limit(100)
				.get();
		} catch (orderError) {
			console.log("Quality stats: Ordering by created_at failed, trying without order:", orderError);
			// Fallback: get tasks without ordering
			tasksSnapshot = await adminDb.collection('tasks')
				.limit(100)
				.get();
		}

		console.log("Quality stats: Fetched", tasksSnapshot.docs.length, "tasks");

		const allTasks = tasksSnapshot.docs.map(doc => ({
			id: doc.id,
			...doc.data()
		})) as TaskWithQuality[];

		// Filter tasks that have quality metrics
		const tasks = allTasks.filter(task => task.quality_metrics);
		console.log("Quality stats: Found", tasks.length, "tasks with quality metrics");

		// Calculate statistics
		const totalTasks = tasks.length;
		let totalQuality = 0;
		const qualityDistribution = {
			excellent: 0, // 0.8-1.0
			good: 0, // 0.6-0.8
			fair: 0, // 0.4-0.6
			poor: 0 // 0.0-0.4
		};

		const allIssues: string[] = [];
		const recentTasks: Array<{
			taskId: string;
			quality: number;
			issues: string[];
			generatedAt: Date;
		}> = [];

		tasks.forEach(task => {
			if (task.quality_metrics) {
				const quality = task.quality_metrics.overallQuality || 0;
				totalQuality += quality;

				// Categorize quality
				if (quality >= 0.8) qualityDistribution.excellent++;
				else if (quality >= 0.6) qualityDistribution.good++;
				else if (quality >= 0.4) qualityDistribution.fair++;
				else qualityDistribution.poor++;

				// Collect issues
				if (task.quality_metrics.issues) {
					allIssues.push(...task.quality_metrics.issues);
				}

				// Add to recent tasks
				recentTasks.push({
					taskId: task.task_id || task.id,
					quality,
					issues: task.quality_metrics.issues || [],
					generatedAt: task.created_at?.toDate() || new Date()
				});
			}
		});

		// Calculate average quality
		const averageQuality = totalTasks > 0 ? totalQuality / totalTasks : 0;
		
		console.log("Quality stats: Calculated average quality:", averageQuality);

		// Find most common issues
		const issueCounts: { [issue: string]: number } = {};
		allIssues.forEach(issue => {
			issueCounts[issue] = (issueCounts[issue] || 0) + 1;
		});

		const commonIssues = Object.entries(issueCounts)
			.sort(([,a], [,b]) => b - a)
			.slice(0, 10)
			.map(([issue]) => issue);

		const response = {
			totalTasks,
			averageQuality,
			qualityDistribution,
			commonIssues,
			recentTasks: recentTasks.slice(0, 10)
		};
		
		console.log("Quality stats: Returning response:", response);
		
		return NextResponse.json(response);

	} catch (error) {
		console.error("Quality stats error:", error);
		return NextResponse.json({ 
			error: "Failed to fetch quality statistics",
			details: error instanceof Error ? error.message : 'Unknown error'
		}, { status: 500 });
	}
} 