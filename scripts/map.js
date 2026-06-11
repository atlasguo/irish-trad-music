import {
  MAPBOX_ACCESS_TOKEN,
  MAPBOX_STYLE,
  MAP_PADDING,
  SIDEBAR_BREAKPOINT,
  hasMapboxToken,
} from "./config.js";
import {
  buildMapCollection,
  formatTuneTypeLabel,
  getTuneTypeKey,
  TUNE_TYPE_DEFINITIONS,
  TUNE_TYPE_ORDER,
  getTuneTypeColor,
  getTuneTypeIconPath,
  getTuneTypeSymbolColor,
} from "./data.js";

const EMPTY_COLLECTION = {
  type: "FeatureCollection",
  features: [],
};

const PLACE_RADIUS_STOPS = [
  { count: 1, radius: 4.5 },
  { count: 4, radius: 8.5 },
  { count: 10, radius: 12.5 },
  { count: 20, radius: 17.5 },
  { count: 40, radius: 24 },
];
const PLACE_OPACITY_STOPS = [
  { zoom: 6, opacity: 0.7 },
  { zoom: 8, opacity: 0.95 },
];
const BLOCK_OPACITY_STOPS = [
  { zoom: 6, opacity: 0.7 },
  { zoom: 8, opacity: 0.95 },
];
const CONE_CLASS_STOPS = [
  { count: 0, radius: 50, lengthRatio: 0.08 },
  { count: 1, radius: 50, lengthRatio: 0.2 },
  { count: 2, radius: 51.25, lengthRatio: 0.3 },
  { count: 4, radius: 52.5, lengthRatio: 0.4 },
  { count: 10, radius: 53.75, lengthRatio: 0.5 },
  { count: 20, radius: 55, lengthRatio: 0.6 },
];
const CONE_OPACITY_STOPS = [
  { zoom: 6, opacity: 0.7 },
  { zoom: 8, opacity: 0.95 },
];
const RING_SHADOW_OPACITY_STOPS = [
  { zoom: 6, opacity: 0.16 },
  { zoom: 8, opacity: 0.28 },
];
const TOTAL_SHADOW_RADIUS_OFFSET = 4.5;
const RING_SHADOW_RADIUS_OFFSET = 4.5;
const TOTAL_SHADOW_BLUR = 0.62;
const RING_SHADOW_BLUR = 0.62;
const TOTAL_SHADOW_TRANSLATE = [1.5, 3];
const RING_SHADOW_TRANSLATE = [1.5, 3];
const MAP_MIN_ZOOM = 6;
const MAP_MAX_ZOOM = 14;
const MAX_BOUNDS_SAFETY_FACTOR = 0.05;
const MAX_MERCATOR_LATITUDE = 85.051129;
const PLACE_FILL_COLOR = [176, 113, 61];
const PLACE_STROKE_COLOR = [149, 91, 45];
const TOTAL_SHADOW_COLOR = [86, 86, 86];
const RING_SHADOW_COLOR = [86, 86, 86];
const ACTIVE_PLACE_STROKE_COLOR = [176, 113, 61];
const ACTIVE_PLACE_NON_TOTAL_STROKE_COLOR = [94, 94, 94];
const ACTIVE_PLACE_OUTER_STROKE_WIDTH = 4.2;
const ACTIVE_PLACE_OUTER_STROKE_WIDTH_TOTAL = 7;
const ACTIVE_PLACE_OUTER_STROKE_WIDTH_NON_TOTAL = 4.2;
const ACTIVE_PLACE_INNER_STROKE_WIDTH = 1.8;
const ACTIVE_PLACE_GLOW_RADIUS_OFFSET = 7;
const ACTIVE_PLACE_GLOW_OPACITY = 0.42;
const ACTIVE_PLACE_GLOW_BLUR = 0.82;
const ACTIVE_PLACE_RADIUS_OFFSET_TOTAL = 1.7;
const ACTIVE_PLACE_RADIUS_OFFSET_RING = 1.7;
const ACTIVE_PLACE_RADIUS_OFFSET_BLOCK = -(ACTIVE_PLACE_OUTER_STROKE_WIDTH / 2);
const ACTIVE_PLACE_RADIUS_SCALE_CONE_BLOCK = 1.5;
const PLACE_LABEL_COLOR = [41, 54, 52];
const PLACE_LABEL_HALO_COLOR = [255, 248, 233];
const MAP_MODE_TOTAL = "total";
const MAP_MODE_RING = "ring";
const MAP_MODE_CONE = "cone";
const MAP_MODE_BLOCK = "block";
const LABEL_MODE_BASEMAP = "basemap";
const LABEL_MODE_SYMBOL = "symbol";
const LABEL_MODE_OFF = "off";
const COUNTY_VISIBILITY_ON = "on";
const COUNTY_VISIBILITY_OFF = "off";
const COUNTY_SYMBOL_COLOR = [128, 88, 158];
const COUNTY_LAYER_IDS = [
  "county-boundaries-glow-wide-layer",
  "county-boundaries-glow-mid-layer",
  "county-boundaries-layer",
  "county-labels-layer",
];
const COUNTY_DATA_URL = new URL("../data/counties.geojson", import.meta.url).href;
const MAP_UI_ICONS = {
  legend: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor"><circle cx="2.5" cy="3" r="2"/><rect x="6" y="2" width="10" height="2" rx="1" opacity="0.65"/><circle cx="2.5" cy="8" r="2"/><rect x="6" y="7" width="10" height="2" rx="1" opacity="0.65"/><circle cx="2.5" cy="13" r="2"/><rect x="6" y="12" width="10" height="2" rx="1" opacity="0.65"/></svg>`,
};

function renderMapUiIcon(icon, className = "button-icon") {
  return `<span class="${className}" aria-hidden="true">${icon}</span>`;
}

function getTuneTypeFilterHref(type) {
  const tuneTypeKey = getTuneTypeKey(type);
  const searchParams = new URLSearchParams({ tab: "tunes" });

  if (tuneTypeKey) {
    searchParams.set("type", tuneTypeKey);
  }

  return `?${searchParams.toString()}`;
}

function renderTuneTypeLink(type, label = type, className = "") {
  const displayLabel = label === type ? formatTuneTypeLabel(type) : label;
  const normalizedClassName = className ? ` ${className}` : "";

  return `
    <a class="tune-type-link${normalizedClassName}" href="${escapeHtml(getTuneTypeFilterHref(type))}">
      <span>${escapeHtml(displayLabel)}</span>
    </a>
  `.trim();
}

const SYMBOL_LABEL_VISUAL_PRIORITY = [
  "right",
  "left",
  "top",
  "bottom",
  "top-right",
  "top-left",
  "bottom-right",
  "bottom-left",
];
const TOTAL_MARKER_STYLE_STOPS = [
  {
    count: 1,
    fillColor: [96, 154, 86],
    strokeColor: [61, 116, 55],
    labelColor: [56, 97, 51],
    stripeAngle: 45,
    imageId: "linked-place-total-marker-v5-1",
  },
  {
    count: 4,
    fillColor: [146, 176, 77],
    strokeColor: [106, 132, 38],
    labelColor: [91, 112, 31],
    stripeAngle: 22.5,
    imageId: "linked-place-total-marker-v5-5",
  },
  {
    count: 10,
    fillColor: [196, 178, 74],
    strokeColor: [151, 132, 31],
    labelColor: [126, 108, 18],
    stripeAngle: 0,
    imageId: "linked-place-total-marker-v5-10",
  },
  {
    count: 20,
    fillColor: [205, 142, 57],
    strokeColor: [159, 101, 22],
    labelColor: [132, 80, 14],
    stripeAngle: -22.5,
    imageId: "linked-place-total-marker-v5-20",
  },
  {
    count: 40,
    fillColor: [189, 113, 55],
    strokeColor: [146, 81, 32],
    labelColor: [122, 64, 21],
    stripeAngle: -45,
    imageId: "linked-place-total-marker-v5-40",
  },
];
const MARKER_RENDER_SCALE = 2;
const PLACE_MARKER_IMAGE_SIZE = 100 * MARKER_RENDER_SCALE;
const ACTIVE_PLACE_RECT_IMAGE_WIDTH = PLACE_MARKER_IMAGE_SIZE;
const ACTIVE_PLACE_RECT_IMAGE_HEIGHT = Math.round(PLACE_MARKER_IMAGE_SIZE * 0.9);
const ACTIVE_PLACE_RECT_SIZE_MULTIPLIER = 1.5;
const ACTIVE_PLACE_RECT_CACHE_VERSION = "v1";
const PLACE_MARKER_RADIUS = 42 * MARKER_RENDER_SCALE;
const PLACE_MARKER_STROKE_WIDTH = 3 * MARKER_RENDER_SCALE;
const TOTAL_TARGET_DISPLAY_STROKE_WIDTH = 1.55;
const TOTAL_TARGET_DISPLAY_STRIPE_WIDTH = 1.25;
const TOTAL_TARGET_DISPLAY_STRIPE_SPACING = 4.8;
const PLACE_MARKER_FILL_ALPHA = 0.8;
const PLACE_MARKER_STROKE_ALPHA = 0.96;
const PLACE_TEXTURE_COLOR = [255, 248, 233];
const PLACE_TEXTURE_ALPHA = 0.58;
const PLACE_TEXTURE_STRIPE_SPACING = 10 * MARKER_RENDER_SCALE;
const PLACE_TEXTURE_STRIPE_WIDTH = 4.2 * MARKER_RENDER_SCALE;
const BLOCK_MARKER_SCALE = 3;
const RING_MARKER_SCALE = 1;
const CONE_MARKER_SCALE = 2;
const CONE_MARKER_RENDER_SCALE = 3;
const CONE_MARKER_IMAGE_SIZE = 100 * CONE_MARKER_RENDER_SCALE;
const CONE_PLACE_MARKER_RADIUS = 42 * CONE_MARKER_RENDER_SCALE;
const RING_SECTOR_SHADOW_ALPHA = 0.22;
const RING_SECTOR_SHADOW_OFFSET_X = 1.2 * MARKER_RENDER_SCALE;
const RING_SECTOR_SHADOW_OFFSET_Y = 2.2 * MARKER_RENDER_SCALE;
const BLOCK_MARKER_CACHE_VERSION = "v9";
const RING_MARKER_CACHE_VERSION = "v27";
const CONE_MARKER_CACHE_VERSION = "v31";
const CATEGORY_SYMBOL_LINE_COLOR = [52, 52, 52];
const BLOCK_SYMBOL_LINE_COLOR = [255, 248, 233];
const RING_SYMBOL_LINE_COLOR = [255, 248, 233];
const CONE_SYMBOL_LINE_COLOR = [255, 248, 233];
const CONE_BASELINE_FILL_COLOR = [108, 108, 108];
const BLOCK_TARGET_DISPLAY_STROKE_WIDTH = 0.76;
const RING_TARGET_DISPLAY_STROKE_WIDTH = 0.9;
const CONE_TARGET_DISPLAY_STROKE_WIDTH = 0.84;
const CONE_ZERO_LENGTH_RATIO = 0.08;
const CONE_BASELINE_DISPLAY_RADIUS = 1.35;
const CONE_OUTER_RADIUS_RATIO = 0.88;
const CONE_ANGLE_GAP = 0;
const PLACE_FOCUS_ZOOM = 8.2;
const RING_INNER_RADIUS_RATIO = 1 / 3;
const BLOCK_CELL_DISPLAY_SIZE = 5.4;
const BLOCK_CELL_DISPLAY_GAP = 0.3;
const BLOCK_CELL_DISPLAY_PADDING = 7.7;
const BLOCK_CELL_DISPLAY_RADIUS = 1.56;
const cachedPlaceMarkerDataUrls = new Map();
const cachedBlockMarkerDataUrls = new Map();
const cachedBlockLegendMarkerDataUrls = new Map();
const cachedRingMarkerDataUrls = new Map();
const cachedRingLegendMarkerDataUrls = new Map();
const cachedConeMarkerDataUrls = new Map();
const cachedConeLegendMarkerDataUrls = new Map();
const cachedActivePlaceRectDataUrls = new Map();
let coneReferenceMaxCount = 1;
let ringTuneTypeDefinitions = TUNE_TYPE_DEFINITIONS;
const BLOCK_LEGEND_MARKER_COUNTS = Object.fromEntries(
  TUNE_TYPE_ORDER.map((key, index) => [key, TUNE_TYPE_ORDER.length - index]),
);
const RING_LEGEND_MARKER_COUNTS = {
  reel: 1,
  jig: 1,
  slipJig: 1,
  polka: 1,
  slide: 1,
  hornpipe: 1,
  threeTwo: 1,
  march: 1,
  waltz: 1,
  mazurka: 1,
  barndance: 1,
  strathspey: 1,
};
const CONE_LEGEND_RENDER_SCALE = 8;
const CONE_LEGEND_FILL_COLOR = [108, 108, 108];
const TUNE_TYPE_SYMBOL_COLOR_MAP = new Map(
  TUNE_TYPE_DEFINITIONS.map((d) => [d.key, d.squareIconFill]).filter(([, c]) => c),
);
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function rgbToCss(color) {
  return `rgb(${color.join(", ")})`;
}

function rgbaToCss(color, alpha) {
  return `rgba(${color.join(", ")}, ${alpha})`;
}

function darkenColor(color, factor = 0.78) {
  return color.map((channel) => Math.max(0, Math.round(channel * factor)));
}

function renderTuneTypeDot(type, label = type) {
  const displayLabel = label === type ? formatTuneTypeLabel(type) : label;
  return `
    <a class="tune-type-inline tune-type-link" href="${escapeHtml(getTuneTypeFilterHref(type))}">
      ${renderTuneTypeIcon(type)}
      <span>${escapeHtml(displayLabel)}</span>
    </a>
  `.trim();
}

function renderTuneTypeIcon(type, className = "", iconPath = getTuneTypeIconPath(type), color = null) {
  const normalizedClassName = className ? ` ${className}` : "";
  const fallbackColor = escapeHtml(color ?? getTuneTypeColor(type));

  if (!iconPath) {
    return `
      <span
        class="tune-type-icon${normalizedClassName}"
        style="--tune-type-color: ${fallbackColor}"
        aria-hidden="true"
      >
        <span class="tune-type-icon__fallback"></span>
      </span>
    `.trim();
  }

  return `
    <span
      class="tune-type-icon${normalizedClassName}"
      style="--tune-type-color: ${fallbackColor}"
      aria-hidden="true"
    >
      <img
        class="tune-type-icon__image"
        src="${escapeHtml(iconPath)}"
        alt=""
        onerror="this.hidden=true;this.nextElementSibling.hidden=false"
      >
      <span class="tune-type-icon__fallback" hidden></span>
    </span>
  `.trim();
}

function hexToRgb(hex) {
  const normalizedHex = hex.replace("#", "");
  const channels =
    normalizedHex.length === 3
      ? normalizedHex.split("").map((value) => value + value)
      : [normalizedHex.slice(0, 2), normalizedHex.slice(2, 4), normalizedHex.slice(4, 6)];

  return channels.map((channel) => Number.parseInt(channel, 16));
}

function getHighlightStrokeColorForPlace(place, mapMode) {
  const totalMarkerStyle = getTotalMarkerStyleForCount(place.tuneCount);
  return isNonTotalMapMode(mapMode)
    ? ACTIVE_PLACE_NON_TOTAL_STROKE_COLOR
    : darkenColor(totalMarkerStyle.strokeColor, 0.84);
}

function createHighlightedPlacesCollection(places, mapMode) {
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
        hasTunes: 1,
        tuneCount: place.tuneCount,
        activeStrokeColor: rgbToCss(getHighlightStrokeColorForPlace(place, mapMode)),
      },
    })),
  };
}

function createActivePlaceCollection(place, mapMode) {
  if (!place) {
    return EMPTY_COLLECTION;
  }

  return createHighlightedPlacesCollection([place], mapMode);
}

function getPlaceMarkerSvg(
  opacityScale = 1,
  fillColor = PLACE_FILL_COLOR,
  strokeColor = PLACE_STROKE_COLOR,
  markerStrokeWidth = PLACE_MARKER_STROKE_WIDTH,
  stripeAngleDegrees = 45,
  textureColor = strokeColor,
  textureStripeWidth = PLACE_TEXTURE_STRIPE_WIDTH,
  textureStripeSpacing = PLACE_TEXTURE_STRIPE_SPACING,
) {
  const center = PLACE_MARKER_IMAGE_SIZE / 2;
  const stripeOffset = textureStripeSpacing / 2;
  const stripePath = [
    `M ${-stripeOffset} ${stripeOffset} L ${stripeOffset} ${-stripeOffset}`,
    `M 0 ${textureStripeSpacing} L ${textureStripeSpacing} 0`,
    `M ${stripeOffset} ${textureStripeSpacing + stripeOffset} L ${textureStripeSpacing + stripeOffset} ${stripeOffset}`,
  ].join(" ");
  const fillAlpha = +(PLACE_MARKER_FILL_ALPHA * opacityScale).toFixed(3);
  const strokeAlpha = +(PLACE_MARKER_STROKE_ALPHA * opacityScale).toFixed(3);
  const textureAlpha = +(PLACE_TEXTURE_ALPHA * opacityScale).toFixed(3);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${PLACE_MARKER_IMAGE_SIZE}" height="${PLACE_MARKER_IMAGE_SIZE}" viewBox="0 0 ${PLACE_MARKER_IMAGE_SIZE} ${PLACE_MARKER_IMAGE_SIZE}">
      <defs>
        <clipPath id="place-marker-clip">
          <circle cx="${center}" cy="${center}" r="${PLACE_MARKER_RADIUS}" />
        </clipPath>
        <pattern
          id="place-marker-stripes"
          width="${textureStripeSpacing}"
          height="${textureStripeSpacing}"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(${stripeAngleDegrees} ${textureStripeSpacing / 2} ${textureStripeSpacing / 2})"
        >
          <path
            d="${stripePath}"
            stroke="${rgbaToCss(textureColor, textureAlpha)}"
            stroke-width="${textureStripeWidth}"
            stroke-linecap="square"
            fill="none"
          />
        </pattern>
      </defs>
      <circle
        cx="${center}"
        cy="${center}"
        r="${PLACE_MARKER_RADIUS}"
        fill="${rgbaToCss(fillColor, fillAlpha)}"
        stroke="${rgbaToCss(strokeColor, strokeAlpha)}"
        stroke-width="${markerStrokeWidth}"
      />
      <g clip-path="url(#place-marker-clip)">
        <rect
          x="0"
          y="0"
          width="${PLACE_MARKER_IMAGE_SIZE}"
          height="${PLACE_MARKER_IMAGE_SIZE}"
          fill="url(#place-marker-stripes)"
        />
      </g>
    </svg>
  `.trim();
}

function getPlaceMarkerDataUrl(
  opacityScale = 1,
  fillColor = PLACE_FILL_COLOR,
  strokeColor = PLACE_STROKE_COLOR,
  markerStrokeWidth = PLACE_MARKER_STROKE_WIDTH,
  stripeAngleDegrees = 45,
  textureColor = strokeColor,
  textureStripeWidth = PLACE_TEXTURE_STRIPE_WIDTH,
  textureStripeSpacing = PLACE_TEXTURE_STRIPE_SPACING,
) {
  const markerCacheKey = [
    opacityScale.toFixed(2),
    fillColor.join("-"),
    strokeColor.join("-"),
    markerStrokeWidth.toFixed(2),
    String(stripeAngleDegrees),
    textureColor.join("-"),
    textureStripeWidth.toFixed(2),
    textureStripeSpacing.toFixed(2),
  ].join("|");
  if (!cachedPlaceMarkerDataUrls.has(markerCacheKey)) {
    cachedPlaceMarkerDataUrls.set(
      markerCacheKey,
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        getPlaceMarkerSvg(
          opacityScale,
          fillColor,
          strokeColor,
          markerStrokeWidth,
          stripeAngleDegrees,
          textureColor,
          textureStripeWidth,
          textureStripeSpacing,
        ),
      )}`,
    );
  }

  return cachedPlaceMarkerDataUrls.get(markerCacheKey);
}

function resolveCenterPoint(center) {
  return typeof center === "number"
    ? { x: center, y: center }
    : { x: center.x, y: center.y };
}

function polarToCartesian(center, radius, angleDegrees) {
  const angleRadians = ((angleDegrees - 90) * Math.PI) / 180;
  const resolvedCenter = resolveCenterPoint(center);

  return {
    x: resolvedCenter.x + radius * Math.cos(angleRadians),
    y: resolvedCenter.y + radius * Math.sin(angleRadians),
  };
}

function buildSectorPath(center, radius, startAngle, endAngle) {
  const rawSweepAngle = endAngle - startAngle;
  const normalizedSweepAngle = (((rawSweepAngle % 360) + 360) % 360);
  const isFullCircle = Math.abs(rawSweepAngle) >= 359.999;
  const sweepAngle = isFullCircle ? 360 : normalizedSweepAngle;

  if (radius <= 0 || sweepAngle <= 0) {
    return "";
  }

  const startPoint = polarToCartesian(center, radius, startAngle);
  if (isFullCircle) {
    const midPoint = polarToCartesian(center, radius, startAngle + 180);

    return [
      `M ${center} ${center}`,
      `L ${startPoint.x} ${startPoint.y}`,
      `A ${radius} ${radius} 0 1 1 ${midPoint.x} ${midPoint.y}`,
      `A ${radius} ${radius} 0 1 1 ${startPoint.x} ${startPoint.y}`,
      "Z",
    ].join(" ");
  }

  const endPoint = polarToCartesian(center, radius, endAngle);
  const largeArcFlag = sweepAngle > 180 ? 1 : 0;

  return [
    `M ${center} ${center}`,
    `L ${startPoint.x} ${startPoint.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endPoint.x} ${endPoint.y}`,
    "Z",
  ].join(" ");
}

function buildDonutSectorPath(center, outerRadius, innerRadius, startAngle, endAngle) {
  const resolvedCenter = resolveCenterPoint(center);
  const rawSweepAngle = endAngle - startAngle;
  const normalizedSweepAngle = (((rawSweepAngle % 360) + 360) % 360);
  const isFullCircle = Math.abs(rawSweepAngle) >= 359.999;
  const sweepAngle = isFullCircle ? 360 : normalizedSweepAngle;

  if (outerRadius <= 0 || innerRadius < 0 || outerRadius <= innerRadius || sweepAngle <= 0) {
    return "";
  }

  if (isFullCircle) {
    return [
      `M ${resolvedCenter.x + outerRadius} ${resolvedCenter.y}`,
      `A ${outerRadius} ${outerRadius} 0 1 1 ${resolvedCenter.x - outerRadius} ${resolvedCenter.y}`,
      `A ${outerRadius} ${outerRadius} 0 1 1 ${resolvedCenter.x + outerRadius} ${resolvedCenter.y}`,
      `M ${resolvedCenter.x + innerRadius} ${resolvedCenter.y}`,
      `A ${innerRadius} ${innerRadius} 0 1 0 ${resolvedCenter.x - innerRadius} ${resolvedCenter.y}`,
      `A ${innerRadius} ${innerRadius} 0 1 0 ${resolvedCenter.x + innerRadius} ${resolvedCenter.y}`,
      "Z",
    ].join(" ");
  }

  const outerStart = polarToCartesian(center, outerRadius, startAngle);
  const outerEnd = polarToCartesian(center, outerRadius, endAngle);
  const innerEnd = polarToCartesian(center, innerRadius, endAngle);
  const innerStart = polarToCartesian(center, innerRadius, startAngle);
  const largeArcFlag = sweepAngle > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

function buildRoundedConePath(center, tipRadius, innerRadius, startAngle, endAngle) {
  const rawSweepAngle = endAngle - startAngle;
  const sweepAngle = (((rawSweepAngle % 360) + 360) % 360);

  if (tipRadius <= 0 || innerRadius < 0 || tipRadius <= innerRadius || sweepAngle <= 0) {
    return "";
  }

  const halfSweepRadians = ((sweepAngle / 2) * Math.PI) / 180;
  const sine = Math.sin(halfSweepRadians);
  const cosine = Math.cos(halfSweepRadians);

  if (sine <= 0 || cosine <= 0) {
    return buildDonutSectorPath(center, tipRadius, innerRadius, startAngle, endAngle);
  }

  const capCenterRadius = tipRadius / (1 + sine);
  const capRadius = capCenterRadius * sine;
  const tangencyRadius = capCenterRadius * cosine;

  if (capRadius <= 0 || tangencyRadius <= innerRadius) {
    return buildDonutSectorPath(center, tipRadius, innerRadius, startAngle, endAngle);
  }

  const outerStart = polarToCartesian(center, tangencyRadius, startAngle);
  const outerEnd = polarToCartesian(center, tangencyRadius, endAngle);
  const innerEnd = polarToCartesian(center, innerRadius, endAngle);
  const innerStart = polarToCartesian(center, innerRadius, startAngle);
  const largeArcFlag = sweepAngle > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${capRadius} ${capRadius} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

function getBlockMarkerCacheKey(tuneTypeCounts) {
  return `${BLOCK_MARKER_CACHE_VERSION}-${TUNE_TYPE_ORDER
    .map((key) => String(tuneTypeCounts[key] || 0))
    .join("-")}`;
}

function getRingMarkerCacheKey(tuneTypeCounts) {
  return `${RING_MARKER_CACHE_VERSION}-${TUNE_TYPE_ORDER
    .map((key) => String(tuneTypeCounts[key] || 0))
    .join("-")}`;
}

function getConeMarkerCacheKey(tuneTypeCounts) {
  return `${CONE_MARKER_CACHE_VERSION}-${TUNE_TYPE_ORDER
    .map((key) => String(tuneTypeCounts[key] || 0))
    .join("-")}`;
}

function getBlockStrokeWidthForCount(tuneCount) {
  const iconScale = getBlockMarkerIconSize(tuneCount);
  return +(BLOCK_TARGET_DISPLAY_STROKE_WIDTH / Math.max(iconScale, 0.001)).toFixed(2);
}

function getRingStrokeWidthForCount(tuneCount) {
  const iconScale = getRingMarkerIconSize(tuneCount);
  return +(RING_TARGET_DISPLAY_STROKE_WIDTH / Math.max(iconScale, 0.001)).toFixed(2);
}

function getRingOuterRadiusForCount(tuneCount) {
  const iconScale = Math.max(getRingMarkerIconSize(tuneCount), 0.001);
  const displayRadiusOffset = Math.max(
    0,
    (TOTAL_TARGET_DISPLAY_STROKE_WIDTH - RING_TARGET_DISPLAY_STROKE_WIDTH) / 2,
  );

  return PLACE_MARKER_RADIUS + (displayRadiusOffset / iconScale);
}

function getConeStrokeWidthForCount(tuneCount) {
  const iconScale = getConeMarkerIconSize(tuneCount);
  return +(CONE_TARGET_DISPLAY_STROKE_WIDTH / Math.max(iconScale, 0.001)).toFixed(2);
}

function getMaxTuneTypeCountForPlaces(places) {
  let maxCount = 0;

  (places || []).forEach((place) => {
    TUNE_TYPE_ORDER.forEach((key) => {
      maxCount = Math.max(maxCount, place.tuneTypeCounts?.[key] || 0);
    });
  });

  return maxCount;
}

function getRingCategoryFillColor(definition) {
  return rgbaToCss(darkenColor(hexToRgb(definition.color), 0.9), 1);
}

function getTuneTypeSymbolFillColor(definition) {
  return TUNE_TYPE_SYMBOL_COLOR_MAP.get(definition.key) || getRingCategoryFillColor(definition);
}

function getSymbolFillColor(key) {
  return TUNE_TYPE_SYMBOL_COLOR_MAP.get(key) || "#8c8171";
}

function createBlockLegendMarkerSvg(tuneTypeCounts, tuneCount, strokeScale = 1) {
  const center = PLACE_MARKER_IMAGE_SIZE / 2;
  const totalCount = TUNE_TYPE_ORDER.reduce(
    (sum, key) => sum + (tuneTypeCounts[key] || 0),
    0,
  );
  const iconScale = getBlockMarkerIconSize(tuneCount);
  const strokeWidth = +(
    (BLOCK_TARGET_DISPLAY_STROKE_WIDTH / Math.max(iconScale, 0.001)) *
    strokeScale
  ).toFixed(2);
  const sectorAngle = 360 / TUNE_TYPE_DEFINITIONS.length;
  const sectorSlices = totalCount > 0
    ? TUNE_TYPE_DEFINITIONS.flatMap((definition, index) => {
        const categoryCount = tuneTypeCounts[definition.key] || 0;
        if (categoryCount <= 0) {
          return [];
        }

        return [{
          definition,
          startAngle: index * sectorAngle,
          endAngle: (index + 1) * sectorAngle,
          radius: PLACE_MARKER_RADIUS * Math.sqrt(categoryCount / totalCount),
        }];
      })
    : [];

  const sectorMarkup = sectorSlices.map(({ definition, startAngle, endAngle, radius }) => `
      <path
        d="${buildSectorPath(center, radius, startAngle, endAngle)}"
        fill="${getTuneTypeSymbolFillColor(definition)}"
        stroke="${rgbaToCss(BLOCK_SYMBOL_LINE_COLOR, 0.96)}"
        stroke-width="${strokeWidth}"
        stroke-linejoin="round"
      />
    `).join("");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${PLACE_MARKER_IMAGE_SIZE}" height="${PLACE_MARKER_IMAGE_SIZE}" viewBox="0 0 ${PLACE_MARKER_IMAGE_SIZE} ${PLACE_MARKER_IMAGE_SIZE}">
      ${sectorMarkup}
    </svg>
  `.trim();
}

function createBlockMarkerSvg(tuneTypeCounts, tuneCount, strokeScale = 1) {
  const totalCount = TUNE_TYPE_ORDER.reduce(
    (sum, key) => sum + (tuneTypeCounts[key] || 0),
    0,
  );
  const iconScale = Math.max(getBlockMarkerIconSize(tuneCount), 0.001);
  const strokeWidth = +(getBlockStrokeWidthForCount(tuneCount) * strokeScale).toFixed(2);

  if (totalCount <= 0) {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${PLACE_MARKER_IMAGE_SIZE}" height="${PLACE_MARKER_IMAGE_SIZE}" viewBox="0 0 ${PLACE_MARKER_IMAGE_SIZE} ${PLACE_MARKER_IMAGE_SIZE}"></svg>
    `.trim();
  }

  const tuneSquares = ringTuneTypeDefinitions.flatMap((definition) =>
    Array.from({ length: tuneTypeCounts[definition.key] || 0 }, () => definition),
  );
  const columns = Math.ceil(Math.sqrt(totalCount));
  const rows = Math.ceil(totalCount / columns);
  const squareSize = BLOCK_CELL_DISPLAY_SIZE / iconScale;
  const gap = BLOCK_CELL_DISPLAY_GAP / iconScale;
  const padding = BLOCK_CELL_DISPLAY_PADDING / iconScale;
  const gridWidth = columns * squareSize + gap * Math.max(columns - 1, 0);
  const gridHeight = rows * squareSize + gap * Math.max(rows - 1, 0);
  const startX = Math.max((PLACE_MARKER_IMAGE_SIZE - gridWidth) / 2, padding);
  const startY = Math.max((PLACE_MARKER_IMAGE_SIZE - gridHeight) / 2, padding);
  const cornerRadius = BLOCK_CELL_DISPLAY_RADIUS / iconScale;

  const squaresMarkup = tuneSquares.map((definition, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = startX + column * (squareSize + gap);
    const y = startY + row * (squareSize + gap);

    return `
      <rect
        x="${x}"
        y="${y}"
        width="${squareSize}"
        height="${squareSize}"
        rx="${cornerRadius}"
        ry="${cornerRadius}"
        fill="${getTuneTypeSymbolFillColor(definition)}"
        stroke="${rgbaToCss(BLOCK_SYMBOL_LINE_COLOR, 0.96)}"
        stroke-width="${strokeWidth}"
      />
    `;
  }).join("");

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${PLACE_MARKER_IMAGE_SIZE}" height="${PLACE_MARKER_IMAGE_SIZE}" viewBox="0 0 ${PLACE_MARKER_IMAGE_SIZE} ${PLACE_MARKER_IMAGE_SIZE}">
      ${squaresMarkup}
    </svg>
  `.trim();
}

function createRingMarkerSvg(tuneTypeCounts, tuneCount, strokeScale = 1) {
  const center = PLACE_MARKER_IMAGE_SIZE / 2;
  const totalCount = TUNE_TYPE_ORDER.reduce(
    (sum, key) => sum + (tuneTypeCounts[key] || 0),
    0,
  );
  const strokeWidth = +(getRingStrokeWidthForCount(tuneCount) * strokeScale).toFixed(2);
  const outerRadius = getRingOuterRadiusForCount(tuneCount);
  const innerRadius = outerRadius * RING_INNER_RADIUS_RATIO;
  let currentAngle = 0;
  const nonZeroDefinitions = ringTuneTypeDefinitions.filter(
    (definition) => (tuneTypeCounts[definition.key] || 0) > 0,
  );
  const sectorSlices = totalCount > 0
    ? nonZeroDefinitions.map((definition, index) => {
        const categoryCount = tuneTypeCounts[definition.key] || 0;
        const sweepAngle =
          index === nonZeroDefinitions.length - 1
            ? 360 - currentAngle
            : (categoryCount / totalCount) * 360;
        const slice = {
          definition,
          startAngle: currentAngle,
          endAngle: currentAngle + sweepAngle,
        };
        currentAngle += sweepAngle;
        return slice;
      })
    : [];

  const sectorShadowMarkup = sectorSlices.map(({ startAngle, endAngle }) => `
      <path
        d="${buildDonutSectorPath(center, outerRadius, innerRadius, startAngle, endAngle)}"
        fill="${rgbaToCss(RING_SHADOW_COLOR, RING_SECTOR_SHADOW_ALPHA)}"
        transform="translate(${RING_SECTOR_SHADOW_OFFSET_X} ${RING_SECTOR_SHADOW_OFFSET_Y})"
      />
    `).join("");

  const sectorMarkup = sectorSlices.map(({ definition, startAngle, endAngle }) => `
      <path
        d="${buildDonutSectorPath(center, outerRadius, innerRadius, startAngle, endAngle)}"
        fill="${getTuneTypeSymbolFillColor(definition)}"
      />
    `).join("");

  const separatorMarkup = sectorSlices.length > 1
    ? sectorSlices.map(({ startAngle }) => {
        const outerPoint = polarToCartesian(center, outerRadius, startAngle);
        const innerPoint = polarToCartesian(center, innerRadius, startAngle);

        return `
      <line
        x1="${innerPoint.x}"
        y1="${innerPoint.y}"
        x2="${outerPoint.x}"
        y2="${outerPoint.y}"
        stroke="${rgbaToCss(RING_SYMBOL_LINE_COLOR, 0.96)}"
        stroke-width="${strokeWidth}"
        stroke-linecap="round"
      />
    `;
      }).join("")
    : "";

  const outerStrokeMarkup = sectorSlices.length > 0
    ? `
      <circle
        cx="${center}"
        cy="${center}"
        r="${outerRadius}"
        fill="none"
        stroke="${rgbaToCss(RING_SYMBOL_LINE_COLOR, 0.96)}"
        stroke-width="${strokeWidth}"
      />
      <circle
        cx="${center}"
        cy="${center}"
        r="${innerRadius}"
        fill="none"
        stroke="${rgbaToCss(RING_SYMBOL_LINE_COLOR, 0.96)}"
        stroke-width="${strokeWidth}"
      />
    `
    : "";

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${PLACE_MARKER_IMAGE_SIZE}" height="${PLACE_MARKER_IMAGE_SIZE}" viewBox="0 0 ${PLACE_MARKER_IMAGE_SIZE} ${PLACE_MARKER_IMAGE_SIZE}">
      ${sectorShadowMarkup}
      ${sectorMarkup}
      ${outerStrokeMarkup}
      ${separatorMarkup}
    </svg>
  `.trim();
}

function createConeMarkerSvg(tuneTypeCounts, tuneCount, strokeScale = 1) {
  const center = CONE_MARKER_IMAGE_SIZE / 2;
  const iconScale = Math.max(getConeMarkerIconSize(tuneCount), 0.001);
  const strokeWidth = +(getConeStrokeWidthForCount(tuneCount) * strokeScale).toFixed(2);
  const countsByDefinition = ringTuneTypeDefinitions.map((definition) => ({
    definition,
    count: tuneTypeCounts[definition.key] || 0,
  }));
  const innerRadius = CONE_BASELINE_DISPLAY_RADIUS / iconScale;
  const outerRadius = CONE_PLACE_MARKER_RADIUS * CONE_OUTER_RADIUS_RATIO;
  const slotAngle = 360 / ringTuneTypeDefinitions.length;

  const barMarkup = countsByDefinition
    .map(({ definition, count }, index) => {
      if (count <= 0) {
        return "";
      }

      const normalized = getConeLengthRatio(count);
      const barOuterRadius = innerRadius + (outerRadius - innerRadius) * normalized;
      const startAngle = index * slotAngle - slotAngle / 2 + CONE_ANGLE_GAP / 2;
      const endAngle = (index + 1) * slotAngle - slotAngle / 2 - CONE_ANGLE_GAP / 2;

      return `
      <path
        d="${buildRoundedConePath(center, barOuterRadius, innerRadius, startAngle, endAngle)}"
        fill="${getTuneTypeSymbolFillColor(definition)}"
        stroke="${rgbaToCss(CONE_SYMBOL_LINE_COLOR, 0.96)}"
        stroke-width="${strokeWidth}"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
    `;
    })
    .join("");

  const zeroBaselineCircleMarkup = `
      <circle
        cx="${center}"
        cy="${center}"
        r="${innerRadius}"
        fill="${rgbaToCss(CONE_BASELINE_FILL_COLOR, 0.96)}"
      />
    `;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${CONE_MARKER_IMAGE_SIZE}" height="${CONE_MARKER_IMAGE_SIZE}" viewBox="0 0 ${CONE_MARKER_IMAGE_SIZE} ${CONE_MARKER_IMAGE_SIZE}">
      ${barMarkup}
      ${zeroBaselineCircleMarkup}
    </svg>
  `.trim();
}

function createActivePlaceRectSvg(tuneCount) {
  const targetWidth = getActivePlaceRectTargetWidth(tuneCount);
  const iconScale = Math.max(targetWidth / ACTIVE_PLACE_RECT_IMAGE_WIDTH, 0.001);
  const outerStrokeWidth = +(ACTIVE_PLACE_OUTER_STROKE_WIDTH_TOTAL / iconScale).toFixed(2);
  const innerStrokeWidth = +(ACTIVE_PLACE_INNER_STROKE_WIDTH / iconScale).toFixed(2);
  const padding = +(0.5 / iconScale).toFixed(2);
  const inset = Math.max(outerStrokeWidth, innerStrokeWidth) / 2 + padding;
  const rectWidth = +(ACTIVE_PLACE_RECT_IMAGE_WIDTH - inset * 2).toFixed(2);
  const rectHeight = +(ACTIVE_PLACE_RECT_IMAGE_HEIGHT - inset * 2).toFixed(2);
  const cornerRadius = +(rectHeight * 0.24).toFixed(2);

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${ACTIVE_PLACE_RECT_IMAGE_WIDTH}" height="${ACTIVE_PLACE_RECT_IMAGE_HEIGHT}" viewBox="0 0 ${ACTIVE_PLACE_RECT_IMAGE_WIDTH} ${ACTIVE_PLACE_RECT_IMAGE_HEIGHT}">
      <rect
        x="${inset}"
        y="${inset}"
        width="${rectWidth}"
        height="${rectHeight}"
        rx="${cornerRadius}"
        ry="${cornerRadius}"
        fill="none"
        stroke="${rgbaToCss(ACTIVE_PLACE_NON_TOTAL_STROKE_COLOR, 0.96)}"
        stroke-width="${outerStrokeWidth}"
      />
      <rect
        x="${inset}"
        y="${inset}"
        width="${rectWidth}"
        height="${rectHeight}"
        rx="${cornerRadius}"
        ry="${cornerRadius}"
        fill="none"
        stroke="rgba(255, 248, 233, 0.96)"
        stroke-width="${innerStrokeWidth}"
      />
    </svg>
  `.trim();
}

function getConeLengthRatio(count) {
  if (count <= 0) {
    return 0;
  }

  return getConeClassValue(count, "lengthRatio");
}

function getConeLegendDisplayedOuterRadius(tuneCount) {
  const normalizedLength = getConeLengthRatio(tuneCount);
  return (
    CONE_BASELINE_DISPLAY_RADIUS +
    (getConeDisplayRadius(tuneCount) - CONE_BASELINE_DISPLAY_RADIUS) * normalizedLength
  );
}

function getConeLegendGeometry(tuneCount) {
  const strokeWidth = CONE_TARGET_DISPLAY_STROKE_WIDTH;
  const baselineRadius = CONE_BASELINE_DISPLAY_RADIUS;
  const outerRadius = getConeLegendDisplayedOuterRadius(tuneCount);
  const sweepAngle = Math.max(0, (360 / TUNE_TYPE_DEFINITIONS.length) - CONE_ANGLE_GAP);
  const halfSweepAngle = sweepAngle / 2;
  const halfSweepRadians = (halfSweepAngle * Math.PI) / 180;
  const sine = Math.sin(halfSweepRadians);
  const cosine = Math.cos(halfSweepRadians);
  const capRadius =
    sweepAngle <= 0 || sine <= 0
      ? 0
      : (outerRadius / (1 + sine)) * sine;
  const innerHalfWidth = baselineRadius * sine;
  const contentWidth = Math.max(capRadius * 2, innerHalfWidth * 2);
  const contentHeight = outerRadius - baselineRadius * cosine;
  const squareContentSize = Math.max(contentWidth, contentHeight);
  const inset = strokeWidth / 2 + 1.3;
  const squareSize = +(squareContentSize + inset * 2).toFixed(2);
  const center = {
    x: +(squareSize / 2).toFixed(2),
    y: +(((squareSize - contentHeight) / 2) + outerRadius).toFixed(2),
  };

  return {
    center,
    strokeWidth,
    baselineRadius,
    outerRadius,
    squareSize,
    startAngle: -halfSweepAngle,
    endAngle: halfSweepAngle,
  };
}

function createConeLegendMarkerSvg(tuneCount) {
  const geometry = getConeLegendGeometry(tuneCount);

  return `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="${Math.round(geometry.squareSize * CONE_LEGEND_RENDER_SCALE)}"
      height="${Math.round(geometry.squareSize * CONE_LEGEND_RENDER_SCALE)}"
      viewBox="0 0 ${geometry.squareSize} ${geometry.squareSize}"
    >
      <path
        d="${buildRoundedConePath(
          geometry.center,
          geometry.outerRadius,
          geometry.baselineRadius,
          geometry.startAngle,
          geometry.endAngle,
        )}"
        fill="${rgbaToCss(CONE_LEGEND_FILL_COLOR, 0.96)}"
        stroke="${rgbaToCss(CONE_SYMBOL_LINE_COLOR, 0.96)}"
        stroke-width="${geometry.strokeWidth}"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
    </svg>
  `.trim();
}

function createConeDirectionWheelSvg() {
  // Radial label layout. viewBox is slightly wider than the 236px content area (~0.944 scale),
  // sized so the longest label ("Strathspey") reaches exactly to either edge.
  // labelRadius is the maximum that fits "Strathspey" (longest label) at either edge.
  // gap = labelRadius − outerRadius must be ≥ fontSize/2 so top/bottom labels don't overlap the tip.
  const viewWidth = 250;
  const cx = 125;
  const cy = 65;
  const outerRadius = 48;
  const innerRadius = 5;
  const labelRadius = 55;
  const slotAngle = 360 / ringTuneTypeDefinitions.length;
  const strokeWidth = 1.3;
  const strokeColor = "rgba(255, 248, 233, 0.96)";
  const textFill = "rgba(19, 45, 41, 0.82)";
  const fontSize = 12;

  const sectorMarkup = ringTuneTypeDefinitions.map((definition, index) => {
    const startAngle = index * slotAngle - slotAngle / 2 + CONE_ANGLE_GAP / 2;
    const endAngle = index * slotAngle + slotAngle / 2 - CONE_ANGLE_GAP / 2;
    const tuneTypeHref = getTuneTypeFilterHref(definition.key);

    return `
      <a class="cone-legend__link tune-type-link" href="${escapeHtml(tuneTypeHref)}" aria-label="${escapeHtml(definition.label)}">
        <path
          d="${buildRoundedConePath({ x: cx, y: cy }, outerRadius, innerRadius, startAngle, endAngle)}"
          fill="${getTuneTypeSymbolFillColor(definition)}"
          stroke="${strokeColor}"
          stroke-width="${strokeWidth}"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
      </a>`;
  }).join("");

  const labelMarkup = ringTuneTypeDefinitions.map((definition, index) => {
    const centerAngle = index * slotAngle;
    const angleRad = (centerAngle * Math.PI) / 180;
    const lx = +(cx + labelRadius * Math.sin(angleRad)).toFixed(1);
    const ly = +(cy - labelRadius * Math.cos(angleRad)).toFixed(1);
    const xDiff = lx - cx;
    const textAnchor = xDiff > 8 ? "start" : xDiff < -8 ? "end" : "middle";
    const tuneTypeHref = getTuneTypeFilterHref(definition.key);

    return `
      <a class="cone-legend__link tune-type-link" href="${escapeHtml(tuneTypeHref)}" aria-label="${escapeHtml(definition.label)}">
        <text x="${lx}" y="${ly}"
          font-size="${fontSize}" font-family="Manrope, sans-serif" font-weight="500"
          fill="${textFill}" text-anchor="${textAnchor}" dominant-baseline="central"
        >${escapeHtml(definition.label)}</text>
      </a>`;
  }).join("");

  const viewHeight = cy + labelRadius + 14;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewWidth} ${viewHeight}" style="width: 100%; max-width: 250px; display: block; margin: 0 auto;" aria-label="Cone tune type legend" role="img">
      ${sectorMarkup}
      <circle cx="${cx}" cy="${cy}" r="3" fill="rgba(70, 70, 70, 0.88)" />
      ${labelMarkup}
    </svg>`.trim();
}

function getBlockMarkerDataUrl(tuneTypeCounts, tuneCount) {
  const cacheKey = `${getBlockMarkerCacheKey(tuneTypeCounts)}-${tuneCount}`;
  if (!cachedBlockMarkerDataUrls.has(cacheKey)) {
    cachedBlockMarkerDataUrls.set(
      cacheKey,
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        createBlockMarkerSvg(tuneTypeCounts, tuneCount),
      )}`,
    );
  }

  return cachedBlockMarkerDataUrls.get(cacheKey);
}

function getRingMarkerDataUrl(tuneTypeCounts, tuneCount) {
  const cacheKey = `${getRingMarkerCacheKey(tuneTypeCounts)}-${tuneCount}`;
  if (!cachedRingMarkerDataUrls.has(cacheKey)) {
    cachedRingMarkerDataUrls.set(
      cacheKey,
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        createRingMarkerSvg(tuneTypeCounts, tuneCount),
      )}`,
    );
  }

  return cachedRingMarkerDataUrls.get(cacheKey);
}

function getConeMarkerDataUrl(tuneTypeCounts, tuneCount) {
  const cacheKey = `${getConeMarkerCacheKey(tuneTypeCounts)}-${tuneCount}`;
  if (!cachedConeMarkerDataUrls.has(cacheKey)) {
    cachedConeMarkerDataUrls.set(
      cacheKey,
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        createConeMarkerSvg(tuneTypeCounts, tuneCount),
      )}`,
    );
  }

  return cachedConeMarkerDataUrls.get(cacheKey);
}

function getBlockLegendMarkerDataUrl(tuneTypeCounts, tuneCount) {
  const cacheKey = `${getBlockMarkerCacheKey(tuneTypeCounts)}-${tuneCount}`;
  if (!cachedBlockLegendMarkerDataUrls.has(cacheKey)) {
    cachedBlockLegendMarkerDataUrls.set(
      cacheKey,
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        createBlockLegendMarkerSvg(tuneTypeCounts, tuneCount, 1),
      )}`,
    );
  }

  return cachedBlockLegendMarkerDataUrls.get(cacheKey);
}

function getRingLegendMarkerDataUrl(tuneTypeCounts, tuneCount) {
  const cacheKey = `${getRingMarkerCacheKey(tuneTypeCounts)}-${tuneCount}`;
  if (!cachedRingLegendMarkerDataUrls.has(cacheKey)) {
    cachedRingLegendMarkerDataUrls.set(
      cacheKey,
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        createRingMarkerSvg(tuneTypeCounts, tuneCount, 1),
      )}`,
    );
  }

  return cachedRingLegendMarkerDataUrls.get(cacheKey);
}

function getConeLegendMarkerDataUrl(tuneCount) {
  const cacheKey = `${CONE_MARKER_CACHE_VERSION}-legend-${tuneCount}`;
  if (!cachedConeLegendMarkerDataUrls.has(cacheKey)) {
    cachedConeLegendMarkerDataUrls.set(
      cacheKey,
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        createConeLegendMarkerSvg(tuneCount),
      )}`,
    );
  }

  return cachedConeLegendMarkerDataUrls.get(cacheKey);
}

function getActivePlaceRectDataUrl(tuneCount) {
  const cacheKey = `${ACTIVE_PLACE_RECT_CACHE_VERSION}-${tuneCount}`;
  if (!cachedActivePlaceRectDataUrls.has(cacheKey)) {
    cachedActivePlaceRectDataUrls.set(
      cacheKey,
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        createActivePlaceRectSvg(tuneCount),
      )}`,
    );
  }

  return cachedActivePlaceRectDataUrls.get(cacheKey);
}

function getActivePlaceRectImageId(tuneCount) {
  return `active-place-rect-${ACTIVE_PLACE_RECT_CACHE_VERSION}-${tuneCount}`;
}

function getPlaceMarkerIconSize(tuneCount) {
  return (getPlaceRadius(tuneCount) * 2) / (PLACE_MARKER_RADIUS * 2);
}

function getContinuousPlaceRadius(tuneCount) {
  return interpolateStops(tuneCount, PLACE_RADIUS_STOPS, "count", "radius");
}

function getBlockMarkerIconSize(tuneCount) {
  return getPlaceMarkerIconSize(tuneCount) * BLOCK_MARKER_SCALE;
}

function getRingMarkerIconSize(tuneCount) {
  return getPlaceMarkerIconSize(tuneCount) * RING_MARKER_SCALE;
}

function getConeMarkerIconSize(tuneCount) {
  return getConeDisplayRadius(tuneCount) / (CONE_PLACE_MARKER_RADIUS * CONE_OUTER_RADIUS_RATIO);
}

function getActivePlaceRectTargetWidth(tuneCount) {
  return (
    (getPlaceRadius(tuneCount) + ACTIVE_PLACE_RADIUS_OFFSET_RING) *
    2 *
    ACTIVE_PLACE_RECT_SIZE_MULTIPLIER
  );
}

function buildActivePlaceRectIconSizeExpression() {
  const [firstStop, ...remainingStops] = PLACE_RADIUS_STOPS;

  return [
    "step",
    ["get", "tuneCount"],
    getActivePlaceRectTargetWidth(firstStop.count) / ACTIVE_PLACE_RECT_IMAGE_WIDTH,
    ...remainingStops.flatMap((stop) => [
      stop.count,
      getActivePlaceRectTargetWidth(stop.count) / ACTIVE_PLACE_RECT_IMAGE_WIDTH,
    ]),
  ];
}

function buildActivePlaceRectImageExpression() {
  const [firstStop, ...remainingStops] = PLACE_RADIUS_STOPS;

  return [
    "step",
    ["get", "tuneCount"],
    getActivePlaceRectImageId(firstStop.count),
    ...remainingStops.flatMap((stop) => [stop.count, getActivePlaceRectImageId(stop.count)]),
  ];
}

function buildConeRadiusExpression(offset = 0) {
  return buildRadiusExpression(CONE_CLASS_STOPS, 1, offset);
}

function getLegendMarkerRenderSize(tuneCount, mapMode) {
  const iconSize =
    mapMode === MAP_MODE_BLOCK
      ? getBlockMarkerIconSize(tuneCount)
      : mapMode === MAP_MODE_RING
        ? getRingMarkerIconSize(tuneCount)
        : mapMode === MAP_MODE_CONE
          ? getConeMarkerIconSize(tuneCount)
        : getPlaceMarkerIconSize(tuneCount);

  return (mapMode === MAP_MODE_CONE ? CONE_MARKER_IMAGE_SIZE : PLACE_MARKER_IMAGE_SIZE) * iconSize;
}

function getConeLegendMarkerRenderSize(tuneCount) {
  return getConeLegendGeometry(tuneCount).squareSize;
}

function getLegendRowMarkerRenderSize(tuneCount, mapMode) {
  return mapMode === MAP_MODE_CONE
    ? getConeLegendMarkerRenderSize(tuneCount)
    : getLegendMarkerRenderSize(tuneCount, mapMode);
}

function getTotalStrokeWidthForCount(tuneCount) {
  const iconScale = getPlaceMarkerIconSize(tuneCount);
  return +(TOTAL_TARGET_DISPLAY_STROKE_WIDTH / Math.max(iconScale, 0.001)).toFixed(2);
}

function getTotalStripeWidthForCount(tuneCount) {
  const iconScale = getPlaceMarkerIconSize(tuneCount);
  return +(TOTAL_TARGET_DISPLAY_STRIPE_WIDTH / Math.max(iconScale, 0.001)).toFixed(2);
}

function getTotalStripeSpacingForCount(tuneCount) {
  const iconScale = getPlaceMarkerIconSize(tuneCount);
  return +(TOTAL_TARGET_DISPLAY_STRIPE_SPACING / Math.max(iconScale, 0.001)).toFixed(2);
}

function getTotalMarkerStyleForCount(tuneCount) {
  let currentStyle = TOTAL_MARKER_STYLE_STOPS[0];

  for (let index = 1; index < TOTAL_MARKER_STYLE_STOPS.length; index += 1) {
    if (tuneCount >= TOTAL_MARKER_STYLE_STOPS[index].count) {
      currentStyle = TOTAL_MARKER_STYLE_STOPS[index];
      continue;
    }

    break;
  }

  return currentStyle;
}

function buildTotalMarkerImageExpression() {
  const [firstStyle, ...remainingStyles] = TOTAL_MARKER_STYLE_STOPS;

  return [
    "step",
    ["get", "tuneCount"],
    firstStyle.imageId,
    ...remainingStyles.flatMap((style) => [style.count, style.imageId]),
  ];
}

function loadPlaceMarkerImage(
  opacityScale,
  fillColor = PLACE_FILL_COLOR,
  strokeColor = PLACE_STROKE_COLOR,
  markerStrokeWidth = PLACE_MARKER_STROKE_WIDTH,
  stripeAngleDegrees = 45,
  textureColor = strokeColor,
  textureStripeWidth = PLACE_TEXTURE_STRIPE_WIDTH,
  textureStripeSpacing = PLACE_TEXTURE_STRIPE_SPACING,
) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => {
      reject(new Error("Unable to create the textured place marker image."));
    };
    image.src = getPlaceMarkerDataUrl(
      opacityScale,
      fillColor,
      strokeColor,
      markerStrokeWidth,
      stripeAngleDegrees,
      textureColor,
      textureStripeWidth,
      textureStripeSpacing,
    );
  });
}

function loadMarkerImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to create the map marker image."));
    image.src = dataUrl;
  });
}

function getPlaceRadius(tuneCount) {
  let currentRadius = PLACE_RADIUS_STOPS[0].radius;

  for (let index = 1; index < PLACE_RADIUS_STOPS.length; index += 1) {
    if (tuneCount >= PLACE_RADIUS_STOPS[index].count) {
      currentRadius = PLACE_RADIUS_STOPS[index].radius;
      continue;
    }

    break;
  }

  return currentRadius;
}

function getConeClassValue(tuneCount, key) {
  let currentValue = CONE_CLASS_STOPS[0][key];

  for (let index = 1; index < CONE_CLASS_STOPS.length; index += 1) {
    if (tuneCount >= CONE_CLASS_STOPS[index].count) {
      currentValue = CONE_CLASS_STOPS[index][key];
      continue;
    }

    break;
  }

  return currentValue;
}

function getConeDisplayRadius(tuneCount) {
  return getConeClassValue(tuneCount, "radius");
}

function interpolateStops(value, stops, inputKey, outputKey) {
  if (value <= stops[0][inputKey]) {
    return stops[0][outputKey];
  }

  for (let index = 1; index < stops.length; index += 1) {
    const previous = stops[index - 1];
    const current = stops[index];

    if (value <= current[inputKey]) {
      const ratio =
        (value - previous[inputKey]) / (current[inputKey] - previous[inputKey]);

      return previous[outputKey] + ratio * (current[outputKey] - previous[outputKey]);
    }
  }

  return stops[stops.length - 1][outputKey];
}

function getPlaceFillOpacityForZoom(zoom) {
  return interpolateStops(zoom, PLACE_OPACITY_STOPS, "zoom", "opacity");
}

function getBlockFillOpacityForZoom(zoom) {
  return interpolateStops(zoom, BLOCK_OPACITY_STOPS, "zoom", "opacity");
}

function getConeFillOpacityForZoom(zoom) {
  return interpolateStops(zoom, CONE_OPACITY_STOPS, "zoom", "opacity");
}

function getRingShadowOpacityForZoom(zoom) {
  return interpolateStops(zoom, RING_SHADOW_OPACITY_STOPS, "zoom", "opacity");
}

function isNonTotalMapMode(mapMode) {
  return mapMode === MAP_MODE_BLOCK || mapMode === MAP_MODE_RING || mapMode === MAP_MODE_CONE;
}

function getMapModeMarkerScale(mapMode) {
  if (mapMode === MAP_MODE_RING) {
    return RING_MARKER_SCALE;
  }

  if (mapMode === MAP_MODE_BLOCK) {
    return BLOCK_MARKER_SCALE;
  }

  return mapMode === MAP_MODE_CONE ? CONE_MARKER_SCALE : 1;
}

function getActivePlaceRadiusOffsetForMode(mapMode) {
  if (mapMode === MAP_MODE_TOTAL) {
    return ACTIVE_PLACE_RADIUS_OFFSET_TOTAL;
  }

  if (mapMode === MAP_MODE_RING) {
    return ACTIVE_PLACE_RADIUS_OFFSET_RING;
  }

  if (mapMode === MAP_MODE_CONE) {
    return ACTIVE_PLACE_RADIUS_OFFSET_RING;
  }

  return ACTIVE_PLACE_RADIUS_OFFSET_BLOCK;
}

function getMarkerOpacityForZoom(zoom, mapMode) {
  if (mapMode === MAP_MODE_BLOCK) {
    return getBlockFillOpacityForZoom(zoom);
  }

  if (mapMode === MAP_MODE_CONE) {
    return getConeFillOpacityForZoom(zoom);
  }

  return isNonTotalMapMode(mapMode)
    ? getBlockFillOpacityForZoom(zoom)
    : getPlaceFillOpacityForZoom(zoom);
}

function buildActivePlaceRadiusExpressionForMode(mapMode) {
  if (mapMode === MAP_MODE_CONE || mapMode === MAP_MODE_BLOCK) {
    return buildRadiusExpression(
      PLACE_RADIUS_STOPS,
      getMapModeMarkerScale(MAP_MODE_RING),
      getActivePlaceRadiusOffsetForMode(MAP_MODE_RING),
      ACTIVE_PLACE_RADIUS_SCALE_CONE_BLOCK,
    );
  }

  return buildRadiusExpression(
    PLACE_RADIUS_STOPS,
    getMapModeMarkerScale(mapMode),
    getActivePlaceRadiusOffsetForMode(mapMode),
  );
}

function getActivePlaceOuterStrokeWidthForMode(mapMode) {
  return ACTIVE_PLACE_OUTER_STROKE_WIDTH_TOTAL;
}

function getPlaceStrokeOpacity(fillOpacity) {
  return Math.min(fillOpacity + 0.18, 0.72);
}

function getPlaceShadowOpacity(fillOpacity) {
  return Math.min(0.1 + fillOpacity * 0.18, 0.24);
}

function getMapShadowColor(mapMode) {
  return mapMode === MAP_MODE_RING ? RING_SHADOW_COLOR : TOTAL_SHADOW_COLOR;
}

function buildRadiusExpression(radiusStops, multiplier = 1, offset = 0, finalScale = 1) {
  const [firstStop, ...remainingStops] = radiusStops;

  return [
    "step",
    ["get", "tuneCount"],
    (firstStop.radius * multiplier + offset) * finalScale,
    ...remainingStops.flatMap((stop) => [
      stop.count,
      (stop.radius * multiplier + offset) * finalScale,
    ]),
  ];
}

function buildIconSizeExpression(sizeBuilder, stops = PLACE_RADIUS_STOPS) {
  const [firstStop, ...remainingStops] = stops;

  return [
    "step",
    ["get", "tuneCount"],
    sizeBuilder(firstStop.count),
    ...remainingStops.flatMap((stop) => [stop.count, sizeBuilder(stop.count)]),
  ];
}

function buildInterpolatedIconSizeExpression(sizeBuilder, stops = PLACE_RADIUS_STOPS) {
  const [firstStop, ...remainingStops] = stops;

  return [
    "interpolate",
    ["linear"],
    ["get", "tuneCount"],
    firstStop.count,
    sizeBuilder(firstStop.count),
    ...remainingStops.flatMap((stop) => [stop.count, sizeBuilder(stop.count)]),
  ];
}

function buildTotalLabelColorExpression() {
  const [firstStyle, ...remainingStyles] = TOTAL_MARKER_STYLE_STOPS;

  return [
    "step",
    ["get", "tuneCount"],
    rgbToCss(firstStyle.labelColor),
    ...remainingStyles.flatMap((style) => [style.count, rgbToCss(style.labelColor)]),
  ];
}

function buildFlatCountStepExpression(flatStops) {
  const [firstCount, firstValue, ...remainingStops] = flatStops;

  return [
    "step",
    ["get", "tuneCount"],
    firstValue,
    ...remainingStops,
  ];
}

function getFlatStopValue(flatStops, inputValue) {
  let currentValue = flatStops[1];

  for (let index = 2; index < flatStops.length; index += 2) {
    const stopValue = flatStops[index];
    const nextValue = flatStops[index + 1];

    if (inputValue >= stopValue) {
      currentValue = nextValue;
      continue;
    }

    break;
  }

  return currentValue;
}

function getSizeStopsForMode(mapMode) {
  return mapMode === MAP_MODE_CONE ? CONE_CLASS_STOPS : PLACE_RADIUS_STOPS;
}

function getPlaceSizeRangeLabel(count, mapMode = MAP_MODE_TOTAL) {
  const sizeStops = getSizeStopsForMode(mapMode);
  const currentIndex = sizeStops.findIndex((stop) => stop.count === count);
  if (currentIndex === -1) {
    return String(count);
  }

  const nextStop = sizeStops[currentIndex + 1];
  if (!nextStop) {
    return `${count}+`;
  }

  const upperBound = nextStop.count - 1;
  return upperBound <= count ? String(count) : `${count}-${upperBound}`;
}

function getPlaceSizeClassCount(tuneCount, mapMode = MAP_MODE_TOTAL) {
  const sizeStops = getSizeStopsForMode(mapMode);
  let currentClassCount = sizeStops[0].count;

  for (let index = 1; index < sizeStops.length; index += 1) {
    if (tuneCount >= sizeStops[index].count) {
      currentClassCount = sizeStops[index].count;
      continue;
    }

    break;
  }

  return currentClassCount;
}

function summarizePlaceSizeClasses(places, mapMode = MAP_MODE_TOTAL) {
  const sizeStops = getSizeStopsForMode(mapMode);
  const counts = Object.fromEntries(
    sizeStops.map((stop) => [String(stop.count), 0]),
  );

  (places || []).forEach((place) => {
    const classCount = getPlaceSizeClassCount(place.tuneCount, mapMode);
    counts[String(classCount)] += 1;
  });

  return counts;
}

function getDefaultViewportPadding() {
  const horizontalPadding =
    Number.isFinite(MAP_PADDING.left) && MAP_PADDING.left >= 0
      ? MAP_PADDING.left
      : MAP_PADDING.right;

  return {
    top: MAP_PADDING.top,
    right: MAP_PADDING.right,
    bottom: MAP_PADDING.bottom,
    left: horizontalPadding,
  };
}

function getMapPadding(viewportPadding = {}) {
  const defaultPadding = getDefaultViewportPadding();

  if (typeof viewportPadding === "number") {
    return {
      ...defaultPadding,
      left: viewportPadding,
    };
  }

  return {
    top:
      Number.isFinite(viewportPadding?.top) && viewportPadding.top >= 0
        ? viewportPadding.top
        : defaultPadding.top,
    right:
      Number.isFinite(viewportPadding?.right) && viewportPadding.right >= 0
        ? viewportPadding.right
        : defaultPadding.right,
    bottom:
      Number.isFinite(viewportPadding?.bottom) && viewportPadding.bottom >= 0
        ? viewportPadding.bottom
        : defaultPadding.bottom,
    left:
      Number.isFinite(viewportPadding?.left) && viewportPadding.left >= 0
        ? viewportPadding.left
        : defaultPadding.left,
  };
}

function getAnchorForVisualPlacement(visualAnchor) {
  switch (visualAnchor) {
    case "right":
      return "left";
    case "left":
      return "right";
    case "top":
      return "bottom";
    case "bottom":
      return "top";
    case "top-right":
      return "bottom-left";
    case "top-left":
      return "bottom-right";
    case "bottom-right":
      return "top-left";
    case "bottom-left":
      return "top-right";
    default:
      return visualAnchor;
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getBoundsCenter(bounds) {
  return [
    (bounds[0][0] + bounds[1][0]) / 2,
    (bounds[0][1] + bounds[1][1]) / 2,
  ];
}

function lngLatToWorld([longitude, latitude], worldSize) {
  const constrainedLatitude = clamp(latitude, -MAX_MERCATOR_LATITUDE, MAX_MERCATOR_LATITUDE);
  const x = ((longitude + 180) / 360) * worldSize;
  const sine = Math.sin((constrainedLatitude * Math.PI) / 180);
  const y =
    (0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * worldSize;

  return [x, y];
}

function worldToLngLat([x, y], worldSize) {
  const longitude = (x / worldSize) * 360 - 180;
  const mercatorY = Math.PI * (1 - (2 * y) / worldSize);
  const latitude = (Math.atan(Math.sinh(mercatorY)) * 180) / Math.PI;

  return [
    clamp(longitude, -180, 180),
    clamp(latitude, -MAX_MERCATOR_LATITUDE, MAX_MERCATOR_LATITUDE),
  ];
}

function computeViewportSpanAtZoom(center, zoom, canvasWidth, canvasHeight) {
  const safeWidth = Math.max(canvasWidth || 0, 1);
  const safeHeight = Math.max(canvasHeight || 0, 1);
  const worldSize = 512 * (2 ** zoom);
  const centerWorld = lngLatToWorld(center, worldSize);
  const west = centerWorld[0] - safeWidth / 2;
  const east = centerWorld[0] + safeWidth / 2;
  const north = centerWorld[1] - safeHeight / 2;
  const south = centerWorld[1] + safeHeight / 2;
  const westLngLat = worldToLngLat([west, centerWorld[1]], worldSize);
  const eastLngLat = worldToLngLat([east, centerWorld[1]], worldSize);
  const northLngLat = worldToLngLat([centerWorld[0], north], worldSize);
  const southLngLat = worldToLngLat([centerWorld[0], south], worldSize);

  return {
    longitudeSpan: Math.abs(eastLngLat[0] - westLngLat[0]),
    latitudeSpan: Math.abs(northLngLat[1] - southLngLat[1]),
  };
}

function computeNavigationMaxBounds(atlasBounds, canvasWidth, canvasHeight) {
  const atlasCenter = getBoundsCenter(atlasBounds);
  const viewportSpan = computeViewportSpanAtZoom(
    atlasCenter,
    MAP_MIN_ZOOM,
    canvasWidth,
    canvasHeight,
  );
  const longitudePadding =
    viewportSpan.longitudeSpan * (1 + MAX_BOUNDS_SAFETY_FACTOR);
  const latitudePadding =
    viewportSpan.latitudeSpan * (1 + MAX_BOUNDS_SAFETY_FACTOR);

  return [
    [
      clamp(atlasBounds[0][0] - longitudePadding, -180, 180),
      clamp(
        atlasBounds[0][1] - latitudePadding,
        -MAX_MERCATOR_LATITUDE,
        MAX_MERCATOR_LATITUDE,
      ),
    ],
    [
      clamp(atlasBounds[1][0] + longitudePadding, -180, 180),
      clamp(
        atlasBounds[1][1] + latitudePadding,
        -MAX_MERCATOR_LATITUDE,
        MAX_MERCATOR_LATITUDE,
      ),
    ],
  ];
}

function renderMapPlaceholder(container, title, message) {
  container.innerHTML = `
    <div class="map-placeholder">
      <div class="map-placeholder__card">
        <p class="eyebrow">Mapbox setup required</p>
        <h2>${title}</h2>
        <p>${message}</p>
      </div>
    </div>
  `;
}

function renderHoverPopup(place, mapMode = MAP_MODE_TOTAL) {
  if (!place) {
    return "";
  }

  const useSymbolColors = isNonTotalMapMode(mapMode);
  const tunesMarkup = ringTuneTypeDefinitions
    .filter((definition) => (place.tuneTypeCounts?.[definition.key] || 0) > 0)
    .map(
      (definition) => `
        <li class="map-popup__item">
          <a class="map-popup__item-link tune-type-link" href="${escapeHtml(
            getTuneTypeFilterHref(definition.key),
          )}">
            <span class="map-popup__item-symbol">
              ${renderTuneTypeIcon(definition.mapsFrom, "", undefined, useSymbolColors ? getSymbolFillColor(definition.key) : null)}
            </span>
            <span class="map-popup__item-label">${escapeHtml(definition.label)}</span>
            <span class="map-popup__item-count">${escapeHtml(
              String(place.tuneTypeCounts?.[definition.key] || 0),
            )}</span>
          </a>
        </li>
      `,
    )
    .join("");

  return `
    <div class="map-popup">
      <div class="map-popup__header">
        <strong class="map-popup__title">${escapeHtml(place.name)}</strong>
        <span class="map-popup__type">${escapeHtml(place.placeType ? place.placeType.charAt(0).toUpperCase() + place.placeType.slice(1) : "")}</span>
      </div>
      <p class="map-popup__count">${escapeHtml(String(place.tuneCount))} tune${place.tuneCount === 1 ? "" : "s"}</p>
      <ul class="map-popup__list">
        ${tunesMarkup}
      </ul>
    </div>
  `;
}

function getLegendStyleMode(mapMode) {
  return mapMode === MAP_MODE_BLOCK || mapMode === MAP_MODE_CONE ? MAP_MODE_RING : mapMode;
}

function shouldRenderLegendRows(mapMode) {
  return mapMode !== MAP_MODE_BLOCK;
}

function renderLegendRowsMarkup(mapMode, sizeClassCounts = {}) {
  const steps = getSizeStopsForMode(mapMode)
    .map((stop) => stop.count)
    .filter((count) => mapMode !== MAP_MODE_CONE || count > 0)
    .sort((left, right) => right - left);
  const legendSlotSize = getLegendSymbolSlotSize(getLegendStyleMode(mapMode));

  return steps
    .map((count) => {
      const symbolSize = Math.round(getLegendRowMarkerRenderSize(count, mapMode));
      const rangeLabel = getPlaceSizeRangeLabel(count, mapMode);
      const referenceUnit = mapMode === MAP_MODE_CONE && count === 1 ? "tune" : "tunes";
      const referenceNoteMarkup =
        mapMode === MAP_MODE_CONE
          ? ""
          : `<span class="map-legend__reference-note">(${escapeHtml(
              String(sizeClassCounts[String(count)] || 0),
            )})</span>`;
      const totalMarkerStyle = getTotalMarkerStyleForCount(count);
      const totalMarkerStrokeWidth = getTotalStrokeWidthForCount(count);
      const totalMarkerStripeWidth = getTotalStripeWidthForCount(count);
      const totalMarkerStripeSpacing = getTotalStripeSpacingForCount(count);
      const legendMarkerImage =
        mapMode === MAP_MODE_BLOCK
          ? getBlockLegendMarkerDataUrl(BLOCK_LEGEND_MARKER_COUNTS, count)
          : mapMode === MAP_MODE_RING
            ? getRingLegendMarkerDataUrl(RING_LEGEND_MARKER_COUNTS, count)
            : mapMode === MAP_MODE_CONE
              ? getConeLegendMarkerDataUrl(count)
          : getPlaceMarkerDataUrl(
            1,
            totalMarkerStyle.fillColor,
            totalMarkerStyle.strokeColor,
              totalMarkerStrokeWidth,
              totalMarkerStyle.stripeAngle,
              totalMarkerStyle.strokeColor,
              totalMarkerStripeWidth,
              totalMarkerStripeSpacing,
            );

      return `
        <li class="map-legend__row">
          <span class="map-legend__row-symbol" style="width: ${legendSlotSize}px; min-width: ${legendSlotSize}px;">
            <span class="map-legend__symbol" style="--symbol-size: ${symbolSize}px; --legend-marker-image: url('${legendMarkerImage}');"></span>
          </span>
          <span class="map-legend__row-label">
            <span class="map-legend__reference-count">${escapeHtml(rangeLabel)}</span>
            <span class="map-legend__reference-unit">${referenceUnit}</span>
            ${referenceNoteMarkup}
          </span>
        </li>
      `;
    })
    .join("");
}

function renderLegendRowsSectionMarkup(mapMode, sizeClassCounts = {}) {
  if (!shouldRenderLegendRows(mapMode)) {
    return "";
  }

  return `
    <ul class="map-legend__rows">
      ${renderLegendRowsMarkup(mapMode, sizeClassCounts)}
    </ul>
  `;
}

function renderTuneTypeLegendKeyMarkup(tuneTypeTotals = {}, mapMode = MAP_MODE_BLOCK) {
  const legendSlotSize = getLegendSymbolSlotSize(getLegendStyleMode(mapMode));
  const sortedDefinitions = [...TUNE_TYPE_DEFINITIONS].sort(
    (left, right) =>
      (tuneTypeTotals[right.key] || 0) - (tuneTypeTotals[left.key] || 0) ||
      left.label.localeCompare(right.label, "en"),
  );

  return `
    <ul class="map-legend__key">
      ${sortedDefinitions.map(
        (definition) => `
          <li class="map-legend__key-item">
            <a class="map-legend__key-link tune-type-link" href="${escapeHtml(
              getTuneTypeFilterHref(definition.key),
            )}">
              <span class="map-legend__key-symbol" style="width: ${legendSlotSize}px; min-width: ${legendSlotSize}px;">
                ${renderTuneTypeIcon(definition.mapsFrom, "", undefined, getSymbolFillColor(definition.key))}
              </span>
              <span class="map-legend__key-label">
                ${escapeHtml(definition.label)}
                <span class="map-legend__key-note">(${escapeHtml(String(tuneTypeTotals[definition.key] || 0))})</span>
              </span>
            </a>
          </li>
        `,
      ).join("")}
    </ul>
  `;
}

function getLegendSymbolSlotSize(mapMode) {
  return getSizeStopsForMode(mapMode).map((stop) => stop.count)
    .sort((left, right) => right - left)
    .reduce((maxSize, count) => {
      const symbolSize = Math.round(getLegendRowMarkerRenderSize(count, mapMode));
      return Math.max(maxSize, Math.max(symbolSize + 8, 46));
    }, 46);
}

function renderLayerControlsMarkup() {
  return `
    <div class="map-legend__mode">
      <p class="map-legend__mode-label">Labels</p>
      <div
        class="map-legend__mode-toggle map-legend__mode-toggle--labels"
        role="radiogroup"
        aria-label="Label layers"
      >
        <button
          type="button"
          class="map-legend__mode-button"
          data-layer-mode="${LABEL_MODE_SYMBOL}"
          role="radio"
          aria-checked="true"
        >
          Symbol
        </button>
        <button
          type="button"
          class="map-legend__mode-button"
          data-layer-mode="${LABEL_MODE_BASEMAP}"
          role="radio"
          aria-checked="false"
        >
          Basemap
        </button>
        <button
          type="button"
          class="map-legend__mode-button"
          data-layer-mode="${LABEL_MODE_OFF}"
          role="radio"
          aria-checked="false"
        >
          Off
        </button>
      </div>
    </div>
    <div class="map-legend__mode">
      <p class="map-legend__mode-label">Counties</p>
      <div
        class="map-legend__mode-toggle map-legend__mode-toggle--binary"
        role="radiogroup"
        aria-label="County boundaries and labels"
      >
        <button
          type="button"
          class="map-legend__mode-button"
          data-county-visibility="${COUNTY_VISIBILITY_ON}"
          role="radio"
          aria-checked="false"
        >
          On
        </button>
        <button
          type="button"
          class="map-legend__mode-button"
          data-county-visibility="${COUNTY_VISIBILITY_OFF}"
          role="radio"
          aria-checked="true"
        >
          Off
        </button>
      </div>
    </div>
  `;
}

function renderLegendBodyMarkup(mapMode, categoryTotals = {}, sizeClassCounts = {}) {
  return `
    ${renderLayerControlsMarkup()}
    <div class="map-legend__mode">
      <p class="map-legend__mode-label">Symbol</p>
      <div class="map-legend__mode-toggle" role="tablist" aria-label="Symbol">
        <button
          class="map-legend__mode-button ${mapMode === MAP_MODE_TOTAL ? "is-active" : ""}"
          type="button"
          role="tab"
          aria-selected="${mapMode === MAP_MODE_TOTAL}"
          data-map-mode="${MAP_MODE_TOTAL}"
        >Total</button>
        <button
          class="map-legend__mode-button ${mapMode === MAP_MODE_RING ? "is-active" : ""}"
          type="button"
          role="tab"
          aria-selected="${mapMode === MAP_MODE_RING}"
          data-map-mode="${MAP_MODE_RING}"
        >Ring</button>
        <button
          class="map-legend__mode-button ${mapMode === MAP_MODE_CONE ? "is-active" : ""}"
          type="button"
          role="tab"
          aria-selected="${mapMode === MAP_MODE_CONE}"
          data-map-mode="${MAP_MODE_CONE}"
        >Cone</button>
        <button
          class="map-legend__mode-button ${mapMode === MAP_MODE_BLOCK ? "is-active" : ""}"
          type="button"
          role="tab"
          aria-selected="${mapMode === MAP_MODE_BLOCK}"
          data-map-mode="${MAP_MODE_BLOCK}"
        >Block</button>
      </div>
    </div>
    ${
      shouldRenderLegendRows(mapMode)
        ? renderLegendRowsSectionMarkup(mapMode, sizeClassCounts)
        : ""
    }
    ${
      mapMode === MAP_MODE_CONE
        ? `
          <p class="map-legend__title map-legend__title--secondary">Tune Type</p>
          ${createConeDirectionWheelSvg()}
        `
        : ""
    }
    ${
      isNonTotalMapMode(mapMode) && mapMode !== MAP_MODE_CONE
        ? `
          <p class="map-legend__title map-legend__title--secondary">Tune Type</p>
          ${renderTuneTypeLegendKeyMarkup(categoryTotals, mapMode)}
        `
        : ""
    }
  `;
}

function renderLegendMarkup(mapMode, categoryTotals = {}, sizeClassCounts = {}) {
  return `
    <section class="map-legend__panel" aria-label="Map legend">
      <div class="map-legend__content">
        ${renderLegendBodyMarkup(mapMode, categoryTotals, sizeClassCounts)}
      </div>
    </section>
  `;
}

function createLegendElement(categoryTotals, sizeClassCounts) {
  const legend = document.createElement("div");
  legend.id = "mapLegend";
  legend.className = "map-legend";
  legend.innerHTML = renderLegendMarkup(MAP_MODE_TOTAL, categoryTotals, sizeClassCounts);
  return legend;
}

export function createMapController({
  container,
  atlasData,
  getViewportPadding,
  onPlaceSelect,
  onMapBackgroundClick,
  onMapModeChange,
  mobileLegendToggle,
  onMobileLegendToggle,
}) {
  if (!window.mapboxgl) {
    renderMapPlaceholder(
      container,
      "Mapbox GL JS did not load",
      "Confirm that the CDN script is available, then reload the page.",
    );

    return {
      fitToAtlas() {},
      focusPlace() {},
      focusPlaces() {},
      setSelections() {},
      resize() {},
    };
  }

  if (!hasMapboxToken()) {
    renderMapPlaceholder(
      container,
      "Insert a public access token to enable the live map",
      "Update scripts/config.js and replace the placeholder token with a valid Mapbox access token.",
    );

    return {
      fitToAtlas() {},
      focusPlace() {},
      focusPlaces() {},
      setSelections() {},
      resize() {},
    };
  }

  const mapboxgl = window.mapboxgl;
  mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

  const legendElement = createLegendElement(
    atlasData.tuneTypeTotals || {},
    summarizePlaceSizeClasses(atlasData.places),
  );
  container.append(legendElement);

  const markerOpacityStops = PLACE_OPACITY_STOPS.flatMap((stop) => [
    stop.zoom,
    getPlaceFillOpacityForZoom(stop.zoom),
  ]);
  const blockMarkerOpacityStops = BLOCK_OPACITY_STOPS.flatMap((stop) => [
    stop.zoom,
    getBlockFillOpacityForZoom(stop.zoom),
  ]);
  const coneMarkerOpacityStops = CONE_OPACITY_STOPS.flatMap((stop) => [
    stop.zoom,
    getConeFillOpacityForZoom(stop.zoom),
  ]);
  const placeLabelCountSizeStops = [
    1, 11,
    4, 12.8,
    10, 14.5,
    20, 16.3,
    40, 18,
  ];
  const placeLabelOpacityStops = [
    6, 0.82,
    10, 0.96,
  ];
  const placeLabelRadialOffsetStops = [
    1, 0.24,
    4, 0.42,
    10, 0.62,
    20, 0.84,
    40, 1.22,
  ];
  const symbolLabelLevels = [
    { layerId: "linked-places-label-level-1", minCount: 40, maxCount: null, count: 40 },
    { layerId: "linked-places-label-level-2", minCount: 20, maxCount: 39, count: 20 },
    { layerId: "linked-places-label-level-3", minCount: 10, maxCount: 19, count: 10 },
    { layerId: "linked-places-label-level-4", minCount: 4, maxCount: 9, count: 4 },
    { layerId: "linked-places-label-level-5", minCount: 1, maxCount: 3, count: 1 },
  ].map((level) => ({
    ...level,
    textSize: getFlatStopValue(placeLabelCountSizeStops, level.count),
    radialOffset: getFlatStopValue(placeLabelRadialOffsetStops, level.count),
    textColor: rgbToCss(getTotalMarkerStyleForCount(level.count).labelColor),
  }));
  const circleShadowOpacityStops = PLACE_OPACITY_STOPS.flatMap((stop) => [
    stop.zoom,
    getPlaceShadowOpacity(getPlaceFillOpacityForZoom(stop.zoom)),
  ]);
  const ringCircleShadowOpacityStops = RING_SHADOW_OPACITY_STOPS.flatMap((stop) => [
    stop.zoom,
    getRingShadowOpacityForZoom(stop.zoom),
  ]);
  const atlasBounds = atlasData.bounds;
  const initialNavigationMaxBounds = computeNavigationMaxBounds(
    atlasBounds,
    container.clientWidth,
    container.clientHeight,
  );

  const map = new mapboxgl.Map({
    container,
    style: MAPBOX_STYLE,
    center: [-8.21, 53.27],
    zoom: 6.15,
    minZoom: MAP_MIN_ZOOM,
    maxZoom: MAP_MAX_ZOOM,
    maxBounds: initialNavigationMaxBounds,
  });

  const navigationControl = new mapboxgl.NavigationControl();
  map.addControl(navigationControl, "bottom-right");

  const hoverPopup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    offset: 16,
  });

  let hasLoaded = false;
  let currentMapMode = MAP_MODE_TOTAL;
  let currentIsNarrowViewport = window.innerWidth < SIDEBAR_BREAKPOINT;
  let currentMobilePanel = null;
  let renderedLegendSignature = "";
  let lockedPlace = null;
  let hoveredPlace = null;
  let currentLabelMode = LABEL_MODE_SYMBOL;
  let currentCountyVisibility = COUNTY_VISIBILITY_OFF;
  let currentSymbolLabelAnchorSignature = "";
  let basemapLabelLayerIds = [];
  let latestViewportPadding =
    typeof getViewportPadding === "function"
      ? getMapPadding(getViewportPadding())
      : getMapPadding();
  let visiblePlacesById = new Map(atlasData.places.map((place) => [place.id, place]));
  ringTuneTypeDefinitions = [...TUNE_TYPE_DEFINITIONS].sort(
    (left, right) =>
      (atlasData.tuneTypeTotals?.[right.key] || 0) -
        (atlasData.tuneTypeTotals?.[left.key] || 0) ||
      left.label.localeCompare(right.label, "en"),
  );
  coneReferenceMaxCount = Math.max(getMaxTuneTypeCountForPlaces(atlasData.places), 1);
  const pendingTasks = [];
  const blockMarkerPromises = new Map();
  const ringMarkerPromises = new Map();
  const coneMarkerPromises = new Map();
  let attributionLinksObserver = null;

  if (mobileLegendToggle) {
    mobileLegendToggle.setAttribute("aria-controls", legendElement.id);
    mobileLegendToggle.addEventListener("click", () => {
      if (typeof onMobileLegendToggle === "function") {
        onMobileLegendToggle();
      }
    });
  }

  function resolveVisiblePlace(placeOrId) {
    const placeId =
      typeof placeOrId === "string"
        ? placeOrId
        : placeOrId && typeof placeOrId.id === "string"
          ? placeOrId.id
          : null;

    if (!placeId) {
      return null;
    }

    return visiblePlacesById.get(placeId) || atlasData.placesById.get(placeId) || null;
  }

  function runOrQueue(task) {
    if (hasLoaded) {
      task();
      return;
    }

    pendingTasks.push(task);
  }

  function resolveViewportPadding(viewportPadding) {
    if (
      typeof viewportPadding === "number" ||
      (viewportPadding && typeof viewportPadding === "object")
    ) {
      latestViewportPadding = getMapPadding(viewportPadding);
      return latestViewportPadding;
    }

    if (typeof getViewportPadding === "function") {
      latestViewportPadding = getMapPadding(getViewportPadding());
    }

    return latestViewportPadding;
  }

  function syncLegendSurfaceState() {
    const isMobileLegendOpen = currentIsNarrowViewport && currentMobilePanel === "legend";
    const legendPanel = legendElement.querySelector(".map-legend__panel");

    legendElement.classList.toggle("map-legend--mobile", currentIsNarrowViewport);
    legendElement.classList.toggle("map-legend--mobile-open", isMobileLegendOpen);
    legendElement.setAttribute(
      "aria-hidden",
      String(currentIsNarrowViewport ? !isMobileLegendOpen : false),
    );

    if (legendPanel) {
      legendPanel.setAttribute("role", currentIsNarrowViewport ? "dialog" : "complementary");
      legendPanel.setAttribute("aria-label", "Map legend");
      legendPanel.removeAttribute("aria-modal");
    }

    if (mobileLegendToggle) {
      mobileLegendToggle.classList.toggle(
        "is-hidden",
        !currentIsNarrowViewport,
      );
      mobileLegendToggle.setAttribute("aria-expanded", String(isMobileLegendOpen));
      mobileLegendToggle.setAttribute(
        "aria-label",
        isMobileLegendOpen ? "Close map legend" : "Open map legend",
      );
      mobileLegendToggle.setAttribute(
        "aria-hidden",
        String(!currentIsNarrowViewport),
      );
      mobileLegendToggle.innerHTML = `
        ${renderMapUiIcon(MAP_UI_ICONS.legend, "button-icon button-icon--topbar")}
        <span>Legend</span>
      `;
    }
  }

  function updateSource(sourceId, collection) {
    const source = map.getSource(sourceId);
    if (source) {
      source.setData(collection);
    }
  }

  function getHighlightedPlace() {
    return hoveredPlace || lockedPlace || null;
  }

  function renderActivePlaceHighlight() {
    updateSource(
      "active-place-source",
      createActivePlaceCollection(getHighlightedPlace(), currentMapMode),
    );
  }

  function setHoveredPlace(place) {
    const nextHoveredPlace = place ? resolveVisiblePlace(place) : null;
    const currentHoveredPlaceId = hoveredPlace ? hoveredPlace.id : null;
    const nextHoveredPlaceId = nextHoveredPlace ? nextHoveredPlace.id : null;

    hoveredPlace = nextHoveredPlace;

    return currentHoveredPlaceId !== nextHoveredPlaceId;
  }

  function setLayerVisibility(layerId, visibility) {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", visibility);
    }
  }

  function applyAttributionLinksTargetBlank() {
    container.querySelectorAll(".mapboxgl-ctrl-attrib a[href]").forEach((link) => {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    });
  }

  function observeAttributionLinks() {
    applyAttributionLinksTargetBlank();

    if (attributionLinksObserver) {
      return;
    }

    attributionLinksObserver = new MutationObserver(() => {
      applyAttributionLinksTargetBlank();
    });

    attributionLinksObserver.observe(container, {
      childList: true,
      subtree: true,
    });
  }

  function renderLegend(markerOpacity) {
    const sizeClassCounts = summarizePlaceSizeClasses(
      [...visiblePlacesById.values()],
      currentMapMode,
    );
    const legendSignature = JSON.stringify({
      mapMode: currentMapMode,
      sizeClassCounts,
    });
    const shadowOpacity =
      currentMapMode === MAP_MODE_BLOCK || currentMapMode === MAP_MODE_CONE
        ? 0
        : isNonTotalMapMode(currentMapMode)
        ? getRingShadowOpacityForZoom(map.getZoom())
        : getPlaceShadowOpacity(markerOpacity);
    const legendShadowOffsetX =
      isNonTotalMapMode(currentMapMode) ? RING_SHADOW_TRANSLATE[0] : TOTAL_SHADOW_TRANSLATE[0];
    const legendShadowOffsetY =
      isNonTotalMapMode(currentMapMode) ? RING_SHADOW_TRANSLATE[1] : TOTAL_SHADOW_TRANSLATE[1];
    const legendShadowBlur =
      isNonTotalMapMode(currentMapMode) ? 11 : 8;
    const legendStops = getSizeStopsForMode(currentMapMode);
    const defaultLegendCount = legendStops[Math.min(2, legendStops.length - 1)].count;
    const defaultTotalLegendStyle = getTotalMarkerStyleForCount(defaultLegendCount);
    const defaultTotalLegendStrokeWidth = getTotalStrokeWidthForCount(defaultLegendCount);
    const defaultTotalLegendStripeWidth = getTotalStripeWidthForCount(defaultLegendCount);
    const defaultTotalLegendStripeSpacing = getTotalStripeSpacingForCount(defaultLegendCount);
    const legendMarkerImage =
      currentMapMode === MAP_MODE_BLOCK
        ? getBlockMarkerDataUrl(BLOCK_LEGEND_MARKER_COUNTS, defaultLegendCount)
        : currentMapMode === MAP_MODE_RING
          ? getRingMarkerDataUrl(RING_LEGEND_MARKER_COUNTS, defaultLegendCount)
          : currentMapMode === MAP_MODE_CONE
            ? getConeLegendMarkerDataUrl(defaultLegendCount)
        : getPlaceMarkerDataUrl(
            1,
            defaultTotalLegendStyle.fillColor,
            defaultTotalLegendStyle.strokeColor,
            defaultTotalLegendStrokeWidth,
            defaultTotalLegendStyle.stripeAngle,
            defaultTotalLegendStyle.strokeColor,
            defaultTotalLegendStripeWidth,
            defaultTotalLegendStripeSpacing,
          );

    if (renderedLegendSignature !== legendSignature) {
      legendElement.innerHTML = renderLegendMarkup(
        currentMapMode,
        atlasData.tuneTypeTotals || {},
        sizeClassCounts,
      );
      renderedLegendSignature = legendSignature;
      updateLayerControlsState();
    }

    legendElement.classList.toggle("map-legend--cone-mode", currentMapMode === MAP_MODE_CONE);
    syncLegendSurfaceState();

    legendElement.style.setProperty(
      "--legend-marker-image",
      `url("${legendMarkerImage}")`,
    );
    legendElement.style.setProperty("--legend-marker-opacity", markerOpacity.toFixed(3));
    legendElement.style.setProperty(
      "--legend-shadow-color",
      rgbaToCss(getMapShadowColor(currentMapMode), shadowOpacity),
    );
    legendElement.style.setProperty("--legend-shadow-offset-x", `${legendShadowOffsetX}px`);
    legendElement.style.setProperty("--legend-shadow-offset-y", `${legendShadowOffsetY}px`);
    legendElement.style.setProperty("--legend-shadow-blur", `${legendShadowBlur}px`);
    legendElement.style.setProperty(
      "--legend-shadow-size-offset",
      `${isNonTotalMapMode(currentMapMode) ? RING_SHADOW_RADIUS_OFFSET * 2 : TOTAL_SHADOW_RADIUS_OFFSET * 2}px`,
    );
  }

  function upsertMarkerImage(imageId, image) {
    if (!imageId) {
      return;
    }

    if (map.hasImage(imageId)) {
      return;
    }

    map.addImage(imageId, image);
  }

  function ensureTotalMarkerImages() {
    const pendingImages = TOTAL_MARKER_STYLE_STOPS
      .filter((style) => !map.hasImage(style.imageId))
      .map((style) =>
        loadPlaceMarkerImage(
          1,
          style.fillColor,
          style.strokeColor,
          getTotalStrokeWidthForCount(style.count),
          style.stripeAngle,
          style.strokeColor,
          getTotalStripeWidthForCount(style.count),
          getTotalStripeSpacingForCount(style.count),
        ).then((image) => {
          upsertMarkerImage(style.imageId, image);
        }),
      );

    return Promise.all(pendingImages);
  }

  function getUniqueMissingMarkerPlaces(places, getMarkerId) {
    const uniquePlacesByMarkerId = new Map();

    (places || []).forEach((place) => {
      const markerId = getMarkerId(place);
      if (!markerId || map.hasImage(markerId) || uniquePlacesByMarkerId.has(markerId)) {
        return;
      }

      uniquePlacesByMarkerId.set(markerId, place);
    });

    return [...uniquePlacesByMarkerId.values()];
  }

  function ensureMarkerImages(places, getMarkerId, markerPromises, getMarkerDataUrl) {
    const pendingImages = getUniqueMissingMarkerPlaces(places, getMarkerId).map((place) => {
      const markerId = getMarkerId(place);
      if (markerPromises.has(markerId)) {
        return markerPromises.get(markerId);
      }

      const promise = loadMarkerImageFromDataUrl(getMarkerDataUrl(place))
        .then((image) => {
          upsertMarkerImage(markerId, image);
        })
        .finally(() => {
          markerPromises.delete(markerId);
        });

      markerPromises.set(markerId, promise);
      return promise;
    });

    return Promise.all(pendingImages);
  }

  function ensureBlockMarkerImages(places) {
    return ensureMarkerImages(
      places,
      (place) => place.blockMarkerId,
      blockMarkerPromises,
      (place) => getBlockMarkerDataUrl(place.tuneTypeCounts, place.tuneCount),
    );
  }

  function ensureRingMarkerImages(places) {
    return ensureMarkerImages(
      places,
      (place) => place.ringMarkerId,
      ringMarkerPromises,
      (place) => getRingMarkerDataUrl(place.tuneTypeCounts, place.tuneCount),
    );
  }

  function ensureConeMarkerImages(places) {
    return ensureMarkerImages(
      places,
      (place) => place.coneMarkerId,
      coneMarkerPromises,
      (place) => getConeMarkerDataUrl(place.tuneTypeCounts, place.tuneCount),
    );
  }

  function ensureActivePlaceRectImages() {
    const pendingImages = PLACE_RADIUS_STOPS
      .filter((stop) => !map.hasImage(getActivePlaceRectImageId(stop.count)))
      .map((stop) =>
        loadMarkerImageFromDataUrl(getActivePlaceRectDataUrl(stop.count)).then((image) => {
          upsertMarkerImage(getActivePlaceRectImageId(stop.count), image);
        }),
      );

    return Promise.all(pendingImages);
  }

  function logRejectedMarkerImageLoads(results) {
    results.forEach((result) => {
      if (result.status === "rejected") {
        console.error(result.reason);
      }
    });
  }

  function scheduleBackgroundMarkerPrewarm(task) {
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(() => {
        task().catch((error) => {
          console.error(error);
        });
      }, { timeout: 250 });
      return;
    }

    window.setTimeout(() => {
      task().catch((error) => {
        console.error(error);
      });
    }, 16);
  }

  function prewarmSecondaryMarkerImages(places) {
    ensureConeMarkerImages(places).catch((error) => {
      console.error(error);
    });

    scheduleBackgroundMarkerPrewarm(async () => {
      const results = await Promise.allSettled([
        ensureBlockMarkerImages(places),
        ensureRingMarkerImages(places),
      ]);
      logRejectedMarkerImageLoads(results);
    });
  }

  function syncBaseSymbolMode(mapPlaces) {
    if (currentMapMode === MAP_MODE_BLOCK) {
      ensureBlockMarkerImages(mapPlaces).then(() => {
        if (currentMapMode !== MAP_MODE_BLOCK) {
          return;
        }

        setLayerVisibility("linked-places-total-layer", "none");
        setLayerVisibility("linked-places-block-layer", "visible");
        setLayerVisibility("linked-places-ring-layer", "none");
        setLayerVisibility("linked-places-cone-layer", "none");
      }).catch((error) => {
        console.error(error);
      });

      return;
    }

    if (currentMapMode === MAP_MODE_RING) {
      ensureRingMarkerImages(mapPlaces).then(() => {
        if (currentMapMode !== MAP_MODE_RING) {
          return;
        }

        setLayerVisibility("linked-places-total-layer", "none");
        setLayerVisibility("linked-places-block-layer", "none");
        setLayerVisibility("linked-places-ring-layer", "visible");
        setLayerVisibility("linked-places-cone-layer", "none");
      }).catch((error) => {
        console.error(error);
      });

      return;
    }

    if (currentMapMode === MAP_MODE_CONE) {
      ensureConeMarkerImages(mapPlaces).then(() => {
        if (currentMapMode !== MAP_MODE_CONE) {
          return;
        }

        setLayerVisibility("linked-places-total-layer", "none");
        setLayerVisibility("linked-places-block-layer", "none");
        setLayerVisibility("linked-places-ring-layer", "none");
        setLayerVisibility("linked-places-cone-layer", "visible");
      }).catch((error) => {
        console.error(error);
      });

      return;
    }

    setLayerVisibility("linked-places-total-layer", "visible");
    setLayerVisibility("linked-places-block-layer", "none");
    setLayerVisibility("linked-places-ring-layer", "none");
    setLayerVisibility("linked-places-cone-layer", "none");
  }

  function updateMapModeAppearance() {
    const markerOpacity = getMarkerOpacityForZoom(map.getZoom(), currentMapMode);
    const shadowOpacityStops =
      isNonTotalMapMode(currentMapMode)
        ? ringCircleShadowOpacityStops
        : circleShadowOpacityStops;
    const shadowRadiusOffset =
      isNonTotalMapMode(currentMapMode)
        ? RING_SHADOW_RADIUS_OFFSET
        : TOTAL_SHADOW_RADIUS_OFFSET;
    const shadowBlur =
      isNonTotalMapMode(currentMapMode) ? RING_SHADOW_BLUR : TOTAL_SHADOW_BLUR;
    const shadowTranslate =
      isNonTotalMapMode(currentMapMode)
        ? RING_SHADOW_TRANSLATE
        : TOTAL_SHADOW_TRANSLATE;
    renderLegend(markerOpacity);
    syncBaseSymbolMode([...visiblePlacesById.values()]);

    if (map.getLayer("linked-places-shadow-layer")) {
      setLayerVisibility(
        "linked-places-shadow-layer",
        currentMapMode === MAP_MODE_BLOCK || currentMapMode === MAP_MODE_CONE ? "none" : "visible",
      );
      map.setPaintProperty(
        "linked-places-shadow-layer",
        "circle-color",
        rgbToCss(getMapShadowColor(currentMapMode)),
      );
      map.setPaintProperty(
        "linked-places-shadow-layer",
        "circle-radius",
        buildRadiusExpression(
          PLACE_RADIUS_STOPS,
          getMapModeMarkerScale(currentMapMode),
          shadowRadiusOffset,
        ),
      );
      map.setPaintProperty(
        "linked-places-shadow-layer",
        "circle-opacity",
        [
          "interpolate",
          ["linear"],
          ["zoom"],
          ...shadowOpacityStops,
        ],
      );
      map.setPaintProperty("linked-places-shadow-layer", "circle-blur", shadowBlur);
      map.setPaintProperty("linked-places-shadow-layer", "circle-translate", shadowTranslate);
    }

    [
      "active-place-glow-layer",
      "related-places-glow-layer",
    ].forEach((layerId) => {
      if (!map.getLayer(layerId)) {
        return;
      }

      setLayerVisibility(layerId, "visible");
      map.setPaintProperty(
        layerId,
        "circle-radius",
        [
          "+",
          buildActivePlaceRadiusExpressionForMode(currentMapMode),
          ACTIVE_PLACE_GLOW_RADIUS_OFFSET,
        ],
      );
      map.setPaintProperty(
        layerId,
        "circle-color",
        [
          "coalesce",
          ["get", "activeStrokeColor"],
          `rgba(${
            (isNonTotalMapMode(currentMapMode)
              ? ACTIVE_PLACE_NON_TOTAL_STROKE_COLOR
              : ACTIVE_PLACE_STROKE_COLOR).join(", ")
          }, 1)`,
        ],
      );
    });

    [
      "active-place-outer-stroke-layer",
      "related-places-outer-stroke-layer",
    ].forEach((layerId) => {
      if (!map.getLayer(layerId)) {
        return;
      }

      setLayerVisibility(layerId, "visible");
      map.setPaintProperty(
        layerId,
        "circle-radius",
        buildActivePlaceRadiusExpressionForMode(currentMapMode),
      );
      map.setPaintProperty(
        layerId,
        "circle-stroke-color",
        [
          "coalesce",
          ["get", "activeStrokeColor"],
          `rgba(${
            (isNonTotalMapMode(currentMapMode)
              ? ACTIVE_PLACE_NON_TOTAL_STROKE_COLOR
              : ACTIVE_PLACE_STROKE_COLOR).join(", ")
          }, 0.96)`,
        ],
      );
      map.setPaintProperty(
        layerId,
        "circle-stroke-width",
        getActivePlaceOuterStrokeWidthForMode(currentMapMode),
      );
    });

    [
      "active-place-layer",
      "related-places-layer",
    ].forEach((layerId) => {
      if (!map.getLayer(layerId)) {
        return;
      }

      setLayerVisibility(layerId, "visible");
      map.setPaintProperty(
        layerId,
        "circle-radius",
        buildActivePlaceRadiusExpressionForMode(currentMapMode),
      );
    });

    if (map.getLayer("active-place-rect-layer")) {
      setLayerVisibility(
        "active-place-rect-layer",
        "none",
      );
    }

    symbolLabelLevels.forEach((level) => {
      if (!map.getLayer(level.layerId)) {
        return;
      }

      map.setPaintProperty(
        level.layerId,
        "text-color",
        isNonTotalMapMode(currentMapMode)
          ? "rgba(44, 44, 44, 0.96)"
          : level.textColor,
      );
    });
  }

  function handleLegendClick(event) {
    handleLayerControlsClick(event);
    handleCountyControlsClick(event);

    const modeButton = event.target.closest("[data-map-mode]");
    if (!modeButton) {
      return;
    }

    const nextMode = modeButton.dataset.mapMode;
    if (
      nextMode &&
      nextMode !== currentMapMode &&
      typeof onMapModeChange === "function"
    ) {
      onMapModeChange(nextMode);
    }
  }

  function applyNavigationMaxBounds() {
    const canvas = map.getCanvas();
    map.setMaxBounds(
      computeNavigationMaxBounds(
        atlasBounds,
        canvas ? canvas.clientWidth : container.clientWidth,
        canvas ? canvas.clientHeight : container.clientHeight,
      ),
    );
  }

  function getFirstLabelLayerId() {
    const style = map.getStyle();
    const layers = style && style.layers ? style.layers : [];
    const firstLabelLayer = layers.find((layer) =>
      layer.type === "symbol" &&
      layer.layout &&
      typeof layer.layout["text-field"] !== "undefined"
    );

    return firstLabelLayer ? firstLabelLayer.id : undefined;
  }

  function getBasemapLabelLayerIds() {
    const style = map.getStyle();
    const layers = style && style.layers ? style.layers : [];

    return layers
      .filter((layer) =>
        layer.type === "symbol" &&
        layer.layout &&
        typeof layer.layout["text-field"] !== "undefined",
      )
      .map((layer) => layer.id);
  }

  function suppressBasemapLabelIcons() {
    const style = map.getStyle();
    const layers = style && style.layers ? style.layers : [];

    layers.forEach((layer) => {
      if (
        layer.type !== "symbol" ||
        !layer.layout ||
        typeof layer.layout["text-field"] === "undefined" ||
        typeof layer.layout["icon-image"] === "undefined" ||
        !map.getLayer(layer.id)
      ) {
        return;
      }

      map.setPaintProperty(layer.id, "icon-opacity", 0);
    });
  }

  function addLayerBelowLabels(layerDefinition) {
    const beforeId = getFirstLabelLayerId();
    if (beforeId) {
      map.addLayer(layerDefinition, beforeId);
      return;
    }

    map.addLayer(layerDefinition);
  }

  function getFirstPlaceMarkerLayerId() {
    return [
      "linked-places-total-layer",
      "linked-places-block-layer",
      "linked-places-ring-layer",
      "linked-places-cone-layer",
    ].find((layerId) => map.getLayer(layerId));
  }

  function addLayerBelowPlaceMarkers(layerDefinition) {
    const beforeId = getFirstPlaceMarkerLayerId();
    if (beforeId) {
      map.addLayer(layerDefinition, beforeId);
      return;
    }

    addLayerBelowLabels(layerDefinition);
  }

  function ensureHighlightLayersBelowMarkers() {
    const beforeId = getFirstPlaceMarkerLayerId();
    if (!beforeId) {
      return;
    }

    [
      "related-places-glow-layer",
      "related-places-outer-stroke-layer",
      "related-places-layer",
      "active-place-glow-layer",
      "active-place-outer-stroke-layer",
      "active-place-layer",
      "active-place-rect-layer",
    ].forEach((layerId) => {
      if (!map.getLayer(layerId) || layerId === beforeId) {
        return;
      }

      map.moveLayer(layerId, beforeId);
    });
  }

  function fitBounds(bounds, viewportPadding) {
    map.fitBounds(bounds, {
      duration: 1100,
      maxZoom: PLACE_FOCUS_ZOOM,
      padding: resolveViewportPadding(viewportPadding),
    });
  }

  function updateLayerControlsState() {
    legendElement.querySelectorAll("[data-layer-mode]").forEach((button) => {
      const buttonMode = button.getAttribute("data-layer-mode");
      const isActive = buttonMode === currentLabelMode;

      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-checked", String(isActive));
    });

    legendElement.querySelectorAll("[data-county-visibility]").forEach((button) => {
      const buttonVisibility = button.getAttribute("data-county-visibility");
      const isActive = buttonVisibility === currentCountyVisibility;

      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-checked", String(isActive));
    });
  }

  function applyCountyVisibility() {
    const visibility =
      currentCountyVisibility === COUNTY_VISIBILITY_ON ? "visible" : "none";

    COUNTY_LAYER_IDS.forEach((layerId) => {
      setLayerVisibility(layerId, visibility);
    });
    updateLayerControlsState();
  }

  function applyBasemapLabelVisibility() {
    basemapLabelLayerIds.forEach((layerId) => {
      if (!map.getLayer(layerId)) {
        return;
      }

      map.setLayoutProperty(
        layerId,
        "visibility",
        currentLabelMode === LABEL_MODE_BASEMAP ? "visible" : "none",
      );
    });
  }

  function getSymbolLabelAnchorPriorityForZoom() {
    return SYMBOL_LABEL_VISUAL_PRIORITY.map(getAnchorForVisualPlacement);
  }

  function applySymbolLabelAnchorPriority() {
    const labelLayerIds = symbolLabelLevels
      .map((level) => level.layerId)
      .filter((layerId) => map.getLayer(layerId));

    if (labelLayerIds.length === 0) {
      return;
    }

    const anchors = getSymbolLabelAnchorPriorityForZoom(map.getZoom());
    const nextSignature = anchors.join("|");
    if (nextSignature === currentSymbolLabelAnchorSignature) {
      return;
    }

    labelLayerIds.forEach((layerId) => {
      map.setLayoutProperty(layerId, "text-variable-anchor", anchors);
    });
    currentSymbolLabelAnchorSignature = nextSignature;
  }

  function applySymbolLabelVisibility() {
    applySymbolLabelAnchorPriority();

    symbolLabelLevels.forEach((level) => {
      setLayerVisibility(
        level.layerId,
        currentLabelMode === LABEL_MODE_SYMBOL ? "visible" : "none",
      );
    });
  }

  function applyLabelVisibilityStates() {
    applyBasemapLabelVisibility();
    applySymbolLabelVisibility();
    updateLayerControlsState();
  }

  function attachResetButtonToNavigationGroup() {
    const navigationGroup = container.querySelector(
      ".mapboxgl-ctrl-bottom-right .mapboxgl-ctrl-group",
    );
    if (!navigationGroup || navigationGroup.querySelector(".mapboxgl-ctrl-home-button")) {
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "mapboxgl-ctrl-home-button";
    button.setAttribute("aria-label", "Reset map view");
    button.title = "Reset map view";
    button.innerHTML = `
      <span class="mapboxgl-ctrl-home-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M12 4.6 5 10.3V20h5.1v-5.4h3.8V20H19v-9.7z"></path>
          <path d="M3.9 11.1 2.7 9.6 12 2l9.3 7.6-1.2 1.5L12 4.4z"></path>
        </svg>
      </span>
    `;
    button.addEventListener("click", () => {
      lockedPlace = null;
      hoveredPlace = null;
      renderActivePlaceHighlight();
      hoverPopup.remove();
      fitBounds(atlasBounds);

      if (typeof onMapBackgroundClick === "function") {
        onMapBackgroundClick();
      }
    });

    navigationGroup.append(button);
  }

  function handleLayerControlsClick(event) {
    const button = event.target.closest("[data-layer-mode]");
    if (!button) {
      return;
    }

    const nextLabelMode = button.getAttribute("data-layer-mode");
    if (
      nextLabelMode !== LABEL_MODE_BASEMAP &&
      nextLabelMode !== LABEL_MODE_SYMBOL &&
      nextLabelMode !== LABEL_MODE_OFF
    ) {
      return;
    }

    if (nextLabelMode === currentLabelMode) {
      return;
    }

    currentLabelMode = nextLabelMode;

    if (hasLoaded) {
      applyLabelVisibilityStates();
    } else {
      updateLayerControlsState();
    }
  }

  function handleCountyControlsClick(event) {
    const button = event.target.closest("[data-county-visibility]");
    if (!button) {
      return;
    }

    const nextVisibility = button.getAttribute("data-county-visibility");
    if (
      nextVisibility !== COUNTY_VISIBILITY_ON &&
      nextVisibility !== COUNTY_VISIBILITY_OFF
    ) {
      return;
    }

    if (nextVisibility === currentCountyVisibility) {
      return;
    }

    currentCountyVisibility = nextVisibility;

    if (hasLoaded) {
      applyCountyVisibility();
    } else {
      updateLayerControlsState();
    }
  }

  function showPopupForPlace(place) {
    if (!place) {
      return;
    }

    hoverPopup
      .setLngLat(place.coordinates)
      .setHTML(renderHoverPopup(place, currentMapMode))
      .addTo(map);
  }

  function hideHoverPopup() {
    if (setHoveredPlace(null)) {
      renderActivePlaceHighlight();
    }

    if (lockedPlace) {
      showPopupForPlace(lockedPlace);
    } else {
      hoverPopup.remove();
    }

    map.getCanvas().style.cursor = "";
  }

  function getInteractivePlaceLayerIds() {
    return [
      "linked-places-total-layer",
      "linked-places-block-layer",
      "linked-places-ring-layer",
      "linked-places-cone-layer",
      ...symbolLabelLevels.map((level) => level.layerId),
    ].filter((layerId) => map.getLayer(layerId));
  }

  function getNearestInteractivePlaceAtPoint(point) {
    const interactiveLayerIds = getInteractivePlaceLayerIds();
    if (interactiveLayerIds.length === 0) {
      return null;
    }

    const rankedPlaces = new Map();
    const renderedFeatures = map.queryRenderedFeatures(point, {
      layers: interactiveLayerIds,
    });

    renderedFeatures.forEach((feature) => {
      const place = resolveVisiblePlace(feature?.properties?.featureId);
      if (!place) {
        return;
      }

      const projectedPoint = map.project(place.coordinates);
      const dx = projectedPoint.x - point.x;
      const dy = projectedPoint.y - point.y;
      const distanceSquared = dx * dx + dy * dy;
      const currentRank = rankedPlaces.get(place.id);

      if (
        !currentRank ||
        distanceSquared < currentRank.distanceSquared ||
        (distanceSquared === currentRank.distanceSquared && place.tuneCount > currentRank.place.tuneCount)
      ) {
        rankedPlaces.set(place.id, {
          place,
          distanceSquared,
        });
      }
    });

    if (rankedPlaces.size === 0) {
      return null;
    }

    return [...rankedPlaces.values()].sort(
      (left, right) =>
        left.distanceSquared - right.distanceSquared ||
        right.place.tuneCount - left.place.tuneCount,
    )[0].place;
  }

  function handleFeatureHover(event) {
    const place = getNearestInteractivePlaceAtPoint(event.point);
    if (!place) {
      hideHoverPopup();
      return;
    }

    if (setHoveredPlace(place)) {
      renderActivePlaceHighlight();
    }
    showPopupForPlace(place);

    map.getCanvas().style.cursor = "pointer";
  }

  function handleFeatureClick(event) {
    const place = getNearestInteractivePlaceAtPoint(event.point);
    const placeId = place ? place.id : null;

    if (placeId) {
      onPlaceSelect(placeId);
    }
  }

  function handleMapClick(event) {
    const features = map.queryRenderedFeatures(event.point, {
      layers: [
        "linked-places-total-layer",
        "linked-places-block-layer",
        "linked-places-ring-layer",
        "linked-places-cone-layer",
        ...symbolLabelLevels.map((level) => level.layerId),
      ],
    });

    if (features.length > 0) {
      return;
    }

    lockedPlace = null;
    hoveredPlace = null;
    renderActivePlaceHighlight();
    hoverPopup.remove();
    map.getCanvas().style.cursor = "";

    if (typeof onMapBackgroundClick === "function") {
      onMapBackgroundClick();
    }
  }

  map.on("load", async () => {
    basemapLabelLayerIds = getBasemapLabelLayerIds();
    suppressBasemapLabelIcons();
    observeAttributionLinks();
    applyNavigationMaxBounds();
    renderLegend(getMarkerOpacityForZoom(map.getZoom(), currentMapMode));
    legendElement.addEventListener("click", handleLegendClick);
    map.on("zoom", () => {
      applySymbolLabelAnchorPriority();
      updateMapModeAppearance();
    });

    map.addSource("counties-source", {
      type: "geojson",
      data: COUNTY_DATA_URL,
    });

    addLayerBelowLabels({
      id: "county-boundaries-glow-wide-layer",
      type: "line",
      source: "counties-source",
      filter: ["==", ["get", "featureKind"], "boundary"],
      layout: {
        "line-cap": "round",
        "line-join": "round",
        visibility: "none",
      },
      paint: {
        "line-color": rgbToCss(COUNTY_SYMBOL_COLOR),
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          6, 9,
          9, 12,
          12, 15.5,
        ],
        "line-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          6, 0.06,
          10, 0.1,
        ],
        "line-blur": 4.2,
      },
    });

    addLayerBelowLabels({
      id: "county-boundaries-glow-mid-layer",
      type: "line",
      source: "counties-source",
      filter: ["==", ["get", "featureKind"], "boundary"],
      layout: {
        "line-cap": "round",
        "line-join": "round",
        visibility: "none",
      },
      paint: {
        "line-color": rgbToCss(COUNTY_SYMBOL_COLOR),
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          6, 5,
          9, 6.8,
          12, 8.8,
        ],
        "line-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          6, 0.12,
          10, 0.18,
        ],
        "line-blur": 2.1,
      },
    });

    addLayerBelowLabels({
      id: "county-boundaries-layer",
      type: "line",
      source: "counties-source",
      filter: ["==", ["get", "featureKind"], "boundary"],
      layout: {
        "line-cap": "round",
        "line-join": "round",
        visibility: "none",
      },
      paint: {
        "line-color": rgbToCss(COUNTY_SYMBOL_COLOR),
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          6, 0.8,
          9, 1.35,
          12, 2,
        ],
        "line-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          6, 0.68,
          10, 0.88,
        ],
      },
    });

    addLayerBelowLabels({
      id: "county-labels-layer",
      type: "symbol",
      source: "counties-source",
      filter: ["==", ["get", "featureKind"], "label"],
      minzoom: 5.5,
      maxzoom: 11,
      layout: {
        "text-field": ["get", "countyName"],
        "text-transform": "uppercase",
        "text-font": ["Manrope Bold", "Manrope Medium"],
        "text-size": [
          "interpolate",
          ["linear"],
          ["zoom"],
          6, 12.5,
          9, 16,
        ],
        "text-max-width": 8,
        "text-letter-spacing": 0.12,
        "text-allow-overlap": true,
        "text-ignore-placement": true,
        visibility: "none",
      },
      paint: {
        "text-color": rgbaToCss(COUNTY_SYMBOL_COLOR, 0.95),
        "text-halo-color": "rgba(255, 248, 233, 0.9)",
        "text-halo-width": 1.4,
        "text-halo-blur": 0.4,
      },
    });

    map.addSource("places-source", {
      type: "geojson",
      data: buildMapCollection(atlasData.places),
    });
    await ensureTotalMarkerImages();
    prewarmSecondaryMarkerImages(atlasData.places);

    addLayerBelowLabels({
      id: "linked-places-shadow-layer",
      type: "circle",
      source: "places-source",
      paint: {
        "circle-radius": buildRadiusExpression(
          PLACE_RADIUS_STOPS,
          1,
          TOTAL_SHADOW_RADIUS_OFFSET,
        ),
        "circle-color": rgbToCss(TOTAL_SHADOW_COLOR),
        "circle-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          ...circleShadowOpacityStops,
        ],
        "circle-blur": TOTAL_SHADOW_BLUR,
        "circle-translate": TOTAL_SHADOW_TRANSLATE,
        "circle-translate-anchor": "viewport",
      },
    });

    addLayerBelowLabels({
      id: "linked-places-total-layer",
      type: "symbol",
      source: "places-source",
      layout: {
        "icon-image": buildTotalMarkerImageExpression(),
        "icon-anchor": "center",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "symbol-sort-key": ["*", -1, ["get", "tuneCount"]],
        "icon-size": buildIconSizeExpression(getPlaceMarkerIconSize),
        visibility: "visible",
      },
      paint: {
        "icon-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          ...markerOpacityStops,
        ],
      },
    });

    addLayerBelowLabels({
      id: "linked-places-block-layer",
      type: "symbol",
      source: "places-source",
      layout: {
        "icon-image": ["get", "blockMarkerId"],
        "icon-anchor": "center",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "symbol-sort-key": ["*", -1, ["get", "tuneCount"]],
        "icon-size": buildIconSizeExpression(getBlockMarkerIconSize),
        visibility: "none",
      },
      paint: {
        "icon-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          ...blockMarkerOpacityStops,
        ],
      },
    });

    addLayerBelowLabels({
      id: "linked-places-ring-layer",
      type: "symbol",
      source: "places-source",
      layout: {
        "icon-image": ["get", "ringMarkerId"],
        "icon-anchor": "center",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "symbol-sort-key": ["*", -1, ["get", "tuneCount"]],
        "icon-size": buildIconSizeExpression(getRingMarkerIconSize),
        visibility: "none",
      },
      paint: {
        "icon-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          ...blockMarkerOpacityStops,
        ],
      },
    });

    addLayerBelowLabels({
      id: "linked-places-cone-layer",
      type: "symbol",
      source: "places-source",
      layout: {
        "icon-image": ["get", "coneMarkerId"],
        "icon-anchor": "center",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "symbol-sort-key": ["*", -1, ["get", "tuneCount"]],
        "icon-size": buildIconSizeExpression(getConeMarkerIconSize, CONE_CLASS_STOPS),
        visibility: "none",
      },
      paint: {
        "icon-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          ...coneMarkerOpacityStops,
        ],
      },
    });

    map.addSource("related-places-source", {
      type: "geojson",
      data: EMPTY_COLLECTION,
    });

    addLayerBelowPlaceMarkers({
      id: "related-places-glow-layer",
      type: "circle",
      source: "related-places-source",
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["get", "tuneCount"],
          ...PLACE_RADIUS_STOPS.flatMap((stop) => [
            stop.count,
            stop.radius + ACTIVE_PLACE_RADIUS_OFFSET_TOTAL + ACTIVE_PLACE_GLOW_RADIUS_OFFSET,
          ]),
        ],
        "circle-color": `rgba(${ACTIVE_PLACE_STROKE_COLOR.join(", ")}, 1)`,
        "circle-opacity": ACTIVE_PLACE_GLOW_OPACITY,
        "circle-blur": ACTIVE_PLACE_GLOW_BLUR,
      },
    });

    addLayerBelowPlaceMarkers({
      id: "related-places-outer-stroke-layer",
      type: "circle",
      source: "related-places-source",
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["get", "tuneCount"],
          ...PLACE_RADIUS_STOPS.flatMap((stop) => [stop.count, stop.radius + ACTIVE_PLACE_RADIUS_OFFSET_TOTAL]),
        ],
        "circle-color": "rgba(255, 248, 233, 0)",
        "circle-stroke-width": ACTIVE_PLACE_OUTER_STROKE_WIDTH,
        "circle-stroke-color": `rgba(${ACTIVE_PLACE_STROKE_COLOR.join(", ")}, 0.96)`,
      },
    });

    addLayerBelowPlaceMarkers({
      id: "related-places-layer",
      type: "circle",
      source: "related-places-source",
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["get", "tuneCount"],
          ...PLACE_RADIUS_STOPS.flatMap((stop) => [stop.count, stop.radius + ACTIVE_PLACE_RADIUS_OFFSET_TOTAL]),
        ],
        "circle-color": "rgba(255, 248, 233, 0)",
        "circle-stroke-width": ACTIVE_PLACE_INNER_STROKE_WIDTH,
        "circle-stroke-color": "rgba(255, 248, 233, 0.96)",
      },
    });

    map.addSource("active-place-source", {
      type: "geojson",
      data: EMPTY_COLLECTION,
    });

    ensureActivePlaceRectImages().catch((error) => {
      console.error(error);
    });

    addLayerBelowPlaceMarkers({
      id: "active-place-glow-layer",
      type: "circle",
      source: "active-place-source",
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["get", "tuneCount"],
          ...PLACE_RADIUS_STOPS.flatMap((stop) => [
            stop.count,
            stop.radius + ACTIVE_PLACE_RADIUS_OFFSET_TOTAL + ACTIVE_PLACE_GLOW_RADIUS_OFFSET,
          ]),
        ],
        "circle-color": `rgba(${ACTIVE_PLACE_STROKE_COLOR.join(", ")}, 1)`,
        "circle-opacity": ACTIVE_PLACE_GLOW_OPACITY,
        "circle-blur": ACTIVE_PLACE_GLOW_BLUR,
      },
    });

    addLayerBelowPlaceMarkers({
      id: "active-place-outer-stroke-layer",
      type: "circle",
      source: "active-place-source",
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["get", "tuneCount"],
          ...PLACE_RADIUS_STOPS.flatMap((stop) => [stop.count, stop.radius + ACTIVE_PLACE_RADIUS_OFFSET_TOTAL]),
        ],
        "circle-color": "rgba(255, 248, 233, 0)",
        "circle-stroke-width": ACTIVE_PLACE_OUTER_STROKE_WIDTH,
        "circle-stroke-color": `rgba(${ACTIVE_PLACE_STROKE_COLOR.join(", ")}, 0.96)`,
      },
    });

    addLayerBelowPlaceMarkers({
      id: "active-place-layer",
      type: "circle",
      source: "active-place-source",
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["get", "tuneCount"],
          ...PLACE_RADIUS_STOPS.flatMap((stop) => [stop.count, stop.radius + ACTIVE_PLACE_RADIUS_OFFSET_TOTAL]),
        ],
        "circle-color": "rgba(255, 248, 233, 0)",
        "circle-stroke-width": ACTIVE_PLACE_INNER_STROKE_WIDTH,
        "circle-stroke-color": "rgba(255, 248, 233, 0.96)",
      },
    });

    addLayerBelowPlaceMarkers({
      id: "active-place-rect-layer",
      type: "symbol",
      source: "active-place-source",
      layout: {
        visibility: "none",
        "icon-image": buildActivePlaceRectImageExpression(),
        "icon-size": buildActivePlaceRectIconSizeExpression(),
        "icon-anchor": "center",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
    });

    ensureHighlightLayersBelowMarkers();

    [...symbolLabelLevels].reverse().forEach((level) => {
      map.addLayer({
        id: level.layerId,
        type: "symbol",
        source: "places-source",
        filter:
          level.maxCount == null
            ? [">=", ["get", "tuneCount"], level.minCount]
            : [
                "all",
                [">=", ["get", "tuneCount"], level.minCount],
                ["<=", ["get", "tuneCount"], level.maxCount],
              ],
        layout: {
          visibility: "none",
          "text-field": ["get", "name"],
          "text-font": ["Manrope Medium", "Manrope Regular"],
          "symbol-sort-key": ["*", -1, ["get", "tuneCount"]],
          "text-size": level.textSize,
          "text-variable-anchor": getSymbolLabelAnchorPriorityForZoom(map.getZoom()),
          "text-radial-offset": level.radialOffset,
          "text-justify": "auto",
          "text-max-width": 10,
          "text-padding": 6,
          "text-optional": true,
          "text-allow-overlap": false,
          "text-ignore-placement": false,
        },
        paint: {
          "text-color": level.textColor,
          "text-halo-color": rgbaToCss(PLACE_LABEL_HALO_COLOR, 0.94),
          "text-halo-width": 1.35,
          "text-halo-blur": 0.35,
          "text-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            ...placeLabelOpacityStops,
          ],
        },
      });
    });

    ["linked-places-total-layer", "linked-places-block-layer", "linked-places-ring-layer", "linked-places-cone-layer", ...symbolLabelLevels.map((level) => level.layerId)].forEach((layerId) => {
      map.on("mousemove", layerId, handleFeatureHover);
      map.on("mouseleave", layerId, hideHoverPopup);
      map.on("click", layerId, handleFeatureClick);
    });

    map.on("click", handleMapClick);

    attachResetButtonToNavigationGroup();
    applyLabelVisibilityStates();
    applyCountyVisibility();
    updateMapModeAppearance();

    hasLoaded = true;
    pendingTasks.splice(0).forEach((task) => task());
  });

  updateLayerControlsState();
  syncLegendSurfaceState();

  return {
    fitToAtlas(bounds, viewportPadding) {
      runOrQueue(() => {
        fitBounds(bounds, viewportPadding);
      });
    },

    focusPlace(place, viewportPadding) {
      if (!place) {
        return;
      }

      runOrQueue(() => {
        map.easeTo({
          center: place.coordinates,
          zoom: Math.max(map.getZoom(), PLACE_FOCUS_ZOOM),
          duration: 1000,
          padding: resolveViewportPadding(viewportPadding),
        });
      });
    },

    focusPlaces(places, viewportPadding) {
      if (!places || places.length === 0) {
        return;
      }

      if (places.length === 1) {
        this.focusPlace(places[0], viewportPadding);
        return;
      }

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

      runOrQueue(() => {
        fitBounds(
          [
            [west, south],
            [east, north],
          ],
          viewportPadding,
        );
      });
    },

    setSelections({
      selectedPlace,
      selectedTune,
      visiblePlaces,
      mapMode,
      isNarrowViewport,
      mobilePanel,
    }) {
      runOrQueue(() => {
        const mapPlaces =
          visiblePlaces && visiblePlaces.length ? visiblePlaces : atlasData.places;
        currentMapMode = mapMode || MAP_MODE_TOTAL;
        currentIsNarrowViewport = Boolean(isNarrowViewport);
        currentMobilePanel = currentIsNarrowViewport ? mobilePanel || null : null;
        coneReferenceMaxCount = Math.max(getMaxTuneTypeCountForPlaces(mapPlaces), 1);
        visiblePlacesById = new Map(mapPlaces.map((place) => [place.id, place]));
        const activePlace = selectedPlace ? resolveVisiblePlace(selectedPlace) : null;
        lockedPlace = activePlace;
        hoveredPlace = resolveVisiblePlace(hoveredPlace);
        syncLegendSurfaceState();
        updateSource(
          "places-source",
          buildMapCollection(mapPlaces),
        );
        updateMapModeAppearance();

        const relatedPlaces = selectedTune
          ? selectedTune.relatedPlaces.filter(
              (place) => !selectedPlace || place.id !== selectedPlace.id,
            )
          : [];
        const singleRelatedPlace =
          !activePlace && relatedPlaces.length === 1
            ? resolveVisiblePlace(relatedPlaces[0])
            : null;

        updateSource(
          "related-places-source",
          createHighlightedPlacesCollection(relatedPlaces, currentMapMode),
        );

        updateSource(
          "active-place-source",
          createActivePlaceCollection(getHighlightedPlace(), currentMapMode),
        );

        const popupPlace = getHighlightedPlace() || singleRelatedPlace;
        if (popupPlace) {
          showPopupForPlace(popupPlace);
        } else {
          hoverPopup.remove();
        }
      });
    },

    resize() {
      if (hasLoaded) {
        map.resize();
        applyNavigationMaxBounds();
      }
    },
  };
}
