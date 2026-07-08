import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type LatLng = { lat: number; lng: number } | null;
type GreenPoint = { lat: number; lng: number } | null | undefined;
type Green = { front?: GreenPoint; center?: GreenPoint; back?: GreenPoint } | null;

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(center); }, [center[0], center[1]]);
  return null;
}

export default function HoleMap({ gps, green }: { gps: LatLng; green: Green }) {
  const center: [number, number] = green?.center
    ? [green.center.lat, green.center.lng]
    : gps
    ? [gps.lat, gps.lng]
    : [0, 0];
  if (!gps && !green?.center) {
    return <div className="gps-note" style={{ padding: 24 }}>Enable location to see the map.</div>;
  }
  const greenIcon = L.divIcon({ className: "green-pin", html: "<div></div>", iconSize: [18, 18] });
  const meIcon = L.divIcon({ className: "me-pin", html: "<div></div>", iconSize: [18, 18] });
  return (
    <div className="map-wrap">
      <MapContainer center={center} zoom={17} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer attribution="© OpenStreetMap" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {gps && <Marker position={[gps.lat, gps.lng]} icon={meIcon} />}
        {green?.front && <Marker position={[green.front.lat, green.front.lng]} icon={greenIcon} />}
        {green?.center && <Marker position={[green.center.lat, green.center.lng]} icon={greenIcon} />}
        {green?.back && <Marker position={[green.back.lat, green.back.lng]} icon={greenIcon} />}
        {gps && <Circle center={[gps.lat, gps.lng]} radius={5} pathOptions={{ color: "#094811" }} />}
        <Recenter center={center} />
      </MapContainer>
    </div>
  );
}
