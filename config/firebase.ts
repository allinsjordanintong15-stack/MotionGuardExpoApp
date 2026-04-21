import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import { Platform } from "react-native";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

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

export const db = getFirestore(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);

function getOrCreateAuth() {
  if (Platform.OS === "web") {
    return getAuth(app);
  }
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
}

export const auth = getOrCreateAuth();
