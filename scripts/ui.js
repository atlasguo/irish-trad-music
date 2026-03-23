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

function getTheSessionTuneUrl(tuneId) {
  return `https://thesession.org/tunes/${encodeURIComponent(String(tuneId || ""))}`;
}

const ABCJS_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/abcjs@6.6.2/dist/abcjs-basic-min.js";
const DEFAULT_TUNE_AUDIO_STATUS_MESSAGE = "Plays the first The Session setting for this tune.";
const DEFAULT_TUNE_AUDIO_SPEED_VALUE = 0;
const MIN_TUNE_AUDIO_SPEED_VALUE = -10;
const MAX_TUNE_AUDIO_SPEED_VALUE = 2;
const DEFAULT_TUNE_AUDIO_MILLISECONDS_PER_MEASURE = 1000;
const TUNE_AUDIO_INSTRUMENT_OPTIONS = [
  { program: 21, label: "Accordion" },
  { program: 22, label: "Harmonica" },
  { program: 24, label: "Guitar (Nylon)" },
  { program: 25, label: "Guitar (Steel)" },
  { program: 46, label: "Harp" },
  { program: 73, label: "Irish Flute" },
  { program: 78, label: "Tin Whistle" },
  { program: 105, label: "Banjo" },
  { program: 109, label: "Uilleann Pipes" },
  { program: 110, label: "Fiddle" },
];
const DEFAULT_TUNE_AUDIO_INSTRUMENT_PROGRAM = TUNE_AUDIO_INSTRUMENT_OPTIONS[0].program;
const TUNE_AUDIO_METADATA_BY_TYPE = new Map([
  ["barndance", { meter: "4/4", noteLength: "1/8" }],
  ["hornpipe", { meter: "4/4", noteLength: "1/8" }],
  ["jig", { meter: "6/8", noteLength: "1/8" }],
  ["march", { meter: "4/4", noteLength: "1/8" }],
  ["mazurka", { meter: "3/4", noteLength: "1/8" }],
  ["polka", { meter: "2/4", noteLength: "1/8" }],
  ["reel", { meter: "4/4", noteLength: "1/8" }],
  ["slide", { meter: "12/8", noteLength: "1/8" }],
  ["slip jig", { meter: "9/8", noteLength: "1/8" }],
  ["strathspey", { meter: "4/4", noteLength: "1/8" }],
  ["three two", { meter: "3/2", noteLength: "1/8" }],
  ["waltz", { meter: "3/4", noteLength: "1/8" }],
]);

let abcjsScriptPromise = null;

function getTheSessionTuneJsonUrl(tuneId) {
  return `${getTheSessionTuneUrl(tuneId)}?format=json`;
}

function normalizeTuneTypeForAudio(type) {
  return String(type || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
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

function renderTuneAudioInstrumentOptions(selectedProgram) {
  const resolvedProgram = normalizeTuneAudioInstrumentProgram(selectedProgram);

  return TUNE_AUDIO_INSTRUMENT_OPTIONS.map(
    (option) => `
      <option value="${option.program}" ${option.program === resolvedProgram ? "selected" : ""}>
        ${escapeHtml(option.label)}
      </option>
    `,
  ).join("");
}

function getTuneAudioMetadata(type) {
  const normalizedType = normalizeTuneTypeForAudio(type);

  return {
    rhythm: normalizedType || "reel",
    ...(TUNE_AUDIO_METADATA_BY_TYPE.get(normalizedType) || {
      meter: "4/4",
      noteLength: "1/8",
    }),
  };
}

function normalizeAbcKeySignature(rawKey) {
  const normalizedKey = String(rawKey || "").trim();
  if (!normalizedKey) {
    return "C";
  }

  return normalizedKey
    .replace(/\s+/g, "")
    .replace(/major/gi, "maj")
    .replace(/minor/gi, "min")
    .replace(/mixolydian/gi, "mix")
    .replace(/dorian/gi, "dor")
    .replace(/aeolian/gi, "aeo")
    .replace(/ionian/gi, "ion")
    .replace(/phrygian/gi, "phr")
    .replace(/lydian/gi, "lyd")
    .replace(/locrian/gi, "loc");
}

function formatTheSessionKeyLabel(rawKey) {
  const normalizedKey = String(rawKey || "").trim();
  if (!normalizedKey) {
    return "";
  }

  const keyMatch = normalizedKey.match(/^([A-Ga-g][b#]?)(.*)$/);
  if (!keyMatch) {
    return normalizedKey;
  }

  const tonic = keyMatch[1].charAt(0).toUpperCase() + keyMatch[1].slice(1);
  const mode = keyMatch[2]
    .replace(/([A-Z])/g, " $1")
    .trim()
    .toLowerCase();

  return mode ? `${tonic} ${mode}` : tonic;
}

function buildTheSessionTuneAudioAbc(tune, setting) {
  const abcBody = String(setting?.abc || "").trim();
  if (!abcBody) {
    return "";
  }

  if (/^\s*X:/m.test(abcBody) && /^\s*K:/m.test(abcBody)) {
    return abcBody;
  }

  const tuneAudioMetadata = getTuneAudioMetadata(tune?.type);
  const abcLines = [
    "X: 1",
    `T: ${String(tune?.primaryName || "Untitled tune").trim()}`,
  ];

  if (setting?.member?.name) {
    abcLines.push(`Z: ${String(setting.member.name).trim()}`);
  }

  if (setting?.url) {
    abcLines.push(`S: ${String(setting.url).trim()}`);
  }

  if (tuneAudioMetadata.rhythm) {
    abcLines.push(`R: ${tuneAudioMetadata.rhythm}`);
  }

  abcLines.push(`M: ${tuneAudioMetadata.meter}`);
  abcLines.push(`L: ${tuneAudioMetadata.noteLength}`);
  abcLines.push(`K: ${normalizeAbcKeySignature(setting?.key)}`);
  abcLines.push(abcBody);

  return abcLines.join("\n");
}

function getTuneAudioBaseMillisecondsPerMeasure(abcText) {
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
    return "||";
  }

  if (audioState.status === "paused" || audioState.status === "idle") {
    return "▶";
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
    <span class="tune-audio__button-icon" aria-hidden="true">${escapeHtml(symbol)}</span>
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
  const statusClassName =
    resolvedAudioState.status === "error" ? " tune-audio__status--error" : "";

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
              ${resolvedAudioState.status === "loading" ? "disabled" : ""}
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
          This plays just the first setting. For more settings and notation,
          <a
            class="metadata-link"
            href="${escapeHtml(getTheSessionTuneUrl(tuneId))}"
            target="_blank"
            rel="noreferrer"
          >view this tune on The Session</a>.
        </p>
        ${
          resolvedAudioState.status === "error"
            ? `
              <p class="tune-audio__status${statusClassName}">
                ${escapeHtml(resolvedAudioState.message)}
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

function createTuneAudioScratchHost() {
  const scratchHost = document.createElement("div");
  scratchHost.className = "tune-audio__scratch";
  document.body.append(scratchHost);
  return scratchHost;
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

      <p class="result-count">${numberFormatter.format(filteredPlaces.length)} places in total</p>

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

function renderPlaceDetail(context) {
  const { selectedPlace } = context;

  return `
    <div class="sidebar-section">
      <button class="back-link" type="button" data-action="back-to-places-list">
        Back to places
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

      <p class="result-count">${numberFormatter.format(filteredTunes.length)} tunes in total</p>

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

function renderTuneDetail(context, tuneAudioState) {
  const { selectedTune, atlasData } = context;

  return `
    <div class="sidebar-section">
      <button class="back-link" type="button" data-action="back-to-tunes-list">
        Back to tunes
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
  let tuneAudioSynth = null;
  let tuneAudioContext = null;
  let tuneAudioPlaybackDurationMs = 0;
  let tuneAudioPlaybackPositionMs = 0;
  let tuneAudioPlaybackRemainingMs = 0;
  let tuneAudioPlaybackTimerStartedAt = 0;
  const tuneAudioDataCache = new Map();
  const listSnapshots = {
    places: { scrollTop: 0 },
    tunes: { scrollTop: 0 },
  };
  let pendingListRestore = null;

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
      return;
    }

    elements.sidebarContent.scrollTop = pendingListRestore.scrollTop;
    listSnapshots[viewKey] = {
      scrollTop: elements.sidebarContent.scrollTop,
    };
    pendingListRestore = null;
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

  function getTuneAudioSpeedValue() {
    return normalizeTuneAudioSpeedValue(tuneAudioState?.speedValue);
  }

  function getTuneAudioInstrumentProgram() {
    return normalizeTuneAudioInstrumentProgram(tuneAudioState?.instrumentProgram);
  }

  function createNextTuneAudioState(tuneId, overrides = {}) {
    return createTuneAudioState(tuneId, {
      speedValue: getTuneAudioSpeedValue(),
      instrumentProgram: getTuneAudioInstrumentProgram(),
      ...overrides,
    });
  }

  function setTuneAudioReadyState(tuneId, settingKey) {
    tuneAudioState = createNextTuneAudioState(tuneId, {
      status: "ready",
      settingKey,
      message: settingKey
        ? `The first The Session setting in ${settingKey} is ready to replay.`
        : "The first The Session setting is ready to replay.",
    });
  }

  function completeTuneAudioPlayback(requestId, tuneId, synth, settingKey) {
    if (
      requestId !== tuneAudioRequestId ||
      tuneAudioSynth !== synth ||
      !isTuneDetailVisible(tuneId)
    ) {
      return;
    }

    tuneAudioSynth = null;
    clearTuneAudioEndTimeout();
    resetTuneAudioPlaybackTiming();
    setTuneAudioReadyState(tuneId, settingKey);
    renderTuneAudioCardIfPresent();
  }

  function scheduleTuneAudioEndTimeout(requestId, tuneId, synth, settingKey) {
    clearTuneAudioEndTimeout();

    if (!(tuneAudioPlaybackRemainingMs > 0)) {
      return;
    }

    tuneAudioPlaybackTimerStartedAt = Date.now();
    tuneAudioEndTimeout = window.setTimeout(() => {
      completeTuneAudioPlayback(requestId, tuneId, synth, settingKey);
    }, tuneAudioPlaybackRemainingMs);
  }

  function stopTuneAudioPlayback(options = {}) {
    const { preserveTiming = false } = options;
    clearTuneAudioEndTimeout();

    if (tuneAudioSynth && typeof tuneAudioSynth.stop === "function") {
      try {
        tuneAudioSynth.stop();
      } catch (error) {
        console.warn("Unable to stop tune audio cleanly.", error);
      }
    }

    tuneAudioSynth = null;
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
      throw new Error("This browser can't play synthesized tune audio.");
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

  async function fetchTuneAudioData(selectedTune) {
    const tuneId = String(selectedTune?.id || "");
    if (!tuneId) {
      throw new Error("This tune doesn't have a The Session id.");
    }

    if (tuneAudioDataCache.has(tuneId)) {
      return await tuneAudioDataCache.get(tuneId);
    }

    const pendingRequest = (async () => {
      const response = await fetch(getTheSessionTuneJsonUrl(tuneId));
      if (!response.ok) {
        throw new Error("Couldn't load this tune from The Session.");
      }

      const tunePayload = await response.json();
      const firstSetting = Array.isArray(tunePayload.settings)
        ? tunePayload.settings.find(
            (setting) => typeof setting?.abc === "string" && setting.abc.trim(),
          )
        : null;

      if (!firstSetting) {
        throw new Error("The Session doesn't list a playable setting for this tune.");
      }

      const abcText = buildTheSessionTuneAudioAbc(
        {
          primaryName: tunePayload.name || selectedTune.primaryName,
          type: tunePayload.type || selectedTune.type,
        },
        firstSetting,
      );

      return {
        abcText,
        settingKey: formatTheSessionKeyLabel(firstSetting.key),
        baseMillisecondsPerMeasure: getTuneAudioBaseMillisecondsPerMeasure(abcText),
      };
    })();

    tuneAudioDataCache.set(tuneId, pendingRequest);

    try {
      const resolvedData = await pendingRequest;
      tuneAudioDataCache.set(tuneId, resolvedData);
      return resolvedData;
    } catch (error) {
      tuneAudioDataCache.delete(tuneId);
      throw error;
    }
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
          ? "Resuming the first The Session setting..."
          : "Loading the first The Session setting...",
    });
    renderTuneAudioCardIfPresent();

    try {
      const [audioContext, ABCJS, tuneAudioData] = await Promise.all([
        audioContextPromise,
        loadAbcjsLibrary(),
        fetchTuneAudioData(selectedTune),
      ]);

      if (requestId !== tuneAudioRequestId || !isTuneDetailVisible(tuneId)) {
        return;
      }

      if (!ABCJS?.synth?.supportsAudio || !ABCJS.synth.supportsAudio()) {
        throw new Error("This browser can't synthesize tune audio.");
      }

      const scratchHost = createTuneAudioScratchHost();
      let visualObject = null;

      try {
        visualObject = ABCJS.renderAbc(scratchHost, tuneAudioData.abcText)?.[0] || null;
      } finally {
        scratchHost.remove();
      }

      if (!visualObject) {
        throw new Error("Couldn't prepare the first The Session setting for playback.");
      }

      const millisecondsPerMeasure = getTuneAudioMillisecondsPerMeasure(
        tuneAudioData.baseMillisecondsPerMeasure,
        getTuneAudioSpeedValue(),
      );
      const synth = new ABCJS.synth.CreateSynth();
      tuneAudioSynth = synth;

      const primeResult = await synth
        .init({
          audioContext,
          visualObj: visualObject,
          millisecondsPerMeasure,
          options: {
            program: instrumentProgram,
            onEnded() {
              completeTuneAudioPlayback(
                requestId,
                tuneId,
                synth,
                tuneAudioData.settingKey,
              );
            },
          },
        })
        .then(() => synth.prime());

      if (
        requestId !== tuneAudioRequestId ||
        tuneAudioSynth !== synth ||
        !isTuneDetailVisible(tuneId)
      ) {
        if (typeof synth.stop === "function") {
          synth.stop();
        }
        return;
      }

      const playbackDurationMs =
        primeResult && Number.isFinite(primeResult.duration) && primeResult.duration > 0
          ? Math.ceil(primeResult.duration * 1000)
          : 0;
      const seekOffsetMs =
        playbackDurationMs > 0
          ? Math.min(normalizedStartOffsetMs, Math.max(playbackDurationMs - 1, 0))
          : normalizedStartOffsetMs;

      if (seekOffsetMs > 0 && typeof synth.seek === "function") {
        synth.seek(seekOffsetMs / 1000, "seconds");
      }

      synth.start();
      tuneAudioPlaybackDurationMs = playbackDurationMs;
      tuneAudioPlaybackPositionMs = seekOffsetMs;
      tuneAudioPlaybackRemainingMs =
        playbackDurationMs > 0 ? Math.max(0, playbackDurationMs - seekOffsetMs) : 0;
      tuneAudioState = createNextTuneAudioState(tuneId, {
        status: "playing",
        settingKey: tuneAudioData.settingKey,
        message: tuneAudioData.settingKey
          ? `Playing the first The Session setting in ${tuneAudioData.settingKey}.`
          : "Playing the first The Session setting.",
      });
      renderTuneAudioCardIfPresent();
      scheduleTuneAudioEndTimeout(requestId, tuneId, synth, tuneAudioData.settingKey);
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
      !tuneAudioSynth
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
        ? `Paused the first The Session setting in ${tuneAudioState.settingKey}.`
        : "Paused the first The Session setting.",
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

  if (elements.sidebarToggle) {
    elements.sidebarToggle.addEventListener("click", () => {
      actions.closeMobilePanel();
    });
  }

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
      actions.selectPlace(placeId);
    } else if (action === "select-tune") {
      captureCurrentListSnapshot("tunes");
      actions.selectTune(tuneId, { preservePlace: false, focusMode: "bounds" });
    } else if (action === "select-tune-from-place") {
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
      if ((latestState?.activeTab ?? null) !== "places") {
        queueTabCommit("places", () => {
          actions.viewPlaceOnMap(placeId);
        });
      } else {
        actions.viewPlaceOnMap(placeId);
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
      const previousCommittedTab = latestState?.activeTab ?? null;
      latestRenderContext = context;

      if (visualActiveTab && previousCommittedTab !== null && state.activeTab !== previousCommittedTab) {
        clearPendingTabSwitch();
        visualActiveTab = null;
      }

      latestState = state;

      if (state.activeTab !== "tunes" || !selectedTune) {
        if (tuneAudioState.tuneId !== null || tuneAudioSynth) {
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

      if (elements.sidebarToggle) {
        elements.sidebarToggle.classList.toggle("is-hidden", !isNarrowViewport);
      }

      syncTabButtons(elements.sidebarTabs, visualActiveTab ?? state.activeTab);

      const fieldState = captureFieldState(elements.sidebarContent);

      if (state.activeTab === "overview") {
        elements.sidebarContent.innerHTML = renderOverview(atlasData);
        restoreFieldState(elements.sidebarContent, fieldState);
        charts.renderOverviewCharts(
          {
            topPlaces: elements.sidebarContent.querySelector("#topPlacesChart"),
            tuneTypes: elements.sidebarContent.querySelector("#tuneTypesChart"),
          },
          atlasData,
          {
            onPlaceSelect(placeId) {
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
          ? renderPlaceDetail(context)
          : renderPlacesList({
              filteredPlaces,
              state,
              atlasData,
            });
        restoreFieldState(elements.sidebarContent, fieldState);
        if (!selectedPlace) {
          restorePendingListSnapshot("places");
        }
        return;
      }

      elements.sidebarContent.innerHTML = selectedTune
        ? renderTuneDetail(context, tuneAudioState)
        : renderTunesList({
            filteredTunes,
            state,
            atlasData,
          });
      restoreFieldState(elements.sidebarContent, fieldState);
      if (!selectedTune) {
        restorePendingListSnapshot("tunes");
      }
    },
  };
}
