import { adminDb } from "../lib/firebase/admin";
import { defaultMAA5Course } from "../lib/course-data";

async function migrateCourses() {
  try {
    console.log("Starting course migration...");

    // Check if MAA5 course already exists
    const existingCourse = await adminDb.collection('courses').doc('MAA5').get();
    
    if (existingCourse.exists) {
      console.log("MAA5 course already exists, skipping migration");
      return;
    }

    // Create MAA5 course
    console.log("Creating MAA5 course...");
    await adminDb.collection('courses').doc('MAA5').set(defaultMAA5Course);

    console.log("Course migration completed successfully!");
    console.log("Created course:", defaultMAA5Course.name);
    console.log("Subjects:", defaultMAA5Course.subjects.length);
    console.log("Learning objectives:", defaultMAA5Course.learning_objectives.length);

  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateCourses().then(() => {
    console.log("Migration script finished");
    process.exit(0);
  }).catch((error) => {
    console.error("Migration script failed:", error);
    process.exit(1);
  });
}

export { migrateCourses }; 