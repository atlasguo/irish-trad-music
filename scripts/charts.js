import { CHART_COLORS } from "./config.js";
import { getTuneTypeColor } from "./data.js";

export function createChartsController() {
  const chartInstances = [];

  function createTuneTypeTickDotsPlugin(entries) {
    return {
      id: "tune-type-tick-dots",
      afterDraw(chart) {
        const yScale = chart.scales.y;
        const { ctx } = chart;
        if (!yScale || !ctx) {
          return;
        }

        ctx.save();

        entries.forEach((entry, index) => {
          const y = yScale.getPixelForTick(index);
          if (!Number.isFinite(y)) {
            return;
          }

          const size = 11;
          const x = yScale.left + 8 - size / 2;
          const top = y - size / 2;
          const radius = 2;
          ctx.beginPath();
          ctx.moveTo(x + radius, top);
          ctx.lineTo(x + size - radius, top);
          ctx.quadraticCurveTo(x + size, top, x + size, top + radius);
          ctx.lineTo(x + size, top + size - radius);
          ctx.quadraticCurveTo(x + size, top + size, x + size - radius, top + size);
          ctx.lineTo(x + radius, top + size);
          ctx.quadraticCurveTo(x, top + size, x, top + size - radius);
          ctx.lineTo(x, top + radius);
          ctx.quadraticCurveTo(x, top, x + radius, top);
          ctx.closePath();
          ctx.fillStyle = getTuneTypeColor(entry.rawType || entry.label);
          ctx.fill();
          ctx.lineWidth = 1;
          ctx.strokeStyle = "rgba(255, 248, 233, 0.92)";
          ctx.stroke();
        });

        ctx.restore();
      },
    };
  }

  function createHorizontalBarGradient(chart, startColor, endColor, fallbackColor) {
    const { ctx, chartArea } = chart;
    if (!ctx || !chartArea) {
      return fallbackColor;
    }

    const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
    gradient.addColorStop(0, startColor);
    gradient.addColorStop(1, endColor);
    return gradient;
  }

  function getCategoryEntryFromEvent(chart, event, entries) {
    const activeBar = chart.getActiveElements()[0];
    if (activeBar) {
      return entries[activeBar.index] || null;
    }

    const scale = chart.scales.y;
    if (!scale || typeof event.x !== "number" || typeof event.y !== "number") {
      return null;
    }

    if (event.y < scale.top || event.y > scale.bottom) {
      return null;
    }

    if (event.x < scale.left || event.x > chart.chartArea.right) {
      return null;
    }

    const rawIndex = scale.getValueForPixel(event.y);
    const index = Number.isFinite(rawIndex) ? Math.round(rawIndex) : NaN;

    if (Number.isNaN(index) || index < 0 || index >= entries.length) {
      return null;
    }

    return entries[index] || null;
  }

  function destroyAll() {
    while (chartInstances.length > 0) {
      const chart = chartInstances.pop();
      chart.destroy();
    }
  }

  function renderOverviewCharts(canvasElements, atlasData, interactions = {}) {
    destroyAll();

    if (!window.Chart || !canvasElements.topPlaces || !canvasElements.tuneTypes) {
      return;
    }

    window.Chart.defaults.color = CHART_COLORS.text;
    window.Chart.defaults.font.family = '"Manrope", sans-serif';

    const topPlacesChart = new window.Chart(canvasElements.topPlaces, {
      type: "bar",
      data: {
        labels: atlasData.topPlacesChart.map((entry) => entry.label),
        datasets: [
          {
            data: atlasData.topPlacesChart.map((entry) => entry.value),
            backgroundColor(context) {
              return createHorizontalBarGradient(
                context.chart,
                CHART_COLORS.barGradientStart,
                CHART_COLORS.barGradientEnd,
                CHART_COLORS.bar,
              );
            },
            borderRadius: 10,
            borderSkipped: false,
          },
        ],
      },
      options: {
        indexAxis: "y",
        maintainAspectRatio: false,
        onClick(event) {
          if (typeof interactions.onPlaceSelect !== "function") {
            return;
          }

          const entry = getCategoryEntryFromEvent(
            topPlacesChart,
            event,
            atlasData.topPlacesChart,
          );
          if (!entry) {
            return;
          }

          if (entry.placeIds && entry.placeIds.length > 1) {
            if (typeof interactions.onPlaceGroupSelect === "function") {
              interactions.onPlaceGroupSelect(entry.label, entry.placeIds);
            }
            return;
          }

          if (entry.placeId) {
            interactions.onPlaceSelect(entry.placeId);
          }
        },
        onHover(event) {
          if (event.native && event.native.target) {
            event.native.target.style.cursor =
              getCategoryEntryFromEvent(topPlacesChart, event, atlasData.topPlacesChart)
                ? "pointer"
                : "default";
          }
        },
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          x: {
            grid: {
              color: CHART_COLORS.grid,
            },
          },
          y: {
            grid: {
              display: false,
            },
          },
        },
      },
    });

    const tuneTypesChart = new window.Chart(canvasElements.tuneTypes, {
      type: "bar",
      plugins: [createTuneTypeTickDotsPlugin(atlasData.tuneTypesChart)],
      data: {
        labels: atlasData.tuneTypesChart.map((entry) => entry.label),
        datasets: [
          {
            data: atlasData.tuneTypesChart.map((entry) => entry.value),
            backgroundColor(context) {
              return createHorizontalBarGradient(
                context.chart,
                CHART_COLORS.accentGradientStart,
                CHART_COLORS.accentGradientEnd,
                CHART_COLORS.accent,
              );
            },
            borderRadius: 10,
            borderSkipped: false,
          },
        ],
      },
      options: {
        indexAxis: "y",
        maintainAspectRatio: false,
        onClick(event) {
          if (typeof interactions.onTuneTypeSelect !== "function") {
            return;
          }

          const entry = getCategoryEntryFromEvent(
            tuneTypesChart,
            event,
            atlasData.tuneTypesChart,
          );
          if (entry && entry.label) {
            interactions.onTuneTypeSelect(entry.rawType || entry.label);
          }
        },
        onHover(event) {
          if (event.native && event.native.target) {
            event.native.target.style.cursor =
              getCategoryEntryFromEvent(tuneTypesChart, event, atlasData.tuneTypesChart)
                ? "pointer"
                : "default";
          }
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label(context) {
                const value = Number(context.raw) || 0;
                const total = atlasData.tuneTypesChart.reduce(
                  (sum, entry) => sum + (Number(entry.value) || 0),
                  0,
                );
                const percent = total > 0 ? (value / total) * 100 : 0;
                const tuneLabel = value === 1 ? "tune" : "tunes";

                return `${value} ${tuneLabel} (${percent.toFixed(1)}%)`;
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: {
              color: CHART_COLORS.grid,
            },
          },
          y: {
            ticks: {
              autoSkip: false,
              padding: 18,
            },
            grid: {
              display: false,
            },
          },
        },
      },
    });

    chartInstances.push(topPlacesChart, tuneTypesChart);
  }

  return {
    destroyAll,
    renderOverviewCharts,
  };
}
