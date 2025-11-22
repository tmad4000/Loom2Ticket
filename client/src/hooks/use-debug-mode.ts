import { useState, useEffect } from "react";

export function useDebugMode() {
  const [debugMode, setDebugMode] = useState(() => {
    const stored = localStorage.getItem("debug-mode");
    return stored === "true";
  });

  useEffect(() => {
    localStorage.setItem("debug-mode", String(debugMode));
  }, [debugMode]);

  const toggleDebugMode = () => setDebugMode(!debugMode);

  return { debugMode, toggleDebugMode };
}
