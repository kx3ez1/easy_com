"use client";

import React, { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "./store";
import { setTheme, Theme } from "./themeSlice";

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.theme.theme);

  // Initialize theme from localStorage on client mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("theme") as Theme;
      if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
        dispatch(setTheme(savedTheme));
      }
    } catch (e) {
      console.error("Failed to read theme from localStorage:", e);
    }
  }, [dispatch]);

  // Apply theme class and register system change listener
  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (targetTheme: Theme) => {
      if (targetTheme === "dark") {
        root.classList.add("dark");
      } else if (targetTheme === "light") {
        root.classList.remove("dark");
      } else if (targetTheme === "system") {
        const systemIsDark = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;
        if (systemIsDark) {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      }
    };

    // Save to localStorage
    try {
      localStorage.setItem("theme", theme);
    } catch (e) {
      console.error("Failed to save theme to localStorage:", e);
    }

    applyTheme(theme);

    // Watch system theme change if the active preference is "system"
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleSystemThemeChange = (e: MediaQueryListEvent) => {
        if (e.matches) {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      };

      mediaQuery.addEventListener("change", handleSystemThemeChange);
      return () => {
        mediaQuery.removeEventListener("change", handleSystemThemeChange);
      };
    }
  }, [theme]);

  return <>{children}</>;
}
