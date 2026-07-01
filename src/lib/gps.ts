// Haversine distance between two lat/lng in yards
export function distanceYards(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000; // metres
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return (R * c) * 1.09361;
}

export function getPlayerId(): string {
  if (typeof window === "undefined") return "server";
  const existing = localStorage.getItem("pf-player-id");
  if (existing) return existing;
  const id = (crypto as any).randomUUID?.() || Math.random().toString(36).slice(2) + Date.now();
  localStorage.setItem("pf-player-id", id);
  return id;
}
