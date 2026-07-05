import { useEffect, useState } from "react";

// Persisted user-added colors, shared across every ColorPicker instance.
const STORAGE_KEY = "bew:custom-colors";

type Listener = (colors: string[]) => void;

const listeners = new Set<Listener>();
let cache: string[] | null = null;

function read(): string[] {
  if (cache) return cache;
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(STORAGE_KEY);
      cache = raw ? (JSON.parse(raw) as string[]) : [];
    } else {
      cache = [];
    }
  } catch {
    cache = [];
  }
  return cache;
}

function write(colors: string[]): void {
  cache = colors;
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(colors));
    }
  } catch {
    // Ignore quota / privacy-mode errors; colors stay in-memory for the session.
  }
  listeners.forEach((listener) => listener(colors));
}

export function getCustomColors(): string[] {
  return read();
}

export function addCustomColor(hex: string): void {
  const normalized = hex.toLowerCase();
  const colors = read();
  if (colors.includes(normalized)) return;
  write([...colors, normalized]);
}

export function removeCustomColor(hex: string): void {
  const normalized = hex.toLowerCase();
  write(read().filter((color) => color !== normalized));
}

/** React hook returning the live list of custom colors. */
export function useCustomColors(): string[] {
  const [colors, setColors] = useState<string[]>(read);
  useEffect(() => {
    listeners.add(setColors);
    return () => {
      listeners.delete(setColors);
    };
  }, []);
  return colors;
}
