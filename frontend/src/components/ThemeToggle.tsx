"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/store/store";
import { setTheme, Theme } from "@/store/themeSlice";

export default function ThemeToggle() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.theme.theme);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const selectTheme = (value: Theme) => {
    dispatch(setTheme(value));
    setIsOpen(false);
  };

  const getIcon = (t: Theme) => {
    switch (t) {
      case "light":
        return (
          <svg
            className="h-5 w-5 text-amber-500 transition-transform duration-300 group-hover:rotate-45"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3v1m0 16v1m9-9h-1M4 9h-1m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707m12.728 12.728A9 9 0 115.636 5.636 9 9 0 0118.364 18.364z"
            />
          </svg>
        );
      case "dark":
        return (
          <svg
            className="h-5 w-5 text-indigo-400 transition-transform duration-300 group-hover:-rotate-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        );
      case "system":
      default:
        return (
          <svg
            className="h-5 w-5 text-zinc-500 dark:text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        );
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="fixed bottom-6 right-6 z-50 flex flex-col items-end"
    >
      {/* Dropdown Menu */}
      {isOpen && (
        <div className="mb-2 min-w-[120px] origin-bottom-right rounded-lg border border-outline-variant bg-surface/80 p-1 shadow-lg backdrop-blur-md transition-all duration-200 ease-out dark:bg-surface-container-low/80 animate-in fade-in slide-in-from-bottom-2">
          {(["light", "dark", "system"] as Theme[]).map((t) => (
            <button
              key={t}
              onClick={() => selectTheme(t)}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors duration-150 text-left ${
                theme === t
                  ? "bg-primary-container text-on-primary-container"
                  : "text-on-surface-variant hover:bg-surface-container hover:text-on-background"
              }`}
            >
              <span className="shrink-0">{getIcon(t)}</span>
              <span>{t}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex h-12 w-12 items-center justify-center rounded-full border border-outline bg-surface/60 shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-105 hover:bg-surface active:scale-95 dark:bg-surface-container-high/60 dark:hover:bg-surface-container-high"
        aria-label="Toggle Theme"
      >
        {getIcon(theme)}
      </button>
    </div>
  );
}
