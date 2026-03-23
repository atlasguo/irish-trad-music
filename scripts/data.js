import { PLACEHOLDER_VALUE } from "./config.js";

const DATA_ROOT = new URL("../data/", import.meta.url);

const tuneMetadataPlaceholders = {
  source: PLACEHOLDER_VALUE,
  author: PLACEHOLDER_VALUE,
  copyright: PLACEHOLDER_VALUE,
  collection: PLACEHOLDER_VALUE,
  notes: PLACEHOLDER_VALUE,
};

const siteMetadata = {
  lines: [
    [
      { text: "Data from " },
      { text: "The Session", href: "https://thesession.org/" },
      { text: " and " },
      { text: "OpenStreetMap", href: "https://www.openstreetmap.org/" },

    ],
    [
      { text: "Compiled and shared by " },
      { text: "Benjamin Becquet", href: "https://bbecquet.net/" },

    ],
    [
      { text: "Cartography by Atlas Guo | " },
      { text: "Report an error", href: "mailto:cartoguophy@gmail.com" },
    ],
    [
      { text: "\u00A9 2026 " },
      { text: "CartoGuophy.com", href: "https://cartoguophy.com/" },
    ],
  ],
};

const CANONICAL_NEARBY_DUPLICATE_PLACE_IDS = new Map([
  ["way/1104729867", "node/52219009"], // Shannon
  ["way/530885739", "node/267762536"], // Crossmaglen
  ["way/1094049734", "node/52220609"], // Mullingar
  ["node/392014720", "way/4563495"], // Inis Oirr
  ["way/905065943", "node/60791902"], // Longford
  ["way/4558430", "node/1904206739"], // Inishbofin
  ["way/1105352904", "node/8408194337"], // Cloone
  ["way/1094733824", "node/52241941"], // Mohill
  ["way/123406473", "node/8018918710"], // Killaloe
  ["way/158742980", "node/5286382091"], // Lurgan
  ["way/473425713", "node/428339453"], // Limerick
  ["way/1093820208", "node/52226147"], // Drumshanbo
  ["way/1094207419", "node/52231291"], // Knock
]);

export const TUNE_TYPE_ORDER = [
  "barndance",
  "hornpipe",
  "jig",
  "march",
  "mazurka",
  "polka",
  "reel",
  "slide",
  "slipJig",
  "strathspey",
  "threeTwo",
  "waltz",
];

const BLOCK_MARKER_VERSION = "v8";
const RING_MARKER_VERSION = "v22";
const CONE_MARKER_VERSION = "v29";

export const TUNE_TYPE_DEFINITIONS = [
  { key: "barndance", label: "Barndance", color: "#ad5b46", mapsFrom: "barndance" },
  { key: "hornpipe", label: "Hornpipe", color: "#bf6946", mapsFrom: "hornpipe" },
  { key: "jig", label: "Jig", color: "#c97c4c", mapsFrom: "jig" },
  { key: "march", label: "March", color: "#ca9252", mapsFrom: "march" },
  { key: "mazurka", label: "Mazurka", color: "#c1a459", mapsFrom: "mazurka" },
  { key: "polka", label: "Polka", color: "#a7ac5d", mapsFrom: "polka" },
  { key: "reel", label: "Reel", color: "#81a061", mapsFrom: "reel" },
  { key: "slide", label: "Slide", color: "#638f74", mapsFrom: "slide" },
  { key: "slipJig", label: "Slip Jig", color: "#58858a", mapsFrom: "slip jig" },
  { key: "strathspey", label: "Strathspey", color: "#617b99", mapsFrom: "strathspey" },
  { key: "threeTwo", label: "Three-Two", color: "#7a6d9d", mapsFrom: "three-two" },
  { key: "waltz", label: "Waltz", color: "#956784", mapsFrom: "waltz" },
];

const TUNE_TYPE_DEFINITION_BY_KEY = new Map(
  TUNE_TYPE_DEFINITIONS.map((definition) => [definition.key, definition]),
);

function createEmptyTuneTypeCounts() {
  return {
    reel: 0,
    jig: 0,
    slipJig: 0,
    polka: 0,
    slide: 0,
    hornpipe: 0,
    threeTwo: 0,
    march: 0,
    waltz: 0,
    mazurka: 0,
    barndance: 0,
    strathspey: 0,
  };
}

export function getTuneTypeKey(type) {
  const normalizedType = String(type || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (normalizedType === "reel") {
    return "reel";
  }

  if (normalizedType === "jig") {
    return "jig";
  }

  if (normalizedType === "slip jig") {
    return "slipJig";
  }

  if (normalizedType === "polka") {
    return "polka";
  }

  if (normalizedType === "slide") {
    return "slide";
  }

  if (normalizedType === "hornpipe") {
    return "hornpipe";
  }

  if (normalizedType === "three two") {
    return "threeTwo";
  }

  if (normalizedType === "march") {
    return "march";
  }

  if (normalizedType === "waltz") {
    return "waltz";
  }

  if (normalizedType === "mazurka") {
    return "mazurka";
  }

  if (normalizedType === "barndance") {
    return "barndance";
  }

  if (normalizedType === "strathspey") {
    return "strathspey";
  }

  return null;
}

export function getTuneTypeColor(type) {
  const tuneTypeKey = getTuneTypeKey(type);
  return TUNE_TYPE_DEFINITION_BY_KEY.get(tuneTypeKey)?.color || "#8c8171";
}

export function formatTuneTypeLabel(type) {
  return String(type || "")
    .trim()
    .replace(/[_]+/g, " ")
    .split("-")
    .map((segment) =>
      segment
        .split(" ")
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" "),
    )
    .join("-");
}

export function summarizeTuneTypeCounts(tunes) {
  const counts = createEmptyTuneTypeCounts();

  (tunes || []).forEach((tune) => {
    const tuneTypeKey = getTuneTypeKey(tune.type);
    if (tuneTypeKey) {
      counts[tuneTypeKey] += 1;
    }
  });

  return counts;
}

export function buildBlockMarkerId(tuneTypeCounts) {
  const signature = TUNE_TYPE_ORDER
    .map((key) => String(tuneTypeCounts[key] || 0))
    .join("-");

  return `block-marker-${BLOCK_MARKER_VERSION}-${signature}`;
}

export function buildRingMarkerId(tuneTypeCounts) {
  const signature = TUNE_TYPE_ORDER
    .map((key) => String(tuneTypeCounts[key] || 0))
    .join("-");

  return `ring-marker-${RING_MARKER_VERSION}-${signature}`;
}

export function buildConeMarkerId(tuneTypeCounts) {
  const signature = TUNE_TYPE_ORDER
    .map((key) => String(tuneTypeCounts[key] || 0))
    .join("-");

  return `cone-marker-${CONE_MARKER_VERSION}-${signature}`;
}

export function normalizeForSearch(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function formatCoordinateLabel(coordinates) {
  const [longitude, latitude] = coordinates;
  const latDirection = latitude >= 0 ? "N" : "S";
  const lngDirection = longitude >= 0 ? "E" : "W";

  return `${Math.abs(latitude).toFixed(3)} deg ${latDirection}, ${Math.abs(
    longitude,
  ).toFixed(3)} deg ${lngDirection}`;
}

export function buildBoundsFromPlaces(places) {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;

  places.forEach((place) => {
    const [longitude, latitude] = place.coordinates;
    west = Math.min(west, longitude);
    south = Math.min(south, latitude);
    east = Math.max(east, longitude);
    north = Math.max(north, latitude);
  });

  return [
    [west, south],
    [east, north],
  ];
}

export function buildMapCollection(places) {
  return {
    type: "FeatureCollection",
    features: places.map((place) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: place.coordinates,
      },
      properties: {
        featureId: place.id,
        name: place.name,
        irishName: place.irishName || "",
        placeType: place.placeType,
        hasTunes: place.hasTunes ? 1 : 0,
        tuneCount: place.tuneCount,
        coneMaxCount: Math.max(
          ...TUNE_TYPE_ORDER.map((key) => place.tuneTypeCounts?.[key] || 0),
          0,
        ),
        blockMarkerId: place.blockMarkerId || "",
        ringMarkerId: place.ringMarkerId || "",
        coneMarkerId: place.coneMarkerId || "",
      },
    })),
  };
}

async function fetchJson(fileName) {
  const response = await fetch(new URL(fileName, DATA_ROOT));

  if (!response.ok) {
    throw new Error(`Unable to load ${fileName}`);
  }

  return response.json();
}

function sortByPlaceName(left, right) {
  const primary = left.name.localeCompare(right.name, "en");
  if (primary !== 0) {
    return primary;
  }

  return formatCoordinateLabel(left.coordinates).localeCompare(
    formatCoordinateLabel(right.coordinates),
    "en",
  );
}

function getCanonicalPlaceId(placeId) {
  return CANONICAL_NEARBY_DUPLICATE_PLACE_IDS.get(placeId) || placeId;
}

function mergeTuneReference(existingReference, nextReference) {
  if (!existingReference) {
    return nextReference;
  }

  const primaryName =
    existingReference.primaryName && existingReference.primaryName !== "Untitled tune"
      ? existingReference.primaryName
      : nextReference.primaryName;
  const alternateNames = [...new Set([
    ...existingReference.alternateNames,
    ...nextReference.alternateNames,
  ])];

  return {
    ...existingReference,
    primaryName,
    alternateNames,
    type: existingReference.type || nextReference.type,
  };
}

function buildTopPlacesChart(places) {
  const groupedPlaces = new Map();

  places.forEach((place) => {
    const group = groupedPlaces.get(place.name) || {
      label: place.name,
      placeIds: [],
      uniqueTuneIds: new Set(),
    };

    group.placeIds.push(place.id);
    place.tuneIds.forEach((tuneId) => {
      group.uniqueTuneIds.add(tuneId);
    });

    groupedPlaces.set(place.name, group);
  });

  return [...groupedPlaces.values()]
    .map((group) => ({
      label: group.label,
      placeIds: [...group.placeIds].sort((left, right) => left.localeCompare(right, "en")),
      value: group.uniqueTuneIds.size,
    }))
    .sort((left, right) => {
      if (right.value !== left.value) {
        return right.value - left.value;
      }

      return left.label.localeCompare(right.label, "en");
    })
    .slice(0, 10)
    .map((entry) => ({
      ...entry,
      placeId: entry.placeIds[0] || null,
    }));
}

export async function loadAtlasData() {
  const [placesGeoJson, linkedPlacesGeoJson, tunes] = await Promise.all([
    fetchJson("places.geojson"),
    fetchJson("tunesByPlaces.geojson"),
    fetchJson("tunes.json"),
  ]);

  const tuneById = new Map();
  tunes.forEach((tune) => {
    tuneById.set(String(tune.id), {
      ...tune,
      id: String(tune.id),
    });
  });

  const linkedPlaceById = new Map();
  linkedPlacesGeoJson.features.forEach((linkedPlace) => {
    linkedPlaceById.set(String(linkedPlace.id), linkedPlace);
  });

  const placeFeatureById = new Map();
  placesGeoJson.features.forEach((placeFeature) => {
    placeFeatureById.set(String(placeFeature.id), placeFeature);
  });

  const tunePlaceIdsById = new Map();
  const canonicalPlacesById = new Map();

  linkedPlacesGeoJson.features.forEach((linkedPlace) => {
    const sourcePlaceId = String(linkedPlace.id);
    const canonicalPlaceId = getCanonicalPlaceId(sourcePlaceId);
    const canonicalPlaceFeature =
      placeFeatureById.get(canonicalPlaceId) || placeFeatureById.get(sourcePlaceId);

    if (!canonicalPlaceFeature) {
      return;
    }

    const canonicalPlace =
      canonicalPlacesById.get(canonicalPlaceId) ||
      {
        id: canonicalPlaceId,
        name: canonicalPlaceFeature.properties.name,
        irishName: canonicalPlaceFeature.properties["name:ga"] || "",
        placeType: canonicalPlaceFeature.properties.place,
        coordinates: canonicalPlaceFeature.geometry.coordinates,
        hasTunes: false,
        tuneIds: [],
        tuneCount: 0,
        placeTuneRefs: [],
        tuneRefsById: new Map(),
        tunes: [],
      };

    linkedPlace.properties.tunes.forEach((tuneReference) => {
      const tuneId = String(tuneReference.id);
      const tuneRecord = tuneById.get(tuneId);

      if (!tuneRecord) {
        return;
      }

      const nextTuneReference = {
        id: tuneId,
        primaryName:
          tuneReference.names && tuneReference.names.length > 0
            ? tuneReference.names[0]
            : tuneRecord.names[0] || "Untitled tune",
        alternateNames:
          tuneReference.names && tuneReference.names.length > 1
            ? tuneReference.names.slice(1)
            : tuneRecord.names.slice(1),
        type: tuneReference.type || tuneRecord.type,
      };
      const mergedTuneReference = mergeTuneReference(
        canonicalPlace.tuneRefsById.get(tuneId),
        nextTuneReference,
      );
      canonicalPlace.tuneRefsById.set(tuneId, mergedTuneReference);

      const relatedPlaceIds = tunePlaceIdsById.get(tuneId) || new Set();
      relatedPlaceIds.add(canonicalPlaceId);
      tunePlaceIdsById.set(tuneId, relatedPlaceIds);
    });

    canonicalPlacesById.set(canonicalPlaceId, canonicalPlace);
  });

  const places = [...canonicalPlacesById.values()].map((place) => {
    const placeTuneRefs = [...place.tuneRefsById.values()].sort((left, right) =>
      left.primaryName.localeCompare(right.primaryName, "en"),
    );

    return {
      id: place.id,
      name: place.name,
      irishName: place.irishName,
      placeType: place.placeType,
      coordinates: place.coordinates,
      hasTunes: placeTuneRefs.length > 0,
      tuneIds: placeTuneRefs.map((tune) => tune.id),
      tuneCount: placeTuneRefs.length,
      placeTuneRefs,
      tunes: [],
    };
  });

  places.sort(sortByPlaceName);

  const placeNameCounts = new Map();
  places.forEach((place) => {
    placeNameCounts.set(place.name, (placeNameCounts.get(place.name) || 0) + 1);
  });

  const placesById = new Map();
  places.forEach((place) => {
    placesById.set(place.id, place);
  });

  const mappedTunes = [];
  const tunesById = new Map();

  tunePlaceIdsById.forEach((relatedPlaceIds, tuneId) => {
    const tune = tuneById.get(tuneId);
    if (!tune) {
      return;
    }

    const sortedRelatedPlaceIds = [...relatedPlaceIds]
      .filter((placeId) => placesById.has(placeId))
      .sort((leftId, rightId) =>
        sortByPlaceName(placesById.get(leftId), placesById.get(rightId)),
      );

    const enrichedTune = {
      id: tune.id,
      primaryName: tune.names[0] || "Untitled tune",
      alternateNames: tune.names.slice(1),
      type: tune.type,
      relatedPlaceIds: sortedRelatedPlaceIds,
      relatedPlaces: sortedRelatedPlaceIds
        .map((placeId) => placesById.get(placeId))
        .filter(Boolean),
      metadataPlaceholders: { ...tuneMetadataPlaceholders },
    };

    mappedTunes.push(enrichedTune);
    tunesById.set(tune.id, enrichedTune);
  });

  mappedTunes.sort((left, right) =>
    left.primaryName.localeCompare(right.primaryName, "en"),
  );

  places.forEach((place) => {
    const sortedTuneRefs = place.placeTuneRefs
      .filter((tune) => tunesById.has(tune.id))
      .sort((left, right) => left.primaryName.localeCompare(right.primaryName, "en"));

    place.placeTuneRefs = sortedTuneRefs;
    place.tuneIds = sortedTuneRefs.map((tune) => tune.id);
    place.tunes = sortedTuneRefs.map((tune) => {
      const tuneDetail = tunesById.get(tune.id);

      return {
        ...tune,
        relatedPlaceIds: tuneDetail ? tuneDetail.relatedPlaceIds : [],
        relatedPlaces: tuneDetail ? tuneDetail.relatedPlaces : [],
      };
    });
    place.tuneCount = sortedTuneRefs.length;
    place.tuneTypeCounts = summarizeTuneTypeCounts(place.tunes);
    place.blockMarkerId = buildBlockMarkerId(place.tuneTypeCounts);
    place.ringMarkerId = buildRingMarkerId(place.tuneTypeCounts);
    place.coneMarkerId = buildConeMarkerId(place.tuneTypeCounts);
  });

  const tuneTypeCounts = new Map();
  mappedTunes.forEach((tune) => {
    tuneTypeCounts.set(tune.type, (tuneTypeCounts.get(tune.type) || 0) + 1);
  });

  const tuneTypesChart = [...tuneTypeCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([rawType, value]) => ({ rawType, label: formatTuneTypeLabel(rawType), value }));

  const tuneTypeTotals = Object.fromEntries(
    TUNE_TYPE_ORDER.map((key) => {
      const definition = TUNE_TYPE_DEFINITION_BY_KEY.get(key);
      return [key, tuneTypeCounts.get(definition?.mapsFrom) || 0];
    }),
  );

  return {
    places,
    placesById,
    mappedTunes,
    tunesById,
    placeNameCounts,
    tuneTypes: tuneTypesChart.map((entry) => entry.rawType),
    metrics: [
      { label: "Places", value: places.length },
      { label: "Tunes", value: mappedTunes.length },
      { label: "Tune types", value: tuneTypesChart.length },
    ],
    tuneTypeTotals,
    topPlacesChart: buildTopPlacesChart(places),
    tuneTypesChart,
    siteMetadata: { ...siteMetadata },
    bounds: buildBoundsFromPlaces(places),
  };
}

