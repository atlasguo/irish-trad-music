const fs = require("fs/promises");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT_DIR, "data");
const LINKED_PLACES_FILE = path.join(DATA_DIR, "tunesByPlaces.geojson");
const TUNES_FILE = path.join(DATA_DIR, "tunes.json");
const OUTPUT_FILE = path.join(DATA_DIR, "tuneAudioById.json");
const REQUEST_CONCURRENCY = 3;
const REQUEST_DELAY_MS = 150;
const MAX_RETRIES = 3;

const DEFAULT_TUNE_AUDIO_MILLISECONDS_PER_MEASURE = 1000;
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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

function normalizeTuneTypeForAudio(type) {
  return String(type || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
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
    return normalizeTheSessionTuneAudioAbc(abcBody);
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

  return normalizeTheSessionTuneAudioAbc(abcLines.join("\n"));
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

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeOutput(cacheById) {
  const orderedEntries = Object.entries(cacheById).sort((left, right) =>
    left[0].localeCompare(right[0], "en", { numeric: true }),
  );
  const orderedCacheById = Object.fromEntries(orderedEntries);
  await fs.writeFile(OUTPUT_FILE, `${JSON.stringify(orderedCacheById, null, 2)}\n`, "utf8");
}

function collectMappedTuneIds(linkedPlacesGeoJson) {
  const tuneIds = new Set();

  for (const feature of linkedPlacesGeoJson.features || []) {
    for (const tune of feature?.properties?.tunes || []) {
      if (tune?.id != null) {
        tuneIds.add(String(tune.id));
      }
    }
  }

  return [...tuneIds].sort((left, right) => left.localeCompare(right, "en", { numeric: true }));
}

function buildFallbackTuneIndex(tunes) {
  const fallbackById = new Map();

  for (const tune of tunes || []) {
    const tuneId = String(tune?.id || "");
    if (!tuneId) {
      continue;
    }

    fallbackById.set(tuneId, {
      primaryName: Array.isArray(tune.names) && tune.names.length > 0 ? tune.names[0] : "Untitled tune",
      type: tune.type || "",
    });
  }

  return fallbackById;
}

function buildTuneAudioDataFromPayload(tunePayload, fallbackTune) {
  const firstSetting = Array.isArray(tunePayload?.settings)
    ? tunePayload.settings.find((setting) => typeof setting?.abc === "string" && setting.abc.trim())
    : null;

  if (!firstSetting) {
    return null;
  }

  const abcText = buildTheSessionTuneAudioAbc(
    {
      primaryName: tunePayload?.name || fallbackTune?.primaryName,
      type: tunePayload?.type || fallbackTune?.type,
    },
    firstSetting,
  );

  if (!abcText) {
    return null;
  }

  return {
    abcText,
    settingKey: formatTheSessionKeyLabel(firstSetting.key),
    baseMillisecondsPerMeasure: getTuneAudioBaseMillisecondsPerMeasure(abcText),
  };
}

async function fetchTuneAudioData(tuneId, fallbackTune) {
  const response = await fetch(
    `https://thesession.org/tunes/${encodeURIComponent(tuneId)}?orderby=popular&format=json`,
    {
      headers: {
        accept: "application/json",
        "user-agent": "irish-trad-music-cache-builder/1.0",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const tunePayload = await response.json();
  return buildTuneAudioDataFromPayload(tunePayload, fallbackTune);
}

async function fetchWithRetries(tuneId, fallbackTune) {
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      return await fetchTuneAudioData(tuneId, fallbackTune);
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) {
        await delay(500 * attempt);
      }
    }
  }

  throw lastError;
}

async function loadExistingCache() {
  try {
    const existingCache = await readJson(OUTPUT_FILE);
    const normalizedCacheEntries = Object.entries(existingCache).map(([tuneId, tuneAudioData]) => {
      const abcText = normalizeTheSessionTuneAudioAbc(tuneAudioData?.abcText);
      return [
        tuneId,
        {
          abcText,
          settingKey: String(tuneAudioData?.settingKey || ""),
          baseMillisecondsPerMeasure: getTuneAudioBaseMillisecondsPerMeasure(abcText),
        },
      ];
    });

    return Object.fromEntries(normalizedCacheEntries);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return {};
    }

    throw error;
  }
}

async function main() {
  const [linkedPlacesGeoJson, tunes, existingCache] = await Promise.all([
    readJson(LINKED_PLACES_FILE),
    readJson(TUNES_FILE),
    loadExistingCache(),
  ]);

  const fallbackTuneById = buildFallbackTuneIndex(tunes);
  const mappedTuneIds = collectMappedTuneIds(linkedPlacesGeoJson);
  const cacheById = { ...existingCache };
  const missingTuneIds = [];

  const tuneIdsToFetch = mappedTuneIds.filter((tuneId) => {
    const cached = cacheById[tuneId];
    return !cached || typeof cached.abcText !== "string" || !cached.abcText.trim();
  });

  console.log(
    `Preparing local tune-audio cache for ${mappedTuneIds.length} mapped tunes using each tune's most popular playable setting (${tuneIdsToFetch.length} to fetch).`,
  );

  let completedCount = mappedTuneIds.length - tuneIdsToFetch.length;
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < tuneIdsToFetch.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      const tuneId = tuneIdsToFetch[currentIndex];
      const fallbackTune = fallbackTuneById.get(tuneId) || null;

      try {
        const tuneAudioData = await fetchWithRetries(tuneId, fallbackTune);
        if (tuneAudioData) {
          cacheById[tuneId] = tuneAudioData;
        } else {
          missingTuneIds.push(tuneId);
        }
      } catch (error) {
        missingTuneIds.push(tuneId);
        console.warn(
          `Unable to fetch tune ${tuneId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      completedCount += 1;
      if (completedCount % 25 === 0 || completedCount === mappedTuneIds.length) {
        await writeOutput(cacheById);
        console.log(`Cached ${completedCount}/${mappedTuneIds.length} mapped tunes.`);
      }

      await delay(REQUEST_DELAY_MS);
    }
  }

  const workerCount = Math.min(REQUEST_CONCURRENCY, Math.max(tuneIdsToFetch.length, 1));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  await writeOutput(cacheById);

  console.log(
    JSON.stringify(
      {
        mappedTunes: mappedTuneIds.length,
        cachedTunes: Object.keys(cacheById).length,
        missingTunes: missingTuneIds.length,
        outputFile: path.relative(ROOT_DIR, OUTPUT_FILE),
      },
      null,
      2,
    ),
  );

  if (missingTuneIds.length > 0) {
    console.log(`Missing tune ids: ${missingTuneIds.join(", ")}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
