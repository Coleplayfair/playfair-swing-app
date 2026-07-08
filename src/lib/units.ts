import { useEffect, useState } from "react";

export type Units = "yards" | "meters";
const KEY = "pf-units";

export function getUnits(): Units {
  if (typeof window === "undefined") return "yards";
  return (localStorage.getItem(KEY) as Units) || "yards";
}
export function setUnits(u: Units) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, u);
  window.dispatchEvent(new Event("pf-units-change"));
}
export function useUnits(): [Units, (u: Units) => void] {
  const [u, setU] = useState<Units>("yards");
  useEffect(() => {
    setU(getUnits());
    const onChange = () => setU(getUnits());
    window.addEventListener("pf-units-change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("pf-units-change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return [u, setUnits];
}

// yards → display value in current units
export function toDisplay(yards: number, units: Units): number {
  return units === "meters" ? Math.round(yards * 0.9144) : Math.round(yards);
}
export function unitLabel(units: Units, long = false): string {
  if (units === "meters") return long ? "meters" : "m";
  return long ? "yards" : "yds";
}
