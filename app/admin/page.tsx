import { adminDb } from "@/lib/firebase/admin";
import AdminDashboardClient from "./AdminDashboardClient";

export default async function AdminDashboard() {
	// Get basic stats from Firebase
	const tasksSnapshot = await adminDb.collection('tasks').get();
	const totalTasks = tasksSnapshot.size;
	
	const publishedTasks = tasksSnapshot.docs.filter(doc => 
		doc.data().status === 'published'
	).length;
	
	const draftTasks = tasksSnapshot.docs.filter(doc => 
		doc.data().status === 'draft'
	).length;

	const stats = {
		totalTasks,
		publishedTasks,
		draftTasks
	};

	return <AdminDashboardClient stats={stats} />;
} 