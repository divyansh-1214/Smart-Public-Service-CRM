import { NextResponse } from "next/server";

type Geometry = {
  type: string;
  coordinates: any;
};

type Feature = {
  type: "Feature";
  properties: Record<string, any>;
  geometry: Geometry;
};

type FeatureCollection = {
  type: "FeatureCollection";
  name?: string;
  features: Feature[];
};

type Centroid = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: "ward" | "zone";
};

const WARD_URL = "https://webmap.mcd.gov.in/data/ward_3.js";
const ZONE_URL = "https://webmap.mcd.gov.in/data/zone_4.js";

function extractWrappedJson(raw: string): FeatureCollection {
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("Could not find JSON object boundaries in remote payload");
  }

  const json = raw.slice(firstBrace, lastBrace + 1);
  return JSON.parse(json) as FeatureCollection;
}

function toNormalizedName(properties: Record<string, any>, keys: string[]): string {
  for (const key of keys) {
    const value = properties[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return "Unknown";
}

function normalizeCollection(
  collection: FeatureCollection,
  kind: "ward" | "zone"
): FeatureCollection {
  const isWard = kind === "ward";

  return {
    ...collection,
    features: (collection.features ?? []).map((feature, index) => {
      const props = feature.properties ?? {};
      const name = isWard
        ? toNormalizedName(props, ["WARD_NAME", "ward_name", "name"])
        : toNormalizedName(props, ["ZONE_NAME", "zone_name", "name"]);

      const normalizedWardNo = props.WARD_NO ?? props.ward_no ?? null;

      return {
        ...feature,
        properties: {
          ...props,
          WARD_NAME: isWard ? name : props.WARD_NAME ?? null,
          ZONE_NAME: !isWard ? name : props.ZONE_NAME ?? null,
          NAME: name,
          KIND: kind,
          FEATURE_ID: `${kind}-${index}`,
          WARD_NO: isWard ? normalizedWardNo : null,
        },
      };
    }),
  };
}

function collectLngLatPairs(coordinates: any, out: [number, number][]) {
  if (!Array.isArray(coordinates)) return;

  if (
    coordinates.length >= 2 &&
    typeof coordinates[0] === "number" &&
    typeof coordinates[1] === "number"
  ) {
    out.push([coordinates[0], coordinates[1]]);
    return;
  }

  for (const item of coordinates) {
    collectLngLatPairs(item, out);
  }
}

function featureCentroid(feature: Feature): { lat: number; lng: number } | null {
  const pairs: [number, number][] = [];
  collectLngLatPairs(feature.geometry?.coordinates, pairs);

  if (pairs.length === 0) {
    return null;
  }

  let sumLng = 0;
  let sumLat = 0;

  for (const [lng, lat] of pairs) {
    sumLng += lng;
    sumLat += lat;
  }

  return {
    lng: sumLng / pairs.length,
    lat: sumLat / pairs.length,
  };
}

function buildCentroids(collection: FeatureCollection, kind: "ward" | "zone"): Centroid[] {
  return (collection.features ?? [])
    .map((feature, index) => {
      const centroid = featureCentroid(feature);
      if (!centroid) return null;

      const name =
        feature.properties?.NAME ||
        feature.properties?.WARD_NAME ||
        feature.properties?.ZONE_NAME ||
        `${kind}-${index}`;

      return {
        id: feature.properties?.FEATURE_ID ?? `${kind}-${index}`,
        name,
        lat: centroid.lat,
        lng: centroid.lng,
        kind,
      };
    })
    .filter((point): point is Centroid => point !== null);
}

export async function GET() {
  try {
    const [wardRes, zoneRes] = await Promise.all([fetch(WARD_URL), fetch(ZONE_URL)]);

    if (!wardRes.ok || !zoneRes.ok) {
      return NextResponse.json(
        {
          error: "Failed to download remote map data",
          status: {
            wards: wardRes.status,
            zones: zoneRes.status,
          },
        },
        { status: 502 }
      );
    }

    const [wardRaw, zoneRaw] = await Promise.all([wardRes.text(), zoneRes.text()]);

    const wards = normalizeCollection(extractWrappedJson(wardRaw), "ward");
    const zones = normalizeCollection(extractWrappedJson(zoneRaw), "zone");

    const wardCentroids = buildCentroids(wards, "ward");
    const zoneCentroids = buildCentroids(zones, "zone");

    return NextResponse.json(
      {
        wards,
        zones,
        centroids: {
          wards: wardCentroids,
          zones: zoneCentroids,
        },
        meta: {
          wardCount: wards.features.length,
          zoneCount: zones.features.length,
          wardCentroidCount: wardCentroids.length,
          zoneCentroidCount: zoneCentroids.length,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown parsing error";

    return NextResponse.json(
      {
        error: "Failed to parse remote map data",
        details: message,
      },
      { status: 500 }
    );
  }
}
