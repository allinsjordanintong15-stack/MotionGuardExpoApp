import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./config/firebase.ts";

export const testFirestoreConnection = async () => {
  try {
    console.log("🧪 Testing Firestore connection...");

    // Test writing data
    const testDocRef = doc(db, "test", "connection-test");
    await setDoc(testDocRef, {
      test: "connection successful",
      timestamp: new Date().toISOString(),
    });
    console.log("✅ Write test successful");

    // Test reading data
    const docSnap = await getDoc(testDocRef);
    if (docSnap.exists()) {
      console.log("✅ Read test successful:", docSnap.data());
    } else {
      console.log("❌ Read test failed - document not found");
    }

    return true;
  } catch (error) {
    console.log("❌ Firestore test failed:", error);
    return false;
  }
};
