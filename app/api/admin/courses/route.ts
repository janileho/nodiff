import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromSession } from "@/lib/auth";
import { adminDb } from "@/lib/firebase/admin";
import { Course } from "@/lib/course-data";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Fetching courses from database");
    
    const coursesSnapshot = await adminDb.collection('courses')
      .orderBy('created_at', 'desc')
      .get();

    const courses = coursesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Course[];

    console.log(`Found ${courses.length} courses`);

    return NextResponse.json({
      courses,
      total: courses.length
    });

  } catch (error) {
    console.error("Error fetching courses:", error);
    return NextResponse.json({ 
      error: "Failed to fetch courses",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const courseData: Omit<Course, 'created_at' | 'updated_at'> = await request.json();

    console.log("Creating new course:", courseData.name);

    // Validate required fields
    if (!courseData.name || !courseData.description) {
      return NextResponse.json({ error: "Name and description are required" }, { status: 400 });
    }

    // Check if course with same ID already exists
    const existingCourse = await adminDb.collection('courses').doc(courseData.id).get();
    if (existingCourse.exists) {
      return NextResponse.json({ error: "Course with this ID already exists" }, { status: 409 });
    }

    const now = new Date();
    const newCourse: Course = {
      ...courseData,
      created_at: now,
      updated_at: now
    };

    await adminDb.collection('courses').doc(courseData.id).set(newCourse);

    console.log(`Course ${courseData.id} created successfully`);

    return NextResponse.json({
      success: true,
      message: "Course created successfully",
      course: newCourse
    });

  } catch (error) {
    console.error("Error creating course:", error);
    return NextResponse.json({ 
      error: "Failed to create course",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 