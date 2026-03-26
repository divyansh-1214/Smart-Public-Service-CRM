"use client";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { format } from "date-fns";

type Lead = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  ward?: string;
};

type GeoFeature = {
  type: "Feature";
  properties?: Record<string, any>;
  geometry: {
    type: string;
    coordinates: any;
  };
};

type FeatureCollection = {
  type: "FeatureCollection";
  features: GeoFeature[];
};

type Centroid = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: "ward" | "zone";
};

type WardsApiResponse = {
  wards: FeatureCollection;
  zones: FeatureCollection;
  centroids?: {
    wards?: Centroid[];
    zones?: Centroid[];
  };
};

type ComplaintMarker = {
  id: string;
  title: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "MINIMAL";
  status: string;
  ward?: string | null;
  locationAddress?: string | null;
  lat: number;
  lng: number;
  createdAt: string;
};

type ComplaintMapApiResponse = {
  data: ComplaintMarker[];
  meta?: {
    mode?: string;
    total?: number;
  };
};

interface Props {
  leads: Lead[];
}

export default function CRMMap({ leads }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedWard, setSelectedWard] = useState<string | null>(null);
  const [wardSearch, setWardSearch] = useState("");
  const [wardNames, setWardNames] = useState<string[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);
  const wardLayerRef = useRef<L.GeoJSON | null>(null);
  const zoneLayerRef = useRef<L.GeoJSON | null>(null);
  const complaintLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Init map centred on Delhi
    const map = L.map(containerRef.current).setView([28.6139, 77.209], 11);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    complaintLayerRef.current = L.layerGroup().addTo(map);

    // Load ward and zone GeoJSON from internal API route
    fetch("/api/wards")
      .then((r) => {
        if (!r.ok) {
          throw new Error(`Map data request failed with status ${r.status}`);
        }
        return r.json() as Promise<WardsApiResponse>;
      })
      .then((data) => {
        const names: string[] = [];

        const wardLayer = L.geoJSON(data.wards, {
          style: (feature) => ({
            color: "#4f46e5",
            weight: 1.5,
            fillOpacity:
              feature?.properties?.WARD_NAME === selectedWard ? 0.26 : 0.08,
            fillColor: "#6366f1",
          }),
          onEachFeature(feature, layer) {
            const wardName = feature.properties?.WARD_NAME || "Unknown";
            names.push(wardName);

            layer.bindPopup(
              `<b>Ward:</b> ${wardName}<br/><b>Ward No:</b> ${feature.properties?.WARD_NO ?? "—"}`
            );

            layer.on("click", () => {
              setSelectedWard(wardName);
            });
          },
        }).addTo(map);

        const zoneLayer = L.geoJSON(data.zones, {
          style: () => ({
            color: "#0ea5e9",
            weight: 2,
            fillOpacity: 0.02,
            fillColor: "#06b6d4",
          }),
          onEachFeature(feature, layer) {
            const zoneName = feature.properties?.ZONE_NAME || "Unknown";
            layer.bindPopup(`<b>Zone:</b> ${zoneName}`);
          },
        }).addTo(map);

        [...(data.centroids?.wards ?? []), ...(data.centroids?.zones ?? [])].forEach((point) => {
          L.circleMarker([point.lat, point.lng], {
            radius: point.kind === "ward" ? 2.5 : 2,
            fillColor: point.kind === "ward" ? "#6366f1" : "#0ea5e9",
            color: "#ffffff",
            weight: 0.5,
            fillOpacity: 0.8,
            opacity: 0.8,
          })
            .bindTooltip(point.name, { direction: "top", offset: [0, -4] })
            .addTo(map);
        });

        wardLayerRef.current = wardLayer;
        zoneLayerRef.current = zoneLayer;
        setWardNames([...new Set(names)].sort());
      })
      .catch((error) => {
        setMapError(error instanceof Error ? error.message : "Failed to load map layers");
      });

    fetch("/api/complaint?mode=map")
      .then((r) => {
        if (!r.ok) {
          throw new Error(`Complaint map request failed with status ${r.status}`);
        }

        return r.json() as Promise<ComplaintMapApiResponse>;
      })
      .then((payload) => {
        const complaints = payload.data ?? [];
        const complaintLayer = complaintLayerRef.current;

        if (!complaintLayer) return;

        const priorityColor: Record<ComplaintMarker["priority"], string> = {
          CRITICAL: "#be123c",
          HIGH: "#f97316",
          MEDIUM: "#2563eb",
          LOW: "#16a34a",
          MINIMAL: "#6b7280",
        };

        complaints.forEach((complaint) => {
          if (typeof complaint.lat !== "number" || typeof complaint.lng !== "number") return;

          L.circleMarker([complaint.lat, complaint.lng], {
            radius: 6,
            fillColor: priorityColor[complaint.priority] ?? "#2563eb",
            color: "#ffffff",
            weight: 1.5,
            fillOpacity: 0.9,
          })
            .bindPopup(
              `<b>${complaint.title}</b><br/>`
                + `Priority: ${complaint.priority}<br/>`
                + `Status: ${complaint.status}<br/>`
                + `${complaint.ward ? `Ward: ${complaint.ward}<br/>` : ""}`
                + `${complaint.locationAddress ? `Address: ${complaint.locationAddress}<br/>` : ""}`
                + `Logged: ${format(new Date(complaint.createdAt), "MMM d, yyyy h:mm a")}`
            )
            .addTo(complaintLayer);
        });
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Failed to load complaints on map";
        setMapError((prev) => (prev ? `${prev} | ${message}` : message));
      });

    // Add lead markers
    leads.forEach((lead) => {
      L.circleMarker([lead.lat, lead.lng], {
        radius: 7,
        fillColor: "#f43f5e",
        color: "#fff",
        weight: 1.5,
        fillOpacity: 0.9,
      })
        .bindPopup(`<b>${lead.name}</b>${lead.ward ? `<br/>Ward: ${lead.ward}` : ""}`)
        .addTo(map);
    });
  }, [leads]);

  // Fly to ward when selected from search
  const flyToWard = (wardName: string) => {
    setSelectedWard(wardName);
    wardLayerRef.current?.eachLayer((layer: any) => {
      if (layer.feature?.properties?.WARD_NAME === wardName) {
        mapRef.current?.fitBounds(layer.getBounds(), { padding: [40, 40] });
        layer.openPopup();
      }
    });
  };

  const filtered = wardNames.filter((w) =>
    w.toLowerCase().includes(wardSearch.toLowerCase())
  );

  return (
    <div style={{ display: "flex", height: "600px", gap: "12px", position: "relative" }}>
      {mapError ? (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 1000,
            background: "#fff1f2",
            color: "#9f1239",
            border: "1px solid #fecdd3",
            borderRadius: "8px",
            padding: "8px 10px",
            fontSize: "12px",
            maxWidth: "320px",
          }}
        >
          {mapError}
        </div>
      ) : null}

      {/* Ward search panel */}
      <div style={{ width: "220px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <input
          placeholder="Search ward..."
          value={wardSearch}
          onChange={(e) => setWardSearch(e.target.value)}
          style={{ padding: "8px", borderRadius: "6px", border: "1px solid #ddd" }}
        />
        <div style={{ overflowY: "auto", flex: 1, border: "1px solid #eee", borderRadius: "6px" }}>
          {filtered.map((ward) => (
            <div
              key={ward}
              onClick={() => flyToWard(ward)}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                background: selectedWard === ward ? "#ede9fe" : "transparent",
                fontSize: "13px",
              }}
            >
              {ward}
            </div>
          ))}
        </div>
      </div>

      {/* Map */}
      <div ref={containerRef} style={{ flex: 1, borderRadius: "8px", overflow: "hidden" }} />
    </div>
  );
}