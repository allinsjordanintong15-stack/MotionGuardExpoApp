// app/firebase.ts

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// 🔥 Replace with your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAPgWvh4ClYBK3TiYT3SDmSc7VKynXo9P4",
  authDomain: "motionguarddb.firebaseapp.com",
  projectId: "motionguarddb",
  storageBucket: "motionguarddb.firebasestorage.app",
  messagingSenderId: "677643017630",
  appId: "1:677643017630:web:7be08377011bbe309dca8f",
  databaseURL: "https://motionguarddb-default-rtdb.firebaseio.com/",
};

const app = initializeApp(firebaseConfig);

// Export Firestore database
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export const rtdb = getDatabase(app);
