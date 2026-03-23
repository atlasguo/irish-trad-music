export const MAPBOX_STYLE =
  "mapbox://styles/atlaskwok/cmmte91f8001501qtepcz9454";

export const MAPBOX_ACCESS_TOKEN = "pk.eyJ1IjoiYXRsYXNrd29rIiwiYSI6ImNtbjM4c2huYjFoZ2wycHB3MXZzaW41c3gifQ.8s3xn1dB-m49gWBltabckw";

export const SIDEBAR_BREAKPOINT = 900;
export const DESKTOP_SIDEBAR_WIDTH = 420;
export const MOBILE_SIDEBAR_WIDTH = "min(88vw, 420px)";
export const MOBILE_PANEL_MIN_HEIGHT = 320;
export const MOBILE_PANEL_MAX_HEIGHT = 640;
export const MOBILE_PANEL_HEIGHT_RATIO = 3 / 5;
export const MOBILE_PANEL_COLLAPSED_BOTTOM_PADDING = 88;
export const MOBILE_PANEL_OPEN_GAP = 24;
export const MAP_PADDING = {
  top: 56,
  right: 56,
  bottom: 56,
};

export const PLACEHOLDER_VALUE = "Not yet provided";

export const CHART_COLORS = {
  linked: "#c7a15d",
  other: "#6b8265",
  bar: "#6a855f",
  barGradientStart: "#88a17d",
  barGradientEnd: "#506a48",
  accent: "#c07a57",
  accentGradientStart: "#cb8967",
  accentGradientEnd: "#a85b39",
  text: "#16312d",
  grid: "rgba(27, 47, 45, 0.15)",
};

export function hasMapboxToken() {
  return (
    typeof MAPBOX_ACCESS_TOKEN === "string" &&
    MAPBOX_ACCESS_TOKEN.trim() !== "" &&
    !MAPBOX_ACCESS_TOKEN.includes("YOUR_")
  );
}
