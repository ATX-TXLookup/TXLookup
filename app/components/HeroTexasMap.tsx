"use client";

// HeroTexasMap — real interactive map of Texas with civic-data portal nodes
// per major city. Uses Leaflet + OpenStreetMap tiles (no API key required).
// Active portals pulse; queued portals are dimmed; scout-pending markers are
// shown but greyed.

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

// Real lat/lng for each Texas portal city.
type Portal = {
  id: string;
  name: string;
  city: string;
  lat: number;
  lng: number;
  datasets: number;
  status: "active" | "queued" | "scout";
};

const PORTALS: Portal[] = [
  { id: "austin",   name: "data.austintexas.gov", city: "Austin",      lat: 30.2672, lng: -97.7431, datasets: 3720, status: "active" },
  { id: "dallas",   name: "dallasopendata.com",   city: "Dallas",      lat: 32.7767, lng: -96.7970, datasets: 1044, status: "active" },
  { id: "tx-state", name: "data.texas.gov",       city: "TX state",    lat: 30.2672, lng: -97.7431, datasets: 1051, status: "active" },
  { id: "sa",       name: "data.sanantonio.gov",  city: "San Antonio", lat: 29.4241, lng: -98.4936, datasets:  163, status: "queued" },
  { id: "houston",  name: "data.houstontx.gov",   city: "Houston",     lat: 29.7604, lng: -95.3698, datasets:   83, status: "queued" },
  { id: "elpaso",   name: "(future)",             city: "El Paso",     lat: 31.7619, lng: -106.4850, datasets:    0, status: "scout" },
];

const STATUS_COLOR: Record<Portal["status"], { ring: string; label: string }> = {
  active: { ring: "#10B981", label: "online" },
  queued: { ring: "#5B8DEF", label: "queued" },
  scout:  { ring: "#71717A", label: "scout-pending" },
};

// Real map needs to mount client-side (Leaflet pokes at window/document).
// next/dynamic with ssr:false keeps Next happy.
const LeafletMap = dynamic(() => import("./HeroTexasLeaflet"), {
  ssr: false,
  loading: () => (
    <div className="h-[360px] w-full animate-pulse rounded-md bg-[var(--ds-bg-elev)]" />
  ),
});

export function HeroTexasMap({ compact = false }: { compact?: boolean }) {
  const totalDatasets = useMemo(
    () => PORTALS.reduce((s, p) => s + p.datasets, 0),
    [],
  );
  const activeCount = PORTALS.filter((p) => p.status === "active").length;

  // Only render Leaflet after first client paint so SSR doesn't crash on
  // missing window globals (defense-in-depth on top of dynamic ssr:false).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className={`relative h-full ${compact ? "[&_.leaflet-container]:!h-full" : ""}`}>
      {mounted && <LeafletMap portals={PORTALS} statusColor={STATUS_COLOR} compact={compact} />}
      <div className="pointer-events-none absolute right-3 top-3 rounded-md border border-[var(--ds-border)] bg-[var(--ds-bg-elev)]/85 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ds-text-mute)] backdrop-blur">
        <div>
          Corpus · indexed
        </div>
        <div className="mt-0.5 text-[15px] font-semibold text-[var(--ds-text)] normal-case tracking-normal">
          {(totalDatasets / 1000).toFixed(1)}k <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--ds-text-mute)]">datasets</span>
        </div>
        <div className="mt-0.5 text-[10px] text-[var(--ds-text-dim)]">
          {activeCount} active · {PORTALS.length} portals
        </div>
      </div>
    </div>
  );
}
