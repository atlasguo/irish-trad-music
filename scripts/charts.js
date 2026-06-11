import { CHART_COLORS } from "./config.js";
import { getTuneTypeColor, getTuneTypeIconPath, getTuneTypeSymbolColor } from "./data.js";

export function createChartsController() {
  const chartInstances = [];
  const tuneTypeIconImages = new Map();

  function getTuneTypeIconImage(type, chart) {
    const iconPath = getTuneTypeIconPath(type);
    if (!iconPath) {
      return null;
    }

    if (tuneTypeIconImages.has(iconPath)) {
      return tuneTypeIconImages.get(iconPath);
    }

    const image = new Image();
    const iconEntry = { image, status: "loading" };
    tuneTypeIconImages.set(iconPath, iconEntry);
    image.addEventListener("load", () => {
      iconEntry.status = "loaded";
      if (chart.ctx) {
        chart.draw();
      }
    });
    image.addEventListener("error", () => {
      iconEntry.status = "error";
      if (chart.ctx) {
        chart.draw();
      }
    });
    image.src = iconPath;
    return iconEntry;
  }

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

          const size = 24;
          const x = yScale.left + 4;
          const top = y - size / 2;
          const iconEntry = getTuneTypeIconImage(entry.rawType || entry.label, chart);

          if (iconEntry?.status === "loaded") {
            ctx.drawImage(iconEntry.image, x, top, size, size);
            return;
          }

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
            borderRadius: 8,
            borderSkipped: false,
            barThickness: 18,
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
        layout: {
          padding: {
            top: 0,
          },
        },
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          x: {
            ticks: {
              font: {
                weight: 600,
              },
            },
            grid: {
              color: CHART_COLORS.grid,
            },
          },
          y: {
            ticks: {
              font: {
                weight: 600,
              },
            },
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
            backgroundColor: atlasData.tuneTypesChart.map((entry) =>
              getTuneTypeSymbolColor(entry.rawType || entry.label),
            ),
            borderRadius: 8,
            borderSkipped: false,
            barThickness: 18,
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
        layout: {
          padding: {
            top: 0,
          },
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
            ticks: {
              font: {
                weight: 600,
              },
            },
            grid: {
              color: CHART_COLORS.grid,
            },
          },
          y: {
            ticks: {
              autoSkip: false,
              padding: 30,
              font: {
                weight: 600,
              },
            },
            grid: {
              display: false,
            },
          },
        },
      },
    });

    chartInstances.push(topPlacesChart, tuneTypesChart);

    if (canvasElements.placeTypes && atlasData.placeTypesChart?.length) {
      const placeTypesChart = new window.Chart(canvasElements.placeTypes, {
        type: "bar",
        data: {
          labels: atlasData.placeTypesChart.map((e) => e.label),
          datasets: [
            {
              data: atlasData.placeTypesChart.map((e) => e.value),
              backgroundColor(context) {
                return createHorizontalBarGradient(
                  context.chart,
                  CHART_COLORS.accentGradientStart,
                  CHART_COLORS.accentGradientEnd,
                  CHART_COLORS.accent,
                );
              },
              borderRadius: 8,
              borderSkipped: false,
              barThickness: 18,
            },
          ],
        },
        options: {
          indexAxis: "y",
          maintainAspectRatio: false,
          onClick(event) {
            if (typeof interactions.onPlaceTypeSelect !== "function") {
              return;
            }
            const entry = getCategoryEntryFromEvent(
              placeTypesChart,
              event,
              atlasData.placeTypesChart,
            );
            if (entry && entry.label) {
              interactions.onPlaceTypeSelect(entry.rawType || entry.label);
            }
          },
          onHover(event) {
            if (event.native && event.native.target) {
              event.native.target.style.cursor =
                getCategoryEntryFromEvent(placeTypesChart, event, atlasData.placeTypesChart)
                  ? "pointer"
                  : "default";
            }
          },
          layout: { padding: { top: 0 } },
          plugins: { legend: { display: false } },
          scales: {
            x: {
              beginAtZero: true,
              ticks: { font: { weight: 600 } },
              grid: { color: CHART_COLORS.grid },
            },
            y: {
              ticks: { font: { weight: 600 } },
              grid: { display: false },
            },
          },
        },
      });
      chartInstances.push(placeTypesChart);
    }
  }

  function renderPlaceDetailChart(canvasElement, placeChartData) {
    if (!window.Chart || !canvasElement || !placeChartData.length) {
      return;
    }

    const chart = new window.Chart(canvasElement, {
      type: "bar",
      plugins: [createTuneTypeTickDotsPlugin(placeChartData)],
      data: {
        labels: placeChartData.map((e) => e.label),
        datasets: [
          {
            data: placeChartData.map((e) => e.value),
            backgroundColor: placeChartData.map((e) =>
              getTuneTypeSymbolColor(e.rawType || e.label),
            ),
            borderRadius: 8,
            borderSkipped: false,
            barThickness: 18,
          },
        ],
      },
      options: {
        indexAxis: "y",
        maintainAspectRatio: false,
        layout: { padding: { top: 0 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(context) {
                const value = Number(context.raw) || 0;
                const total = placeChartData.reduce((sum, e) => sum + (Number(e.value) || 0), 0);
                const percent = total > 0 ? (value / total) * 100 : 0;
                return `${value} ${value === 1 ? "tune" : "tunes"} (${percent.toFixed(1)}%)`;
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { font: { weight: 600 }, stepSize: 1 },
            grid: { color: CHART_COLORS.grid },
          },
          y: {
            ticks: { autoSkip: false, padding: 30, font: { weight: 600 } },
            grid: { display: false },
          },
        },
      },
    });

    chartInstances.push(chart);
  }

  return {
    destroyAll,
    renderOverviewCharts,
    renderPlaceDetailChart,
  };
}
