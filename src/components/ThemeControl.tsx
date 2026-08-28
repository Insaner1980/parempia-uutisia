"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import styles from "./Header.module.css";

const subscribeToNothing = () => () => undefined;

export function ThemeControl() {
  const control = useRef<HTMLSelectElement>(null);
  const hydrated = useSyncExternalStore(subscribeToNothing, () => true, () => false);

  useEffect(() => {
    let saved = "system";
    try { saved = localStorage.getItem("pu-theme") || "system"; } catch { /* Local storage may be unavailable. */ }
    if (control.current) control.current.value = ["light", "dark"].includes(saved) ? saved : "system";
    const media = matchMedia("(prefers-color-scheme: dark)");
    const followSystem = () => {
      if (control.current?.value === "system") document.documentElement.dataset.theme = media.matches ? "dark" : "light";
    };
    media.addEventListener("change", followSystem);
    return () => media.removeEventListener("change", followSystem);
  }, []);

  return <label className={styles.themeLabel}>
    <span className="sr-only">Ulkoasu</span>
    <select ref={control} defaultValue="system" disabled={!hydrated} className={styles.themeSelect} onChange={(event) => {
      const choice = event.target.value;
      try {
        if (choice === "system") localStorage.removeItem("pu-theme");
        else localStorage.setItem("pu-theme", choice);
      } catch { /* Theme still works for this visit. */ }
      document.documentElement.dataset.theme = choice === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : choice;
    }}>
      <option value="system">Järjestelmä</option>
      <option value="light">Vaalea</option>
      <option value="dark">Tumma</option>
    </select>
  </label>;
}
