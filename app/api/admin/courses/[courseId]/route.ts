import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromSession } from "@/lib/auth";
import { adminDb } from "@/lib/firebase/admin";
import { Course } from "@/lib/course-data";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const user = await getCurrentUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = await context.params;
    console.log("Fetching course:", courseId);
    
    const courseDoc = await adminDb.collection('courses').doc(courseId).get();
    
    if (!courseDoc.exists) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const course = {
      id: courseDoc.id,
      ...courseDoc.data()
    } as Course;

    return NextResponse.json({ course });

  } catch (error) {
    console.error("Error fetching course:", error);
    return NextResponse.json({ 
      error: "Failed to fetch course",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const user = await getCurrentUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = await context.params;

    const courseData: Partial<Course> = await request.json();
    console.log("Updating course:", courseId);

    // Check if course exists
    const courseDoc = await adminDb.collection('courses').doc(courseId).get();
    if (!courseDoc.exists) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Update course with new data
    const updateData = {
      ...courseData,
      updated_at: new Date()
    };

    await adminDb.collection('courses').doc(courseId).update(updateData);

    console.log(`Course ${courseId} updated successfully`);

    return NextResponse.json({
      success: true,
      message: "Course updated successfully"
    });

  } catch (error) {
    console.error("Error updating course:", error);
    return NextResponse.json({ 
      error: "Failed to update course",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const user = await getCurrentUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId } = await context.params;

    console.log("Deleting course:", courseId);

    // Check if course exists
    const courseDoc = await adminDb.collection('courses').doc(courseId).get();
    if (!courseDoc.exists) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Check if there are tasks associated with this course
    const tasksSnapshot = await adminDb.collection('tasks')
      .where('module', '==', courseId)
      .limit(1)
      .get();

    if (!tasksSnapshot.empty) {
      return NextResponse.json({ 
        error: "Cannot delete course: There are tasks associated with this course" 
      }, { status: 400 });
    }

    await adminDb.collection('courses').doc(courseId).delete();

    console.log(`Course ${courseId} deleted successfully`);

    return NextResponse.json({
      success: true,
      message: "Course deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting course:", error);
    return NextResponse.json({ 
      error: "Failed to delete course",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 