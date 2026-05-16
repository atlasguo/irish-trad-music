import { TUNE_TYPE_ORDER, formatTuneTypeLabel, getTuneTypeColor, getTuneTypeKey } from "./data.js";

const numberFormatter = new Intl.NumberFormat("en-US");
const TUNE_TYPE_ORDER_INDEX = new Map(TUNE_TYPE_ORDER.map((type, index) => [type, index]));

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderUiIcon(icon, className = "button-icon") {
  return `<span class="${className}" aria-hidden="true">${icon}</span>`;
}

function getTheSessionTuneUrl(tuneId) {
  return `https://thesession.org/tunes/${encodeURIComponent(String(tuneId || ""))}`;
}

const ABCJS_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/abcjs@6.6.2/dist/abcjs-basic-min.js";
const SMPLR_MODULE_URL = "https://unpkg.com/smplr@0.20.0/dist/index.mjs";
const DEFAULT_TUNE_AUDIO_STATUS_MESSAGE =
  "Plays the most popular cached The Session setting for this tune.";
const DEFAULT_TUNE_AUDIO_SPEED_VALUE = 0;
const MIN_TUNE_AUDIO_SPEED_VALUE = -10;
const MAX_TUNE_AUDIO_SPEED_VALUE = 2;
const DEFAULT_TUNE_AUDIO_MILLISECONDS_PER_MEASURE = 1000;
const TUNE_AUDIO_PLAYBACK_START_DELAY_MS = 50;
const TUNE_AUDIO_SOUNDFONT_KIT = "MusyngKite";
const TUNE_AUDIO_UNAVAILABLE_OPTION_SUFFIX = " (Unavailable)";
const TUNE_AUDIO_INSTRUMENT_OPTIONS = [
  { program: 22, label: "Accordion", smplrInstrumentName: "accordion" },
  { program: 25, label: "Acoustic Guitar (nylon)", smplrInstrumentName: "acoustic_guitar_nylon" },
  { program: 26, label: "Acoustic Guitar (steel)", smplrInstrumentName: "acoustic_guitar_steel" },
  { program: 110, label: "Bagpipe", smplrInstrumentName: "bagpipe" },
  { program: 106, label: "Banjo", smplrInstrumentName: "banjo" },
  { program: 16, label: "Dulcimer", smplrInstrumentName: "dulcimer" },
  { program: 111, label: "Fiddle", smplrInstrumentName: "fiddle" },
  { program: 74, label: "Flute", smplrInstrumentName: "flute" },
  { program: 23, label: "Harmonica", smplrInstrumentName: "harmonica" },
  { program: 47, label: "Harp", smplrInstrumentName: "orchestral_harp" },
  { program: 41, label: "Violin", smplrInstrumentName: "violin" },
  { program: 79, label: "Whistle", smplrInstrumentName: "whistle" },
];

const DEFAULT_TUNE_AUDIO_INSTRUMENT_PROGRAM = 47; // Harp remains the default
const UI_ICONS = {
  chevron: "&#8250;",
  map: "&gt;",
  random: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" role="img" aria-hidden="true">
      <polygon points="12,3 14,9.5 16.5,12 14,14.5 12,20 10,14.5 7.5,12 10,9.5" fill="none" stroke="currentColor" stroke-width="1" stroke-linejoin="round" stroke-linecap="round" />
    </svg>
  `,
  randomTune: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" role="img" aria-hidden="true">
      <polygon points="12,3 14,9.5 16.5,12 14,14.5 12,20 10,14.5 7.5,12 10,9.5" fill="none" stroke="currentColor" stroke-width="1" stroke-linejoin="round" stroke-linecap="round" />
    </svg>
  `,
  reset: "&#8634;",
};

let abcjsScriptPromise = null;
let smplrModulePromise = null;

function normalizeTheSessionTuneAudioAbc(abcText) {
  const rawAbcText = String(abcText || "").trim();
  if (!rawAbcText) {
    return "";
  }

  let normalizedAbcText = "";
  let inQuote = false;

  for (let index = 0; index < rawAbcText.length; index += 1) {
    const currentCharacter = rawAbcText[index];

    if (currentCharacter === '"') {
      inQuote = !inQuote;
      normalizedAbcText += currentCharacter;
      continue;
    }

    if (currentCharacter !== "!" || inQuote) {
      normalizedAbcText += currentCharacter;
      continue;
    }

    let decorationEndIndex = index + 1;
    while (
      decorationEndIndex < rawAbcText.length &&
      rawAbcText[decorationEndIndex] !== "!" &&
      !/[\r\n\t ]/.test(rawAbcText[decorationEndIndex])
    ) {
      decorationEndIndex += 1;
    }

    if (
      decorationEndIndex < rawAbcText.length &&
      rawAbcText[decorationEndIndex] === "!" &&
      decorationEndIndex > index + 1
    ) {
      normalizedAbcText += rawAbcText.slice(index, decorationEndIndex + 1);
      index = decorationEndIndex;
      continue;
    }

    normalizedAbcText += "\n";
    while (index + 1 < rawAbcText.length && /[\r\n\t ]/.test(rawAbcText[index + 1])) {
      index += 1;
    }
  }

  return normalizedAbcText.replace(/\n{2,}/g, "\n");
}

function normalizeTuneAudioInstrumentProgram(value) {
  const parsedValue = Number.parseInt(String(value ?? DEFAULT_TUNE_AUDIO_INSTRUMENT_PROGRAM), 10);
  if (!Number.isFinite(parsedValue)) {
    return DEFAULT_TUNE_AUDIO_INSTRUMENT_PROGRAM;
  }

  return TUNE_AUDIO_INSTRUMENT_OPTIONS.some((option) => option.program === parsedValue)
    ? parsedValue
    : DEFAULT_TUNE_AUDIO_INSTRUMENT_PROGRAM;
}

function getTuneAudioInstrumentOption(program) {
  const normalizedProgram = normalizeTuneAudioInstrumentProgram(program);

  return (
    TUNE_AUDIO_INSTRUMENT_OPTIONS.find((option) => option.program === normalizedProgram) ||
    TUNE_AUDIO_INSTRUMENT_OPTIONS[0]
  );
}

function isTuneAudioInstrumentAvailable(program) {
  return Boolean(getTuneAudioInstrumentOption(program)?.smplrInstrumentName);
}

function getTuneAudioInstrumentUnavailableMessage(program) {
  const option = getTuneAudioInstrumentOption(program);
  if (option?.smplrInstrumentName) {
    return "";
  }

  return `${option?.label || "This instrument"} isn't available in this playback engine.`;
}

function renderTuneAudioInstrumentOptions(selectedProgram) {
  const resolvedProgram = normalizeTuneAudioInstrumentProgram(selectedProgram);

  return TUNE_AUDIO_INSTRUMENT_OPTIONS.map(
    (option) => `
      <option
        value="${option.program}"
        ${option.program === resolvedProgram ? "selected" : ""}
        ${option.smplrInstrumentName ? "" : "disabled"}
      >
        ${escapeHtml(
          option.smplrInstrumentName
            ? option.label
            : `${option.label}${TUNE_AUDIO_UNAVAILABLE_OPTION_SUFFIX}`,
        )}
      </option>
    `,
  ).join("");
}

function getTuneAudioPlaybackUnitSeconds(millisecondsPerMeasure, meterSize) {
  const resolvedMeterSize = Number.isFinite(meterSize) && meterSize > 0 ? meterSize : 1;
  return millisecondsPerMeasure / 1000 / resolvedMeterSize;
}

function getTuneAudioPlaybackDurationMs(playbackSequence, millisecondsPerMeasure, meterSize) {
  const totalDurationUnits =
    Number.isFinite(playbackSequence?.totalDuration) && playbackSequence.totalDuration > 0
      ? playbackSequence.totalDuration
      : 0;

  if (!(totalDurationUnits > 0)) {
    return 0;
  }

  return Math.ceil(
    totalDurationUnits * getTuneAudioPlaybackUnitSeconds(millisecondsPerMeasure, meterSize) * 1000,
  );
}

function getTuneAudioMeterSize(parsedTune) {
  const meter = parsedTune?.getMeterFraction?.() || {};
  const numerator = Number(meter.num);
  const denominator = Number(meter.den);

  if (!(numerator > 0) || !(denominator > 0)) {
    return 1;
  }

  return numerator / denominator;
}


function normalizeTuneAudioSpeedValue(value) {
  const parsedValue = Number.parseInt(String(value ?? DEFAULT_TUNE_AUDIO_SPEED_VALUE), 10);
  if (!Number.isFinite(parsedValue)) {
    return DEFAULT_TUNE_AUDIO_SPEED_VALUE;
  }

  return Math.min(
    MAX_TUNE_AUDIO_SPEED_VALUE,
    Math.max(MIN_TUNE_AUDIO_SPEED_VALUE, parsedValue),
  );
}

function getTuneAudioMillisecondsPerMeasure(baseMillisecondsPerMeasure, speedValue) {
  const resolvedBaseMillisecondsPerMeasure =
    Number.isFinite(baseMillisecondsPerMeasure) && baseMillisecondsPerMeasure > 0
      ? baseMillisecondsPerMeasure
      : DEFAULT_TUNE_AUDIO_MILLISECONDS_PER_MEASURE;
  const resolvedSpeedValue = normalizeTuneAudioSpeedValue(speedValue);

  return resolvedBaseMillisecondsPerMeasure - (resolvedSpeedValue * resolvedBaseMillisecondsPerMeasure) / 6;
}

function getTheSessionDefaultTuneAudioMillisecondsPerMeasure(abcText) {
  const normalizedAbcText = String(abcText || "");

  if (normalizedAbcText.includes("M: 3/2")) {
    return 2000;
  }

  if (normalizedAbcText.includes("M: 12/8")) {
    return 1750;
  }

  if (normalizedAbcText.includes("M: 9/8")) {
    return 1500;
  }

  if (normalizedAbcText.includes("M: 2/4")) {
    return 800;
  }

  if (normalizedAbcText.includes("M: 4/4")) {
    return 1250;
  }

  return DEFAULT_TUNE_AUDIO_MILLISECONDS_PER_MEASURE;
}

function formatTuneAudioSpeedLabel(speedValue) {
  const resolvedSpeedValue = normalizeTuneAudioSpeedValue(speedValue);

  if (resolvedSpeedValue === 0) {
    return "Default";
  }

  if (resolvedSpeedValue < 0) {
    const stepCount = Math.abs(resolvedSpeedValue);
    return `${stepCount} step${stepCount === 1 ? "" : "s"} slower`;
  }

  return `${resolvedSpeedValue} step${resolvedSpeedValue === 1 ? "" : "s"} faster`;
}

function createTuneAudioState(tuneId = null, overrides = {}) {
  return {
    tuneId: tuneId ? String(tuneId) : null,
    status: "idle",
    message: DEFAULT_TUNE_AUDIO_STATUS_MESSAGE,
    settingKey: "",
    speedValue: DEFAULT_TUNE_AUDIO_SPEED_VALUE,
    instrumentProgram: DEFAULT_TUNE_AUDIO_INSTRUMENT_PROGRAM,
    ...overrides,
  };
}

function getTuneAudioButtonLabel(audioState) {
  if (audioState.status === "loading") {
    return "Loading...";
  }

  if (audioState.status === "error") {
    return "Try Again";
  }

  if (audioState.status === "playing") {
    return "Pause";
  }

  if (audioState.status === "paused") {
    return "Resume";
  }

  return "Play";
}

function getTuneAudioButtonSymbol(audioState) {
  if (audioState.status === "playing") {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" role="img" aria-hidden="true">
        <rect x="6.5" y="5" width="4" height="14" rx="1" fill="currentColor" />
        <rect x="13.5" y="5" width="4" height="14" rx="1" fill="currentColor" />
      </svg>
    `;
  }

  if (audioState.status === "paused" || audioState.status === "idle") {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" role="img" aria-hidden="true">
        <path d="M8 5.5v13l10-6.5-10-6.5z" fill="currentColor" />
      </svg>
    `;
  }

  return "";
}

function renderTuneAudioButtonContent(audioState) {
  const label = getTuneAudioButtonLabel(audioState);
  const symbol = getTuneAudioButtonSymbol(audioState);

  if (!symbol) {
    return escapeHtml(label);
  }

  return `
    <span class="tune-audio__button-icon" aria-hidden="true">${symbol}</span>
    <span class="tune-audio__button-label">${escapeHtml(label)}</span>
  `.trim();
}

function renderTuneAudioCard(selectedTune, audioState) {
  const tuneId = String(selectedTune?.id || "");
  const resolvedAudioState =
    audioState?.tuneId === tuneId ? audioState : createTuneAudioState(tuneId);
  const resolvedSpeedValue = normalizeTuneAudioSpeedValue(resolvedAudioState.speedValue);
  const resolvedInstrumentProgram = normalizeTuneAudioInstrumentProgram(
    resolvedAudioState.instrumentProgram,
  );
  const instrumentUnavailableMessage = isTuneAudioInstrumentAvailable(resolvedInstrumentProgram)
    ? ""
    : getTuneAudioInstrumentUnavailableMessage(resolvedInstrumentProgram);
  const statusMessage =
    resolvedAudioState.status === "error"
      ? resolvedAudioState.message
      : instrumentUnavailableMessage;
  const statusClassName = statusMessage ? " tune-audio__status--error" : "";
  const isPlayDisabled =
    resolvedAudioState.status === "loading" || Boolean(instrumentUnavailableMessage);

  return `
    <section
      class="detail-card detail-card--tune-audio"
      data-role="tune-audio-card"
      data-tune-id="${escapeHtml(tuneId)}"
    >
      <div class="tune-audio">
        <div class="panel-block__header">
          <h3>Tune Playback</h3>
        </div>
        <div class="tune-audio__controls">
          <div class="tune-audio__primary-row">
            <select
              class="select-input tune-audio__instrument-select"
              data-field="tune-audio-instrument"
              data-tune-id="${escapeHtml(tuneId)}"
              aria-label="Playback instrument"
              ${resolvedAudioState.status === "loading" ? "disabled" : ""}
            >
              ${renderTuneAudioInstrumentOptions(resolvedInstrumentProgram)}
            </select>
            <button
              class="ghost-button tune-audio__button"
              type="button"
              data-action="play-tune-audio"
              data-tune-id="${escapeHtml(tuneId)}"
              ${isPlayDisabled ? "disabled" : ""}
            >
              ${renderTuneAudioButtonContent(resolvedAudioState)}
            </button>
          </div>
          <div class="tune-audio__speed">
            <div class="tune-audio__speed-header">
              <p class="tune-audio__speed-label">Playback speed</p>
              <p class="tune-audio__speed-value">${escapeHtml(
                formatTuneAudioSpeedLabel(resolvedSpeedValue),
              )}</p>
            </div>
            <input
              class="tune-audio__speed-slider"
              type="range"
              min="${MIN_TUNE_AUDIO_SPEED_VALUE}"
              max="${MAX_TUNE_AUDIO_SPEED_VALUE}"
              step="1"
              value="${resolvedSpeedValue}"
              data-field="tune-audio-speed"
              data-tune-id="${escapeHtml(tuneId)}"
              aria-label="Playback speed"
              ${resolvedAudioState.status === "loading" ? "disabled" : ""}
            />
            <div class="tune-audio__speed-scale" aria-hidden="true">
              <span>Slower</span>
              <span>Faster</span>
            </div>
          </div>
        </div>
        <p class="tune-audio__copy">
          This plays the most popular cached setting. For more settings and notation,
          <a
            class="metadata-link"
            href="${escapeHtml(getTheSessionTuneUrl(tuneId))}"
            target="_blank"
            rel="noreferrer"
          >view this tune on The Session</a>.
        </p>
        ${
          statusMessage
            ? `
              <p class="tune-audio__status${statusClassName}">
                ${escapeHtml(statusMessage)}
              </p>
            `
            : ""
        }
      </div>
    </section>
  `;
}

function loadAbcjsLibrary() {
  if (window.ABCJS) {
    return Promise.resolve(window.ABCJS);
  }

  if (abcjsScriptPromise) {
    return abcjsScriptPromise;
  }

  abcjsScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${ABCJS_SCRIPT_URL}"]`);
    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if (window.ABCJS) {
          resolve(window.ABCJS);
        } else {
          abcjsScriptPromise = null;
          reject(new Error("Couldn't initialize the tune player."));
        }
      });
      existingScript.addEventListener("error", () => {
        abcjsScriptPromise = null;
        reject(new Error("Couldn't load the tune player."));
      });
      return;
    }

    const script = document.createElement("script");
    script.src = ABCJS_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      if (window.ABCJS) {
        resolve(window.ABCJS);
      } else {
        abcjsScriptPromise = null;
        reject(new Error("Couldn't initialize the tune player."));
      }
    };
    script.onerror = () => {
      abcjsScriptPromise = null;
      reject(new Error("Couldn't load the tune player."));
    };

    document.head.append(script);
  });

  return abcjsScriptPromise;
}

async function loadSmplrLibrary() {
  if (smplrModulePromise) {
    return smplrModulePromise;
  }

  smplrModulePromise = import(SMPLR_MODULE_URL).catch((error) => {
    smplrModulePromise = null;
    throw new Error(
      error instanceof Error && error.message
        ? error.message
        : "Couldn't load the sampled instrument library.",
    );
  });

  return smplrModulePromise;
}

function renderMetadataPart(part) {
  if (part.href) {
    return `
      <a
        class="metadata-link"
        href="${escapeHtml(part.href)}"
        target="_blank"
        rel="noreferrer"
      >${escapeHtml(part.text)}</a>
    `;
  }

  return escapeHtml(part.text);
}

function renderMetaLine(parts) {
  return `
    <small class="meta-line">
      ${parts
        .map((part, index) => {
          const omitSeparator = part && typeof part === "object" && part.omitSeparator;
          return index === 0 || omitSeparator
            ? renderMetaPart(part)
            : `<span class="meta-separator" aria-hidden="true">|</span>${renderMetaPart(part)}`;
        })
        .join("")}
    </small>
  `;
}

function renderMetaPart(part) {
  if (part && typeof part === "object" && typeof part.markup === "string") {
    return `<span>${part.markup}</span>`;
  }

  return `<span>${escapeHtml(part)}</span>`;
}

function renderTuneTypeDot(type, label = type, className = "") {
  const displayLabel = label === type ? formatTuneTypeLabel(type) : label;
  const normalizedClassName = className ? ` ${className}` : "";
  return `
    <span class="tune-type-inline${normalizedClassName}">
      <span
        class="tune-type-dot"
        style="--tune-type-color: ${escapeHtml(getTuneTypeColor(type))}"
        aria-hidden="true"
      ></span>
      <span>${escapeHtml(displayLabel)}</span>
    </span>
  `.trim();
}

function renderTuneTypeMetaPart(type, label = type) {
  return {
    markup: renderTuneTypeDot(type, label),
  };
}

function formatAlternativeNameCountLabel(countValue) {
  const count = Number.isFinite(countValue) ? countValue : 0;
  return `${numberFormatter.format(count)} alt name${count === 0 || count === 1 ? "" : "s"}`;
}

function formatPlaceCountLabel(countValue) {
  const count = Number.isFinite(countValue) ? countValue : 0;
  return `${numberFormatter.format(count)} place${count === 1 ? "" : "s"}`;
}

function formatTuneCountLabel(countValue) {
  const count = Number.isFinite(countValue) ? countValue : 0;
  return `${numberFormatter.format(count)} tune${count === 1 ? "" : "s"}`;
}

function renderPlaceListTuneCells(place) {
  const tunes = Array.isArray(place?.tunes) ? place.tunes : [];
  if (tunes.length === 0) {
    return "";
  }

  const sortedTunes = tunes
    .map((tune, index) => ({ tune, index }))
    .sort((leftEntry, rightEntry) => {
      const leftTypeRank =
        TUNE_TYPE_ORDER_INDEX.get(getTuneTypeKey(leftEntry.tune.type)) ?? Number.MAX_SAFE_INTEGER;
      const rightTypeRank =
        TUNE_TYPE_ORDER_INDEX.get(getTuneTypeKey(rightEntry.tune.type)) ?? Number.MAX_SAFE_INTEGER;

      if (leftTypeRank !== rightTypeRank) {
        return leftTypeRank - rightTypeRank;
      }

      return leftEntry.index - rightEntry.index;
    })
    .map(({ tune }) => tune);

  return `
    <span
      class="browse-list__tune-cells"
      aria-label="${escapeHtml(`${numberFormatter.format(tunes.length)} tunes related to this place`)}"
    >
      ${sortedTunes
        .map(
          (tune) => `
            <span
              class="browse-list__tune-cell"
              style="--tune-type-color: ${escapeHtml(getTuneTypeColor(tune.type))}"
              title="${escapeHtml(`${tune.primaryName} (${formatTuneTypeLabel(tune.type)})`)}"
            ></span>
          `,
        )
        .join("")}
    </span>
  `.trim();
}

function renderPlaceListMeta(place, atlasData, options = {}) {
  const { includeTuneCells = true } = options;
  const parts = [
    duplicateAwarePlaceLabel(place, atlasData.placeNameCounts),
    formatTuneCountLabel(place.tuneCount),
  ];

  if (includeTuneCells) {
    parts.push({ markup: renderPlaceListTuneCells(place), omitSeparator: true });
  }

  return renderMetaLine(parts);
}

function renderBrowseListCount(value, singularLabel) {
  const count = Number.isFinite(value) ? value : 0;
  return `
    <span class="browse-list__count" aria-label="${escapeHtml(
      `${numberFormatter.format(count)} ${singularLabel}${count === 1 ? "" : "s"}`,
    )}">
      ${numberFormatter.format(count)} ${escapeHtml(singularLabel)}${count === 1 ? "" : "s"}
    </span>
  `.trim();
}

function duplicateAwarePlaceLabel(place, placeNameCounts) {
  return place.placeType;
}

function captureFieldState(root) {
  const activeElement = document.activeElement;
  if (!activeElement || !root.contains(activeElement) || !activeElement.dataset.field) {
    return null;
  }

  return {
    field: activeElement.dataset.field,
    scrollTop: root.scrollTop,
    selectionStart:
      typeof activeElement.selectionStart === "number"
        ? activeElement.selectionStart
        : null,
    selectionEnd:
      typeof activeElement.selectionEnd === "number"
        ? activeElement.selectionEnd
        : null,
  };
}

function restoreFieldState(root, fieldState) {
  if (!fieldState) {
    return;
  }

  const nextField = root.querySelector(`[data-field="${fieldState.field}"]`);
  if (!nextField) {
    return;
  }

  nextField.focus({ preventScroll: true });

  if (
    typeof fieldState.selectionStart === "number" &&
    typeof fieldState.selectionEnd === "number" &&
    typeof nextField.setSelectionRange === "function"
  ) {
    nextField.setSelectionRange(fieldState.selectionStart, fieldState.selectionEnd);
  }

  root.scrollTop = fieldState.scrollTop;
}

function syncTabButtons(sidebarTabs, activeTab) {
  [...sidebarTabs.querySelectorAll("[data-tab]")].forEach((button) => {
    const isActive = button.dataset.tab === activeTab;
    button.classList.toggle("tab-button--active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function parseDurationToMilliseconds(value, fallback = 180) {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return fallback;
  }

  if (trimmedValue.endsWith("ms")) {
    const parsedValue = Number.parseFloat(trimmedValue);
    return Number.isFinite(parsedValue) ? parsedValue : fallback;
  }

  if (trimmedValue.endsWith("s")) {
    const parsedValue = Number.parseFloat(trimmedValue);
    return Number.isFinite(parsedValue) ? parsedValue * 1000 : fallback;
  }

  const parsedValue = Number.parseFloat(trimmedValue);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function renderOverview(atlasData) {
  const metricActions = {
    Places: "open-overview-places",
    Tunes: "open-overview-tunes",
    "Tune types": "open-overview-tunes",
  };

  return `
    <div class="sidebar-section sidebar-section--overview">
      <section class="metric-grid" aria-label="Atlas metrics">
        ${atlasData.metrics
          .map(
            (metric) => `
              <button
                class="metric-card metric-card--action"
                type="button"
                data-action="${escapeHtml(metricActions[metric.label] || "")}"
              >
                <p class="metric-label">${escapeHtml(metric.label)}</p>
                <p class="metric-value">${numberFormatter.format(metric.value)}</p>
              </button>
            `,
          )
          .join("")}
      </section>

      <section class="chart-panel">
        <div class="panel-block__header">
          <h2>Place Names by Tune Count</h2>
        </div>
        <div class="chart-frame chart-frame--bars">
          <canvas id="topPlacesChart" aria-label="Top 10 places chart"></canvas>
        </div>
      </section>

      <section class="chart-panel">
        <div class="panel-block__header">
          <h2>Tune Types by Count</h2>
        </div>
        <div class="chart-frame chart-frame--bars chart-frame--tune-types">
          <canvas id="tuneTypesChart" aria-label="Mapped tune types chart"></canvas>
        </div>
      </section>

      ${renderSharedMetadata(atlasData.siteMetadata)}
    </div>
  `;
}

function renderSharedMetadata(siteMetadata) {
  return `
    <section class="metadata-card">
      <div class="metadata-copy">
        ${siteMetadata.lines
          .map(
            (line) => `
              <p class="metadata-line">${line.map((part) => renderMetadataPart(part)).join("")}</p>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderPlacesList(context) {
  const { filteredPlaces, state, atlasData } = context;

  return `
    <div class="sidebar-section">
      <section class="control-panel">
        <label class="field">
          <span>Search related place</span>
          <input
            class="text-input"
            type="search"
            placeholder="Search by place name"
            data-field="places-search"
            value="${escapeHtml(state.placesSearch)}"
          />
        </label>

        <div class="control-row">
          <label class="field field--inline">
            <span>Sort by</span>
            <select class="select-input" data-field="places-sort">
              <option value="alpha" ${state.placesSort === "alpha" ? "selected" : ""}>Name (A - Z)</option>
              <option value="most-tunes" ${
                state.placesSort === "most-tunes" ? "selected" : ""
              }>Tune count</option>
            </select>
          </label>
        </div>
      </section>

      <div class="result-row">
        <p class="result-count">${numberFormatter.format(filteredPlaces.length)} places in total</p>
        <button
          class="random-button"
          type="button"
          data-action="random-place"
        >
          Random place
            ${renderUiIcon(UI_ICONS.randomTune, "button-icon button-icon--random")}
        </button>
      </div>

      ${
        filteredPlaces.length > 0
          ? `
            <ul class="browse-list">
              ${filteredPlaces
                .map(
                  (place) => `
                    <li>
                      <button
                        class="browse-list__button"
                        type="button"
                        data-action="select-place"
                        data-place-id="${escapeHtml(place.id)}"
                      >
                        <span class="browse-list__text">
                          <strong>${escapeHtml(place.name)}</strong>
                          ${renderPlaceListMeta(place, atlasData)}
                        </span>
                        ${renderUiIcon(UI_ICONS.chevron, "browse-list__button-icon")}
                      </button>
                    </li>
                  `,
                )
                .join("")}
            </ul>
          `
          : `
            <div class="empty-card">
              <p>No places match the current search settings.</p>
            </div>
          `
      }
    </div>
  `;
}

function renderPlaceDetail(context, backLink) {
  const { selectedPlace } = context;
  const resolvedBackLink = backLink || {
    action: "back-to-places-list",
    label: "Back to places",
  };

  return `
    <div class="sidebar-section">
      <button
        class="back-link"
        type="button"
        data-action="${escapeHtml(resolvedBackLink.action)}"
      >
        ${escapeHtml(resolvedBackLink.label)}
      </button>

      <header class="detail-header">
        <p class="eyebrow">Place detail</p>
        <h2 class="detail-title">${escapeHtml(selectedPlace.name)}</h2>
        <p class="detail-subtitle">${escapeHtml(selectedPlace.placeType)}</p>
      </header>

      <dl class="detail-grid">
        ${
          selectedPlace.irishName
            ? `<div><dt>Irish name</dt><dd>${escapeHtml(selectedPlace.irishName)}</dd></div>`
            : ""
        }
        <div><dt>Tune count</dt><dd>${numberFormatter.format(selectedPlace.tuneCount)}</dd></div>
      </dl>

      <section class="detail-card">
        <div class="panel-block__header">
          <h3>Tunes related to this place</h3>
        </div>

        <ul class="browse-list">
          ${selectedPlace.tunes
            .map(
              (tune) => `
                <li>
                  <button
                    class="browse-list__button"
                    type="button"
                    data-action="select-tune-from-place"
                    data-tune-id="${escapeHtml(tune.id)}"
                  >
                    <span class="browse-list__text">
                      <strong>${escapeHtml(tune.primaryName)}</strong>
                      ${renderMetaLine([
                        renderTuneTypeMetaPart(tune.type),
                        formatPlaceCountLabel(tune.relatedPlaces.length),
                        formatAlternativeNameCountLabel(tune.alternateNames.length),
                      ])}
                    </span>
                    ${renderUiIcon(UI_ICONS.chevron, "browse-list__button-icon")}
                  </button>
                </li>
              `,
            )
            .join("")}
        </ul>
      </section>
    </div>
  `;
}

function renderTunesList(context) {
  const { filteredTunes, state, atlasData } = context;

  return `
    <div class="sidebar-section">
      <section class="control-panel">
        <label class="field">
          <span>Search tunes</span>
          <input
            class="text-input"
            type="search"
            placeholder="Search by tune title"
            data-field="tunes-search"
            value="${escapeHtml(state.tunesSearch)}"
          />
        </label>

        <div class="control-row">
          <label class="field field--inline">
            <span>Type</span>
            <select class="select-input" data-field="tunes-type-filter">
              <option value="all">All types</option>
              ${atlasData.tuneTypes
                .map(
                  (type) => `
                    <option value="${escapeHtml(type)}" ${
                      state.tunesTypeFilter === type ? "selected" : ""
                    }>${escapeHtml(formatTuneTypeLabel(type))}</option>
                  `,
                )
                .join("")}
            </select>
          </label>
          <button
            class="filter-reset-button"
            type="button"
          data-action="reset-tunes-type-filter"
          ${state.tunesTypeFilter === "all" ? "disabled" : ""}
        >
            Reset
            ${renderUiIcon(UI_ICONS.reset, "button-icon button-icon--reset")}
          </button>
        </div>

        <div class="control-row">
          <label class="field field--inline">
            <span>Sort by</span>
            <select class="select-input" data-field="tunes-sort">
              <option value="alpha" ${state.tunesSort === "alpha" ? "selected" : ""}>Name (A - Z)</option>
              <option value="most-places" ${
                state.tunesSort === "most-places" ? "selected" : ""
              }>Place count</option>
            </select>
          </label>
        </div>
      </section>

      <div class="result-row">
        <p class="result-count">${numberFormatter.format(filteredTunes.length)} tunes in total</p>
        <button
          class="random-button"
          type="button"
          data-action="random-tune"
        >
          Random tune
          ${renderUiIcon(UI_ICONS.random, "button-icon button-icon--random")}
        </button>
      </div>

      ${
        filteredTunes.length > 0
          ? `
            <ul class="browse-list">
              ${filteredTunes
                .map(
                  (tune) => `
                    <li>
                      <button
                        class="browse-list__button"
                        type="button"
                        data-action="select-tune"
                        data-tune-id="${escapeHtml(tune.id)}"
                      >
                        <span class="browse-list__text">
                          <strong>${escapeHtml(tune.primaryName)}</strong>
                          ${renderMetaLine([
                            renderTuneTypeMetaPart(tune.type),
                            formatPlaceCountLabel(tune.relatedPlaces.length),
                            formatAlternativeNameCountLabel(tune.alternateNames.length),
                          ])}
                        </span>
                        ${renderUiIcon(UI_ICONS.chevron, "browse-list__button-icon")}
                      </button>
                    </li>
                  `,
                )
                .join("")}
            </ul>
          `
          : `
            <div class="empty-card">
              <p>No tunes match the current search settings.</p>
            </div>
          `
      }
    </div>
  `;
}

function renderTuneDetail(context, tuneAudioState, backLink) {
  const { selectedTune, atlasData } = context;
  const resolvedBackLink = backLink || {
    action: "back-to-tunes-list",
    label: "Back to tunes",
  };

  return `
    <div class="sidebar-section">
      <button
        class="back-link"
        type="button"
        data-action="${escapeHtml(resolvedBackLink.action)}"
      >
        ${escapeHtml(resolvedBackLink.label)}
      </button>

      <header class="detail-header">
        <p class="eyebrow">Tune detail</p>
        <h2 class="detail-title">${escapeHtml(selectedTune.primaryName)}</h2>
        <p class="detail-subtitle">${renderTuneTypeDot(
          selectedTune.type,
          selectedTune.type,
          "tune-type-inline--subtitle",
        )}</p>
      </header>

      ${renderTuneAudioCard(selectedTune, tuneAudioState)}

      <section class="detail-card">
        <div class="panel-block__header">
          <h3>Related Places</h3>
        </div>

        <ul class="browse-list">
          ${selectedTune.relatedPlaces
            .map(
              (place) => `
                <li>
                  <div class="detail-list__row">
                    <span class="browse-list__text">
                      <strong>${escapeHtml(place.name)}</strong>
                      ${renderPlaceListMeta(place, atlasData, { includeTuneCells: false })}
                    </span>
                    <button
                      class="ghost-button"
                      type="button"
                      data-action="view-place-on-map"
                      data-place-id="${escapeHtml(place.id)}"
                    >
                      View on map
                      ${renderUiIcon(UI_ICONS.map, "button-icon button-icon--map")}
                    </button>
                  </div>
                </li>
              `,
            )
            .join("")}
        </ul>
      </section>

      <section class="detail-card">
        <div class="panel-block__header">
          <h3>Alternate Names</h3>
        </div>

        ${
          selectedTune.alternateNames.length > 0
            ? `
              <ul class="tag-list">
                ${selectedTune.alternateNames
                  .map((name) => `<li class="tag">${escapeHtml(name)}</li>`)
                  .join("")}
              </ul>
            `
            : `
              <p class="detail-empty-note">No alternate names are listed for this tune.</p>
            `
        }
      </section>

    </div>
  `;
}

export function createUIController({ elements, actions, charts }) {
  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let latestState = null;
  let latestRenderContext = null;
  let visualActiveTab = null;
  let pendingTabSwitchCommitTimeout = null;
  let tuneAudioState = createTuneAudioState();
  let tuneAudioRequestId = 0;
  let tuneAudioEndTimeout = null;
  let tuneAudioPlayer = null;
  let tuneAudioContext = null;
  let tuneAudioSampleLoader = null;
  let tuneAudioPlaybackDurationMs = 0;
  let tuneAudioPlaybackPositionMs = 0;
  let tuneAudioPlaybackRemainingMs = 0;
  let tuneAudioPlaybackTimerStartedAt = 0;
  const tuneAudioInstrumentPromises = new Map();
  const listSnapshots = {
    places: { scrollTop: 0 },
    tunes: { scrollTop: 0 },
  };
  const backTargetsByViewKey = new Map();
  let pendingListRestore = null;
  let pendingBackTargetAssignment = null;
  let pendingViewRestore = null;

  function getPlaceDetailViewKey(placeId) {
    return placeId ? `place:${placeId}` : null;
  }

  function getTuneDetailViewKey(tuneId) {
    return tuneId ? `tune:${tuneId}` : null;
  }

  function getSidebarViewKey(state = latestState) {
    if (!state) {
      return null;
    }

    if (state.activeTab === "overview") {
      return "overview";
    }

    if (state.activeTab === "places") {
      return state.selectedPlaceId ? `place:${state.selectedPlaceId}` : "places";
    }

    if (state.activeTab === "tunes") {
      return state.selectedTuneId ? `tune:${state.selectedTuneId}` : "tunes";
    }

    return state.activeTab || null;
  }

  function createSidebarViewSnapshot(state = latestState) {
    const viewKey = getSidebarViewKey(state);
    if (!state || !viewKey) {
      return null;
    }

    return {
      viewKey,
      activeTab: state.activeTab,
      selectedPlaceId: state.selectedPlaceId || null,
      selectedTuneId: state.selectedTuneId || null,
      scrollTop: elements.sidebarContent.scrollTop,
    };
  }

  function rememberBackTarget(targetViewKey, backTargetSnapshot = createSidebarViewSnapshot()) {
    if (!targetViewKey || !backTargetSnapshot || backTargetSnapshot.viewKey === targetViewKey) {
      return;
    }

    pendingBackTargetAssignment = {
      targetViewKey,
      backTargetSnapshot,
    };
  }

  function getBackTargetForView(state = latestState) {
    const viewKey = getSidebarViewKey(state);
    if (!viewKey) {
      return null;
    }

    const backTarget = backTargetsByViewKey.get(viewKey);
    if (!backTarget || backTarget.viewKey === viewKey) {
      return null;
    }

    return backTarget;
  }

  function getBackLinkLabel(backTarget) {
    if (!backTarget) {
      return "Back";
    }

    if (backTarget.activeTab === "overview") {
      return "Back to overview";
    }

    if (backTarget.activeTab === "places") {
      return backTarget.selectedPlaceId ? "Back to place" : "Back to places";
    }

    if (backTarget.activeTab === "tunes") {
      return backTarget.selectedTuneId ? "Back to tune" : "Back to tunes";
    }

    return "Back";
  }

  function getDetailBackLink(state) {
    if (state?.activeTab === "places") {
      const backTarget = getBackTargetForView(state);
      return backTarget
        ? { action: "navigate-back", label: getBackLinkLabel(backTarget) }
        : { action: "back-to-places-list", label: "Back to places" };
    }

    if (state?.activeTab === "tunes") {
      const backTarget = getBackTargetForView(state);
      return backTarget
        ? { action: "navigate-back", label: getBackLinkLabel(backTarget) }
        : { action: "back-to-tunes-list", label: "Back to tunes" };
    }

    return { action: "navigate-back", label: "Back" };
  }

  function syncBackTargetForCurrentView(previousState, nextState) {
    const previousViewKey = getSidebarViewKey(previousState);
    const nextViewKey = getSidebarViewKey(nextState);

    if (!nextViewKey || nextViewKey === previousViewKey) {
      return;
    }

    if (pendingBackTargetAssignment?.targetViewKey === nextViewKey) {
      backTargetsByViewKey.set(nextViewKey, pendingBackTargetAssignment.backTargetSnapshot);
      pendingBackTargetAssignment = null;
      return;
    }

    pendingBackTargetAssignment = null;

    if (pendingViewRestore?.viewKey === nextViewKey) {
      return;
    }

    backTargetsByViewKey.delete(nextViewKey);
  }

  function getListViewKey(state = latestState) {
    if (!state) {
      return null;
    }

    if (state.activeTab === "places" && !state.selectedPlaceId) {
      return "places";
    }

    if (state.activeTab === "tunes" && !state.selectedTuneId) {
      return "tunes";
    }

    return null;
  }

  function captureCurrentListSnapshot(viewKey = getListViewKey()) {
    if (!viewKey) {
      return;
    }

    listSnapshots[viewKey] = {
      scrollTop: elements.sidebarContent.scrollTop,
    };
  }

  function queueListRestore(viewKey) {
    pendingListRestore = {
      viewKey,
      scrollTop: listSnapshots[viewKey]?.scrollTop || 0,
    };
  }

  function restorePendingListSnapshot(viewKey) {
    if (!pendingListRestore || pendingListRestore.viewKey !== viewKey) {
      return false;
    }

    elements.sidebarContent.scrollTop = pendingListRestore.scrollTop;
    listSnapshots[viewKey] = {
      scrollTop: elements.sidebarContent.scrollTop,
    };
    pendingListRestore = null;
    return true;
  }

  function queueViewRestore(viewSnapshot) {
    if (!viewSnapshot?.viewKey) {
      pendingViewRestore = null;
      return;
    }

    pendingViewRestore = { ...viewSnapshot };
  }

  function restorePendingViewSnapshot(viewKey) {
    if (!pendingViewRestore || pendingViewRestore.viewKey !== viewKey) {
      return false;
    }

    elements.sidebarContent.scrollTop = pendingViewRestore.scrollTop;
    pendingViewRestore = null;
    return true;
  }

  function shouldResetSidebarScroll(previousState, nextState) {
    const previousViewKey = getSidebarViewKey(previousState);
    const nextViewKey = getSidebarViewKey(nextState);

    if (!nextViewKey || previousViewKey === nextViewKey) {
      return false;
    }

    if (pendingViewRestore?.viewKey === nextViewKey) {
      return false;
    }

    const nextListViewKey = getListViewKey(nextState);
    if (!nextListViewKey) {
      return true;
    }

    return pendingListRestore?.viewKey !== nextListViewKey;
  }

  function clearPendingTabSwitch() {
    if (pendingTabSwitchCommitTimeout !== null) {
      window.clearTimeout(pendingTabSwitchCommitTimeout);
      pendingTabSwitchCommitTimeout = null;
    }
  }

  function clearTuneAudioEndTimeout() {
    if (tuneAudioEndTimeout !== null) {
      window.clearTimeout(tuneAudioEndTimeout);
      tuneAudioEndTimeout = null;
    }

    tuneAudioPlaybackTimerStartedAt = 0;
  }

  function resetTuneAudioPlaybackTiming() {
    tuneAudioPlaybackDurationMs = 0;
    tuneAudioPlaybackPositionMs = 0;
    tuneAudioPlaybackRemainingMs = 0;
    tuneAudioPlaybackTimerStartedAt = 0;
  }

  function getCurrentTuneAudioPlaybackPositionMs() {
    if (tuneAudioPlaybackTimerStartedAt <= 0) {
      return tuneAudioPlaybackPositionMs;
    }

    const elapsedMs = Math.max(0, Date.now() - tuneAudioPlaybackTimerStartedAt);
    const currentPositionMs = tuneAudioPlaybackPositionMs + elapsedMs;

    return tuneAudioPlaybackDurationMs > 0
      ? Math.min(currentPositionMs, tuneAudioPlaybackDurationMs)
      : currentPositionMs;
  }

  function getTuneAudioSpeedValue(tuneId = null) {
    const normalizedTuneId = String(tuneId || "");
    const resolvedSpeedValue =
      normalizedTuneId && tuneAudioState?.tuneId !== normalizedTuneId
        ? DEFAULT_TUNE_AUDIO_SPEED_VALUE
        : tuneAudioState?.speedValue;

    return normalizeTuneAudioSpeedValue(resolvedSpeedValue);
  }

  function getTuneAudioInstrumentProgram() {
    return normalizeTuneAudioInstrumentProgram(tuneAudioState?.instrumentProgram);
  }

  function createNextTuneAudioState(tuneId, overrides = {}) {
    return createTuneAudioState(tuneId, {
      speedValue: getTuneAudioSpeedValue(tuneId),
      instrumentProgram: getTuneAudioInstrumentProgram(),
      ...overrides,
    });
  }

  function setTuneAudioReadyState(tuneId, settingKey) {
    tuneAudioState = createNextTuneAudioState(tuneId, {
      status: "ready",
      settingKey,
      message: settingKey
        ? `The most popular cached setting in ${settingKey} is ready to replay.`
        : "The most popular cached setting is ready to replay.",
    });
  }

  function completeTuneAudioPlayback(requestId, tuneId, player, settingKey) {
    if (
      requestId !== tuneAudioRequestId ||
      tuneAudioPlayer !== player ||
      !isTuneDetailVisible(tuneId)
    ) {
      return;
    }

    tuneAudioPlayer = null;
    clearTuneAudioEndTimeout();
    resetTuneAudioPlaybackTiming();
    setTuneAudioReadyState(tuneId, settingKey);
    renderTuneAudioCardIfPresent();
  }

  function scheduleTuneAudioEndTimeout(
    requestId,
    tuneId,
    player,
    settingKey,
    startDelayMs = 0,
  ) {
    clearTuneAudioEndTimeout();

    if (!(tuneAudioPlaybackRemainingMs > 0)) {
      return;
    }

    const normalizedStartDelayMs =
      Number.isFinite(startDelayMs) && startDelayMs > 0 ? startDelayMs : 0;
    tuneAudioPlaybackTimerStartedAt = Date.now() + normalizedStartDelayMs;
    tuneAudioEndTimeout = window.setTimeout(() => {
      completeTuneAudioPlayback(requestId, tuneId, player, settingKey);
    }, tuneAudioPlaybackRemainingMs + normalizedStartDelayMs);
  }

  function stopTuneAudioPlayback(options = {}) {
    const { preserveTiming = false } = options;
    clearTuneAudioEndTimeout();

    if (tuneAudioPlayer && typeof tuneAudioPlayer.stop === "function") {
      try {
        tuneAudioPlayer.stop();
      } catch (error) {
        console.warn("Unable to stop tune audio cleanly.", error);
      }
    }

    tuneAudioPlayer = null;
    if (!preserveTiming) {
      resetTuneAudioPlaybackTiming();
    }
  }

  function resetTuneAudioState(tuneId = null) {
    tuneAudioRequestId += 1;
    stopTuneAudioPlayback();
    tuneAudioState = createTuneAudioState(tuneId);
  }

  function isTuneDetailVisible(tuneId) {
    return String(latestRenderContext?.selectedTune?.id || "") === String(tuneId || "");
  }

  function renderTuneAudioCardIfPresent() {
    const selectedTune = latestRenderContext?.selectedTune;
    if (!selectedTune) {
      return;
    }

    const currentCard = elements.sidebarContent.querySelector("[data-role='tune-audio-card']");
    if (!currentCard) {
      return;
    }

    currentCard.outerHTML = renderTuneAudioCard(selectedTune, tuneAudioState);
  }

  function getAudioContextConstructor() {
    return window.AudioContext || window.webkitAudioContext || null;
  }

  async function ensureTuneAudioContext() {
    const AudioContextConstructor = getAudioContextConstructor();
    if (!AudioContextConstructor) {
      throw new Error("This browser can't play sampled tune audio.");
    }

    if (!tuneAudioContext) {
      tuneAudioContext = new AudioContextConstructor();
    }

    if (
      typeof tuneAudioContext.resume === "function" &&
      tuneAudioContext.state === "suspended"
    ) {
      await tuneAudioContext.resume();
    }

    return tuneAudioContext;
  }

  async function ensureTuneAudioInstrument(audioContext, Smplr, instrumentProgram) {
    const instrumentOption = getTuneAudioInstrumentOption(instrumentProgram);
    if (!instrumentOption?.smplrInstrumentName) {
      throw new Error(getTuneAudioInstrumentUnavailableMessage(instrumentProgram));
    }

    if (!tuneAudioSampleLoader) {
      const sampleLoaderOptions =
        window.isSecureContext &&
        window.caches &&
        typeof Smplr.CacheStorage === "function"
          ? { storage: new Smplr.CacheStorage("irish-trad-music-soundfonts") }
          : undefined;
      tuneAudioSampleLoader = new Smplr.SampleLoader(audioContext, sampleLoaderOptions);
    }

    const instrumentCacheKey = `${instrumentOption.smplrInstrumentName}:${TUNE_AUDIO_SOUNDFONT_KIT}`;
    if (tuneAudioInstrumentPromises.has(instrumentCacheKey)) {
      return tuneAudioInstrumentPromises.get(instrumentCacheKey);
    }

    const instrumentPromise = new Smplr.Soundfont(audioContext, {
      instrument: instrumentOption.smplrInstrumentName,
      kit: TUNE_AUDIO_SOUNDFONT_KIT,
      loader: tuneAudioSampleLoader,
    }).load.catch((error) => {
      tuneAudioInstrumentPromises.delete(instrumentCacheKey);
      throw new Error(
        error instanceof Error && error.message
          ? error.message
          : `Couldn't load ${instrumentOption.label} for playback.`,
      );
    });

    tuneAudioInstrumentPromises.set(instrumentCacheKey, instrumentPromise);
    return instrumentPromise;
  }

  function createTuneAudioPlayer({
    audioContext,
    instrument,
    playbackSequence,
    millisecondsPerMeasure,
    meterSize,
    startOffsetMs,
  }) {
    const playbackDurationMs = getTuneAudioPlaybackDurationMs(
      playbackSequence,
      millisecondsPerMeasure,
      meterSize,
    );
    const seekOffsetMs =
      playbackDurationMs > 0
        ? Math.min(startOffsetMs, Math.max(playbackDurationMs - 1, 0))
        : startOffsetMs;
    const playbackUnitSeconds = getTuneAudioPlaybackUnitSeconds(
      millisecondsPerMeasure,
      meterSize,
    );
    const playbackStartTime =
      audioContext.currentTime + TUNE_AUDIO_PLAYBACK_START_DELAY_MS / 1000;
    const stopFns = [];

    playbackSequence.tracks.forEach((track, trackIndex) => {
      if (!Array.isArray(track)) {
        return;
      }

      track.forEach((event, eventIndex) => {
        if (
          event?.cmd !== "note" ||
          !Number.isFinite(event.pitch) ||
          !Number.isFinite(event.start) ||
          !Number.isFinite(event.duration)
        ) {
          return;
        }

        const eventStartSeconds = event.start * playbackUnitSeconds;
        const eventEndSeconds = (event.start + event.duration) * playbackUnitSeconds;
        if (eventEndSeconds <= seekOffsetMs / 1000) {
          return;
        }

        const eventPlaybackTime =
          playbackStartTime + Math.max(0, eventStartSeconds - seekOffsetMs / 1000);
        const truncatedDurationSeconds =
          eventEndSeconds - Math.max(eventStartSeconds, seekOffsetMs / 1000);
        if (!(truncatedDurationSeconds > 0)) {
          return;
        }

        stopFns.push(
          instrument.start({
            note: event.pitch,
            velocity:
              Number.isFinite(event.volume) && event.volume > 0
                ? Math.min(127, Math.max(1, event.volume))
                : 100,
            detune: Number.isFinite(event.cents) ? event.cents : 0,
            duration: truncatedDurationSeconds,
            time: eventPlaybackTime,
            stopId: `track-${trackIndex}-event-${eventIndex}`,
          }),
        );
      });
    });

    return {
      playbackDurationMs,
      seekOffsetMs,
      startDelayMs: TUNE_AUDIO_PLAYBACK_START_DELAY_MS,
      stop() {
        const stopAtTime = audioContext.currentTime;
        stopFns.forEach((stop) => {
          try {
            stop(stopAtTime);
          } catch (error) {
            console.warn("Unable to stop a scheduled tune note cleanly.", error);
          }
        });

        if (typeof instrument.stop === "function") {
          instrument.stop({ time: stopAtTime });
        }
      },
    };
  }

  async function fetchTuneAudioData(selectedTune) {
    const tuneId = String(selectedTune?.id || "");
    if (!tuneId) {
      throw new Error("This tune doesn't have a playable cached setting.");
    }

    const tuneAudioData = selectedTune?.audioPlayback;
    if (
      tuneAudioData &&
      typeof tuneAudioData.abcText === "string" &&
      tuneAudioData.abcText.trim()
    ) {
      const normalizedAbcText = normalizeTheSessionTuneAudioAbc(tuneAudioData.abcText);

      return {
        abcText: normalizedAbcText,
        settingKey: String(tuneAudioData.settingKey || ""),
        baseMillisecondsPerMeasure:
          getTheSessionDefaultTuneAudioMillisecondsPerMeasure(normalizedAbcText),
      };
    }

    throw new Error("No cached tune setting is available for playback.");
  }

  async function playTuneAudio(tuneId, startOffsetMs = 0) {
    const selectedTune = latestRenderContext?.selectedTune;
    if (!selectedTune || String(selectedTune.id) !== String(tuneId || "")) {
      return;
    }

    const requestId = ++tuneAudioRequestId;
    const audioContextPromise = ensureTuneAudioContext();
    const normalizedStartOffsetMs =
      Number.isFinite(startOffsetMs) && startOffsetMs > 0 ? startOffsetMs : 0;
    const instrumentProgram = getTuneAudioInstrumentProgram();

    stopTuneAudioPlayback();
    tuneAudioState = createNextTuneAudioState(tuneId, {
      status: "loading",
      message:
        normalizedStartOffsetMs > 0
          ? "Resuming the most popular cached setting..."
          : "Loading the most popular cached setting...",
    });
    renderTuneAudioCardIfPresent();

    try {
      const [audioContext, ABCJS, Smplr, tuneAudioData] = await Promise.all([
        audioContextPromise,
        loadAbcjsLibrary(),
        loadSmplrLibrary(),
        fetchTuneAudioData(selectedTune),
      ]);

      if (requestId !== tuneAudioRequestId || !isTuneDetailVisible(tuneId)) {
        return;
      }

      const parsedTune = ABCJS.parseOnly(tuneAudioData.abcText)?.[0] || null;
      if (!parsedTune) {
        throw new Error("Couldn't prepare the cached setting for playback.");
      }

      const millisecondsPerMeasure = getTuneAudioMillisecondsPerMeasure(
        tuneAudioData.baseMillisecondsPerMeasure,
        getTuneAudioSpeedValue(),
      );
      const playbackSequence = parsedTune.setUpAudio({ program: instrumentProgram });
      const meterSize = getTuneAudioMeterSize(parsedTune);

      if (
        !playbackSequence ||
        !Array.isArray(playbackSequence.tracks) ||
        playbackSequence.tracks.length === 0
      ) {
        throw new Error("Couldn't build the cached setting for playback.");
      }

      const instrument = await ensureTuneAudioInstrument(
        audioContext,
        Smplr,
        instrumentProgram,
      );

      if (
        requestId !== tuneAudioRequestId ||
        !isTuneDetailVisible(tuneId)
      ) {
        return;
      }

      const player = createTuneAudioPlayer({
        audioContext,
        instrument,
        playbackSequence,
        millisecondsPerMeasure,
        meterSize,
        startOffsetMs: normalizedStartOffsetMs,
      });

      if (!(player.playbackDurationMs > 0)) {
        throw new Error("Couldn't build the cached setting for playback.");
      }

      if (requestId !== tuneAudioRequestId || !isTuneDetailVisible(tuneId)) {
        player.stop();
        return;
      }

      tuneAudioPlayer = player;
      tuneAudioPlaybackDurationMs = player.playbackDurationMs;
      tuneAudioPlaybackPositionMs = player.seekOffsetMs;
      tuneAudioPlaybackRemainingMs =
        player.playbackDurationMs > 0
          ? Math.max(0, player.playbackDurationMs - player.seekOffsetMs)
          : 0;
      tuneAudioState = createNextTuneAudioState(tuneId, {
        status: "playing",
        settingKey: tuneAudioData.settingKey,
        message: tuneAudioData.settingKey
          ? `Playing the most popular cached setting in ${tuneAudioData.settingKey}.`
          : "Playing the most popular cached setting.",
      });
      renderTuneAudioCardIfPresent();
      scheduleTuneAudioEndTimeout(
        requestId,
        tuneId,
        player,
        tuneAudioData.settingKey,
        player.startDelayMs,
      );
    } catch (error) {
      if (requestId !== tuneAudioRequestId || !isTuneDetailVisible(tuneId)) {
        return;
      }

      tuneAudioState = createNextTuneAudioState(tuneId, {
        status: "error",
        message:
          error instanceof Error && error.message
            ? error.message
            : "Unable to play this tune right now.",
      });
      renderTuneAudioCardIfPresent();
    }
  }

  function pauseTuneAudio(tuneId) {
    if (
      tuneAudioState.status !== "playing" ||
      tuneAudioState.tuneId !== String(tuneId || "") ||
      !tuneAudioPlayer
    ) {
      return;
    }

    tuneAudioPlaybackPositionMs = getCurrentTuneAudioPlaybackPositionMs();
    tuneAudioPlaybackRemainingMs =
      tuneAudioPlaybackDurationMs > 0
        ? Math.max(0, tuneAudioPlaybackDurationMs - tuneAudioPlaybackPositionMs)
        : 0;
    stopTuneAudioPlayback({ preserveTiming: true });
    tuneAudioState = createNextTuneAudioState(tuneId, {
      status: "paused",
      settingKey: tuneAudioState.settingKey,
      message: tuneAudioState.settingKey
        ? `Paused the most popular cached setting in ${tuneAudioState.settingKey}.`
        : "Paused the most popular cached setting.",
    });
    renderTuneAudioCardIfPresent();
  }

  async function resumeTuneAudio(tuneId) {
    if (
      tuneAudioState.status !== "paused" ||
      tuneAudioState.tuneId !== String(tuneId || "")
    ) {
      return;
    }

    await playTuneAudio(tuneId, tuneAudioPlaybackPositionMs);
  }

  function setTuneAudioSpeed(tuneId, speedValue) {
    const normalizedTuneId = String(tuneId || "");
    if (!normalizedTuneId || !isTuneDetailVisible(normalizedTuneId)) {
      return;
    }

    const normalizedSpeedValue = normalizeTuneAudioSpeedValue(speedValue);
    const previousState =
      tuneAudioState.tuneId === normalizedTuneId
        ? tuneAudioState
        : createTuneAudioState(normalizedTuneId);

    if (normalizeTuneAudioSpeedValue(previousState.speedValue) === normalizedSpeedValue) {
      return;
    }

    const playbackPositionMs =
      previousState.status === "playing"
        ? getCurrentTuneAudioPlaybackPositionMs()
        : tuneAudioPlaybackPositionMs;

    tuneAudioState = createTuneAudioState(normalizedTuneId, {
      status: previousState.status,
      message: previousState.message,
      settingKey: previousState.settingKey,
      speedValue: normalizedSpeedValue,
      instrumentProgram: previousState.instrumentProgram,
    });
    renderTuneAudioCardIfPresent();

    if (previousState.status === "playing") {
      void playTuneAudio(normalizedTuneId, playbackPositionMs);
    }
  }

  function setTuneAudioInstrument(tuneId, instrumentProgram) {
    const normalizedTuneId = String(tuneId || "");
    if (!normalizedTuneId || !isTuneDetailVisible(normalizedTuneId)) {
      return;
    }

    const normalizedInstrumentProgram =
      normalizeTuneAudioInstrumentProgram(instrumentProgram);
    const previousState =
      tuneAudioState.tuneId === normalizedTuneId
        ? tuneAudioState
        : createTuneAudioState(normalizedTuneId);

    if (
      normalizeTuneAudioInstrumentProgram(previousState.instrumentProgram) ===
      normalizedInstrumentProgram
    ) {
      return;
    }

    const playbackPositionMs =
      previousState.status === "playing"
        ? getCurrentTuneAudioPlaybackPositionMs()
        : tuneAudioPlaybackPositionMs;

    tuneAudioState = createTuneAudioState(normalizedTuneId, {
      status: previousState.status,
      message: previousState.message,
      settingKey: previousState.settingKey,
      speedValue: previousState.speedValue,
      instrumentProgram: normalizedInstrumentProgram,
    });
    renderTuneAudioCardIfPresent();

    if (previousState.status === "playing") {
      void playTuneAudio(normalizedTuneId, playbackPositionMs);
    }
  }

  function getRandomArrayItem(items) {
    if (!Array.isArray(items) || items.length === 0) {
      return null;
    }

    return items[Math.floor(Math.random() * items.length)];
  }

  function getTabActivationDelayMs() {
    const durationValue = getComputedStyle(elements.sidebarTabs).getPropertyValue(
      "--tab-activate-ms",
    );
    return Math.max(0, parseDurationToMilliseconds(durationValue));
  }

  function commitTabSwitch(nextTab) {
    clearPendingTabSwitch();
    visualActiveTab = null;
    syncTabButtons(elements.sidebarTabs, nextTab);
  }

  function queueTabCommit(nextTab, commitAction) {
    const currentVisualTab = visualActiveTab ?? latestState?.activeTab ?? null;
    const committedTab = latestState?.activeTab ?? null;

    if (!nextTab || nextTab === currentVisualTab) {
      return;
    }

    clearPendingTabSwitch();
    visualActiveTab = nextTab;
    syncTabButtons(elements.sidebarTabs, nextTab);

    const runCommit = () => {
      commitTabSwitch(nextTab);

      if (typeof commitAction === "function") {
        commitAction();
      }
    };

    if (committedTab === nextTab) {
      commitTabSwitch(nextTab);
      return;
    }

    if (reduceMotionQuery.matches) {
      runCommit();
      return;
    }

    pendingTabSwitchCommitTimeout = window.setTimeout(runCommit, getTabActivationDelayMs());
  }

  elements.sidebarTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action='switch-tab']");
    if (!button) {
      return;
    }

    const nextTab = button.dataset.tab;
    queueTabCommit(nextTab, () => {
      if (!latestState || latestState.activeTab === nextTab) {
        return;
      }

      actions.switchTab(nextTab);
    });
  });

  elements.mobileSidebarToggle.addEventListener("click", () => {
    actions.toggleMobileSidebarPanel();
  });

  elements.sidebarContent.addEventListener(
    "scroll",
    () => {
      captureCurrentListSnapshot();
    },
    { passive: true },
  );

  elements.sidebarContent.addEventListener("click", (event) => {
    const actionElement = event.target.closest("[data-action]");
    if (!actionElement) {
      return;
    }

    const { action, placeId, tuneId } = actionElement.dataset;

    if (action === "select-place") {
      captureCurrentListSnapshot("places");
      rememberBackTarget(getPlaceDetailViewKey(placeId));
      actions.selectPlace(placeId);
    } else if (action === "random-place") {
      const randomPlace = getRandomArrayItem(latestRenderContext?.filteredPlaces);
      if (!randomPlace) {
        return;
      }

      captureCurrentListSnapshot("places");
      rememberBackTarget(getPlaceDetailViewKey(randomPlace.id));
      actions.selectPlace(randomPlace.id);
    } else if (action === "select-tune") {
      captureCurrentListSnapshot("tunes");
      rememberBackTarget(getTuneDetailViewKey(tuneId));
      actions.selectTune(tuneId, { preservePlace: false, focusMode: "bounds" });
    } else if (action === "random-tune") {
      const randomTune = getRandomArrayItem(latestRenderContext?.filteredTunes);
      if (!randomTune) {
        return;
      }

      captureCurrentListSnapshot("tunes");
      rememberBackTarget(getTuneDetailViewKey(randomTune.id));
      actions.selectTune(randomTune.id, { preservePlace: false, focusMode: "bounds" });
    } else if (action === "select-tune-from-place") {
      rememberBackTarget(getTuneDetailViewKey(tuneId));
      queueTabCommit("tunes", () => {
        actions.selectTune(tuneId, { preservePlace: true, focusMode: "none" });
      });
    } else if (action === "open-overview-places") {
      queueTabCommit("places", () => {
        actions.openPlacesIndex();
      });
    } else if (action === "open-overview-tunes") {
      queueTabCommit("tunes", () => {
        actions.openTunesIndex();
      });
    } else if (action === "reset-tunes-type-filter") {
      actions.setTunesTypeFilter("all");
    } else if (action === "view-place-on-map") {
      rememberBackTarget(getPlaceDetailViewKey(placeId));
      if ((latestState?.activeTab ?? null) !== "places") {
        queueTabCommit("places", () => {
          actions.viewPlaceOnMap(placeId);
        });
      } else {
        actions.viewPlaceOnMap(placeId);
      }
    } else if (action === "navigate-back") {
      const backTarget = getBackTargetForView();
      if (backTarget) {
        queueViewRestore(backTarget);
        actions.restoreView(backTarget);
      } else if (latestState?.activeTab === "places" && latestState.selectedPlaceId) {
        queueListRestore("places");
        actions.backToPlacesList();
      } else if (latestState?.activeTab === "tunes" && latestState.selectedTuneId) {
        queueListRestore("tunes");
        actions.backToTunesList();
      }
    } else if (action === "back-to-places-list") {
      queueListRestore("places");
      actions.backToPlacesList();
    } else if (action === "back-to-tunes-list") {
      queueListRestore("tunes");
      actions.backToTunesList();
    } else if (action === "play-tune-audio") {
      if (tuneAudioState.tuneId === String(tuneId || "") && tuneAudioState.status === "playing") {
        pauseTuneAudio(tuneId);
      } else if (
        tuneAudioState.tuneId === String(tuneId || "") &&
        tuneAudioState.status === "paused"
      ) {
        void resumeTuneAudio(tuneId);
      } else {
        void playTuneAudio(tuneId);
      }
    }
  });

  elements.sidebarContent.addEventListener("input", (event) => {
    const field = event.target.dataset.field;
    if (field === "places-search") {
      actions.setPlacesSearch(event.target.value);
    } else if (field === "tunes-search") {
      actions.setTunesSearch(event.target.value);
    }
  });

  elements.sidebarContent.addEventListener("change", (event) => {
    const field = event.target.dataset.field;
    if (field === "places-sort") {
      actions.setPlacesSort(event.target.value);
    } else if (field === "tunes-type-filter") {
      actions.setTunesTypeFilter(event.target.value);
    } else if (field === "tunes-sort") {
      actions.setTunesSort(event.target.value);
    } else if (field === "tune-audio-instrument") {
      setTuneAudioInstrument(event.target.dataset.tuneId, event.target.value);
    } else if (field === "tune-audio-speed") {
      setTuneAudioSpeed(event.target.dataset.tuneId, event.target.value);
    }
  });

  return {
    render(context) {
      const {
        atlasData,
        state,
        selectedPlace,
        selectedTune,
        filteredPlaces,
        filteredTunes,
        isNarrowViewport,
      } = context;
      const previousState = latestState;
      const previousCommittedTab = latestState?.activeTab ?? null;
      latestRenderContext = context;
      const shouldScrollSidebarToTop = shouldResetSidebarScroll(previousState, state);
      syncBackTargetForCurrentView(previousState, state);
      const detailBackLink = getDetailBackLink(state);

      if (visualActiveTab && previousCommittedTab !== null && state.activeTab !== previousCommittedTab) {
        clearPendingTabSwitch();
        visualActiveTab = null;
      }

      latestState = state;

      if (state.activeTab !== "tunes" || !selectedTune) {
        if (tuneAudioState.tuneId !== null || tuneAudioPlayer) {
          resetTuneAudioState();
        }
      } else if (tuneAudioState.tuneId !== String(selectedTune.id)) {
        resetTuneAudioState(selectedTune.id);
      }

      const isMobileSidebarOpen = isNarrowViewport && state.mobilePanel === "sidebar";
      const isMobileLegendOpen = isNarrowViewport && state.mobilePanel === "legend";

      elements.appShell.classList.toggle("app-shell--narrow", isNarrowViewport);
      elements.appShell.classList.toggle(
        "app-shell--mobile-sidebar-open",
        isMobileSidebarOpen,
      );
      elements.appShell.classList.toggle(
        "app-shell--mobile-legend-open",
        isMobileLegendOpen,
      );
      if (elements.mobileTopbar) {
        elements.mobileTopbar.setAttribute("aria-hidden", String(!isNarrowViewport));
      }

      elements.sidebar.classList.toggle("sidebar--mobile", isNarrowViewport);
      elements.sidebar.classList.toggle("sidebar--mobile-open", isMobileSidebarOpen);
      elements.sidebar.setAttribute(
        "aria-hidden",
        String(isNarrowViewport ? !isMobileSidebarOpen : false),
      );

      elements.mobileSidebarToggle.classList.toggle(
        "is-hidden",
        !isNarrowViewport,
      );
      elements.mobileSidebarToggle.setAttribute("aria-expanded", String(isMobileSidebarOpen));
      elements.mobileSidebarToggle.setAttribute(
        "aria-label",
        isMobileSidebarOpen ? "Close menu" : "Open menu",
      );
      elements.mobileSidebarToggle.setAttribute(
        "aria-hidden",
        String(!isNarrowViewport),
      );
      const mobileSidebarState = elements.mobileSidebarToggle.querySelector(
        "[data-mobile-sidebar-state]",
      );
      if (mobileSidebarState) {
        mobileSidebarState.textContent = "Menu";
      } else {
        elements.mobileSidebarToggle.textContent = "Menu";
      }

      syncTabButtons(elements.sidebarTabs, visualActiveTab ?? state.activeTab);

      const fieldState = captureFieldState(elements.sidebarContent);

      if (state.activeTab === "overview") {
        elements.sidebarContent.innerHTML = renderOverview(atlasData);
        restoreFieldState(elements.sidebarContent, fieldState);
        const restoredOverviewView = restorePendingViewSnapshot("overview");
        if (!restoredOverviewView && shouldScrollSidebarToTop) {
          elements.sidebarContent.scrollTop = 0;
        }
        charts.renderOverviewCharts(
          {
            topPlaces: elements.sidebarContent.querySelector("#topPlacesChart"),
            tuneTypes: elements.sidebarContent.querySelector("#tuneTypesChart"),
          },
          atlasData,
          {
            onPlaceSelect(placeId) {
              rememberBackTarget(getPlaceDetailViewKey(placeId));
              queueTabCommit("places", () => {
                actions.selectPlace(placeId);
              });
            },
            onPlaceGroupSelect(placeName) {
              queueTabCommit("places", () => {
                actions.openPlacesByName(placeName);
              });
            },
            onTuneTypeSelect(tuneType) {
              queueTabCommit("tunes", () => {
                actions.openTuneTypeFilter(tuneType);
              });
            },
          },
        );
        return;
      }

      charts.destroyAll();

      if (state.activeTab === "places") {
        elements.sidebarContent.innerHTML = selectedPlace
          ? renderPlaceDetail(context, detailBackLink)
          : renderPlacesList({
              filteredPlaces,
              state,
              atlasData,
            });
        restoreFieldState(elements.sidebarContent, fieldState);
        const restoredPlaceView = restorePendingViewSnapshot(getSidebarViewKey(state));
        if (!selectedPlace) {
          const restoredPlacesList = restoredPlaceView || restorePendingListSnapshot("places");
          if (!restoredPlacesList && shouldScrollSidebarToTop) {
            elements.sidebarContent.scrollTop = 0;
          }
        } else if (!restoredPlaceView && shouldScrollSidebarToTop) {
          elements.sidebarContent.scrollTop = 0;
        }
        return;
      }

      elements.sidebarContent.innerHTML = selectedTune
        ? renderTuneDetail(context, tuneAudioState, detailBackLink)
        : renderTunesList({
            filteredTunes,
            state,
            atlasData,
          });
      restoreFieldState(elements.sidebarContent, fieldState);
      const restoredTuneView = restorePendingViewSnapshot(getSidebarViewKey(state));
      if (!selectedTune) {
        const restoredTunesList = restoredTuneView || restorePendingListSnapshot("tunes");
        if (!restoredTunesList && shouldScrollSidebarToTop) {
          elements.sidebarContent.scrollTop = 0;
        }
      } else if (!restoredTuneView && shouldScrollSidebarToTop) {
        elements.sidebarContent.scrollTop = 0;
      }
    },
  };
}
