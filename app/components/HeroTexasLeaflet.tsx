"use client";

// Client-only Leaflet map. Imported lazily by HeroTexasMap via next/dynamic
// because Leaflet pokes at window globals during init and SSR doesn't have
// those.

import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type Portal = {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  datasets: number;
  status: "active" | "queued" | "scout";
};

type Props = {
  portals: Portal[];
  statusColor: Record<Portal["status"], { ring: string; label: string }>;
  compact?: boolean;
};

// Center on geographic Texas — pulled north (31.0 → 31.6) and zoom out
// (5.5 → 5.2) so all six markers (El Paso, Dallas, Austin, Houston, SA,
// TX state) sit inside the visible frame, not cut off by Mexico spilling
// in from the south.
const CENTER: [number, number] = [31.6, -99.5];
const ZOOM = 5.2;

export default function HeroTexasLeaflet({ portals, statusColor, compact = false }: Props) {
  return (
    <div className="overflow-hidden rounded-md">
      <MapContainer
        center={compact ? [31.2, -97.8] : CENTER}
        zoom={ZOOM}
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl={false}
        style={{ height: compact ? "100%" : "360px", width: "100%", background: "#0b0d12" }}
      >
        {/* Dark-themed CartoDB Positron tiles — free, no API key, attribution
            built into the layer below. */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          maxZoom={19}
        />
        {portals.map((p) => {
          const tone = statusColor[p.status];
          // Marker size scales with dataset count.
          const radius =
            p.datasets > 2000 ? 14 : p.datasets > 500 ? 10 : p.datasets > 50 ? 8 : 6;
          return (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lng]}
              radius={radius}
              pathOptions={{
                color: tone.ring,
                fillColor: tone.ring,
                fillOpacity: p.status === "scout" ? 0.25 : 0.55,
                weight: 2,
                opacity: p.status === "scout" ? 0.5 : 1,
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={0.95} permanent={false}>
                <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 11 }}>
                  <strong>{p.city}</strong>
                  <br />
                  {p.datasets > 0
                    ? `${p.datasets.toLocaleString()} datasets · ${tone.label}`
                    : tone.label}
                </span>
              </Tooltip>
              <Popup>
                <div style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 11, lineHeight: 1.4 }}>
                  <div><strong>{p.city}</strong></div>
                  <div>{p.name}</div>
                  <div>{p.datasets.toLocaleString()} datasets · {tone.label}</div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
