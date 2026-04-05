"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { NormalizedScene } from "@/lib/types";

const STORAGE_KEY = "rs-catalog-cart-v1";

export interface CartLine {
  scene_id: string;
  snapshot: NormalizedScene;
  addedAt: number;
}

interface CartState {
  lines: CartLine[];
  open: boolean;
  hydrated: boolean;
  add: (scene: NormalizedScene) => void;
  remove: (sceneId: string) => void;
  clear: () => void;
  has: (sceneId: string) => boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
  count: number;
}

const CartContext = createContext<CartState | null>(null);

function loadLines(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is CartLine =>
        x &&
        typeof x === "object" &&
        typeof (x as CartLine).scene_id === "string" &&
        (x as CartLine).snapshot != null
    );
  } catch {
    return [];
  }
}

function persist(lines: CartLine[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setLines(loadLines());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    persist(lines);
  }, [lines, hydrated]);

  const add = useCallback((scene: NormalizedScene) => {
    setLines((prev) => {
      if (prev.some((l) => l.scene_id === scene.scene_id)) return prev;
      return [
        ...prev,
        { scene_id: scene.scene_id, snapshot: scene, addedAt: Date.now() },
      ];
    });
  }, []);

  const remove = useCallback((sceneId: string) => {
    setLines((prev) => prev.filter((l) => l.scene_id !== sceneId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const has = useCallback(
    (sceneId: string) => lines.some((l) => l.scene_id === sceneId),
    [lines]
  );

  const toggle = useCallback(() => setOpen((o) => !o), []);

  const value = useMemo(
    () => ({
      lines,
      open,
      hydrated,
      add,
      remove,
      clear,
      has,
      setOpen,
      toggle,
      count: lines.length,
    }),
    [lines, open, hydrated, add, remove, clear, has, toggle]
  );

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
