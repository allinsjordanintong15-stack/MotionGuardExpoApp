import { doc, onSnapshot } from "firebase/firestore";
import React, { createContext, useEffect, useState } from "react";
import { db } from "./firebase";

export const LightTheme = {
  background: "#f4f6fa",
  card: "#ffffff",
  text: "#000000",
  subText: "#666666",
  primary: "#007BFF",
  border: "#ddd",
};

export const DarkTheme = {
  background: "#121212",
  card: "#1e1e1e",
  text: "#ffffff",
  subText: "#aaaaaa",
  primary: "#4da3ff",
  border: "#333",
};

export const ThemeContext = createContext(LightTheme);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "settings", "main"), (snapshot) => {
      if (snapshot.exists()) {
        setDarkMode(snapshot.data().darkMode || false);
      }
    });
    return unsubscribe;
  }, []);

  const theme = darkMode ? DarkTheme : LightTheme;

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
};
