"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    // Check initial preference from localStorage or prefers-color-scheme
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialDark = savedTheme ? savedTheme === "dark" : systemPrefersDark;

    setIsDark(initialDark);
    if (initialDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  function toggleTheme() {
    const nextDark = !isDark;
    setIsDark(nextDark);

    if (nextDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }

  // Prevent hydration flicker
  if (isDark === null) {
    return (
      <div className={`h-9 w-9 rounded-full ${className}`} aria-hidden="true" />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={isDark ? "Modo Claro" : "Modo Oscuro"}
      className={`flex h-9 w-9 items-center justify-center rounded-full text-white transition-all duration-200 hover:bg-white/15 active:scale-90 ${className}`}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-300 transition-transform duration-200 rotate-0" />
      ) : (
        <Moon className="h-4 w-4 text-white/90 transition-transform duration-200 rotate-0" />
      )}
    </button>
  );
}
