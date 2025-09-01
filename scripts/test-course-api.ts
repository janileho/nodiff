import { adminDb } from "../lib/firebase/admin";
import { defaultMAA5Course } from "../lib/course-data";

async function testCourseAPI() {
  try {
    console.log("Testing course API functionality...");

    // Check if MAA5 course exists
    const existingCourse = await adminDb.collection('courses').doc('MAA5').get();
    
    if (existingCourse.exists) {
      console.log("✅ MAA5 course already exists in database");
      const data = existingCourse.data();
      console.log("Course name:", data?.name);
      console.log("Subjects count:", data?.subjects?.length || 0);
    } else {
      console.log("❌ MAA5 course not found, creating it...");
      
      // Create MAA5 course
      await adminDb.collection('courses').doc('MAA5').set(defaultMAA5Course);
      console.log("✅ MAA5 course created successfully!");
    }

    // List all courses
    const coursesSnapshot = await adminDb.collection('courses').get();
    console.log(`\n📚 Total courses in database: ${coursesSnapshot.size}`);
    
    coursesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      console.log(`- ${doc.id}: ${data.name} (${data.subjects?.length || 0} subjects)`);
    });

  } catch (error) {
    console.error("❌ Error testing course API:", error);
  }
}

// Run test
testCourseAPI().then(() => {
  console.log("\n🎉 Test completed!");
  process.exit(0);
}).catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
}); 