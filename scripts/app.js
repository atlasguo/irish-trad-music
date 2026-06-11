import {
  DESKTOP_SIDEBAR_WIDTH,
  MAP_PADDING,
  MOBILE_PANEL_COLLAPSED_BOTTOM_PADDING,
  MOBILE_PANEL_HEIGHT_RATIO,
  MOBILE_PANEL_MAX_HEIGHT,
  MOBILE_PANEL_MIN_HEIGHT,
  MOBILE_PANEL_OPEN_GAP,
  SIDEBAR_BREAKPOINT,
} from "./config.js";
import {
  buildConeMarkerId,
  buildBlockMarkerId,
  buildRingMarkerId,
  loadAtlasData,
  normalizeForSearch,
  getTuneTypeKey,
  summarizeTuneTypeCounts,
} from "./data.js";
import { createChartsController } from "./charts.js";
import { createMapController } from "./map.js";
import { getState, setState, subscribe } from "./state.js";
import { createUIController } from "./ui.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getInitialStateFromLocation() {
  const searchParams = new URLSearchParams(window.location.search);
  const tuneType = getTuneTypeKey(searchParams.get("type"));
  const initialState = {};

  if (searchParams.get("tab") === "tunes" || tuneType) {
    initialState.activeTab = "tunes";
    if (isNarrowViewport()) {
      initialState.mobilePanel = "sidebar";
    }
  }

  if (searchParams.get("tab") === "places") {
    initialState.activeTab = "places";
    if (isNarrowViewport()) {
      initialState.mobilePanel = "sidebar";
    }
  }

  if (tuneType) {
    initialState.tunesTypeFilter = tuneType;
  }

  return initialState;
}

const elements = {
  appShell: document.getElementById("appShell"),
  mapShell: document.getElementById("mapShell"),
  mobileTopbar: document.getElementById("mobileTopbar"),
  sidebar: document.getElementById("sidebar"),
  sidebarTabs: document.getElementById("sidebarTabs"),
  sidebarContent: document.getElementById("sidebarContent"),
  mobileSidebarToggle: document.getElementById("mobileSidebarToggle"),
  mobileLegendToggle: document.getElementById("mobileLegendToggle"),
  statusOverlay: document.getElementById("statusOverlay"),
};
const MOBILE_TOPBAR_LAYOUT_GAP = 14;

function isNarrowViewport() {
  return window.innerWidth < SIDEBAR_BREAKPOINT;
}

function getBaseViewportPadding() {
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

function getVisibleElementBottomOffset(element) {
  if (
    !element ||
    element.classList.contains("is-hidden") ||
    window.getComputedStyle(element).display === "none"
  ) {
    return 0;
  }

  const shellTop = elements.appShell?.getBoundingClientRect().top ?? 0;
  const rect = element.getBoundingClientRect();
  return Math.max(0, Math.round(rect.bottom - shellTop));
}

function getMobileTopbarHeight() {
  if (!isNarrowViewport()) {
    return 0;
  }

  if (!elements.mobileTopbar) {
    return Math.max(
      getVisibleElementBottomOffset(elements.mobileSidebarToggle),
      getVisibleElementBottomOffset(elements.mobileLegendToggle),
    );
  }

  return Math.max(
    getVisibleElementBottomOffset(elements.mobileTopbar),
    getVisibleElementBottomOffset(elements.mobileSidebarToggle),
    getVisibleElementBottomOffset(elements.mobileLegendToggle),
  );
}

function getMobileSidebarPanelHeight() {
  const availableHeight = window.innerHeight - getMobileTopbarHeight() - MOBILE_TOPBAR_LAYOUT_GAP;
  const preferredHeight = clamp(
    Math.round(availableHeight * MOBILE_PANEL_HEIGHT_RATIO),
    MOBILE_PANEL_MIN_HEIGHT,
    MOBILE_PANEL_MAX_HEIGHT,
  );

  return Math.max(220, Math.min(preferredHeight, availableHeight, MOBILE_PANEL_MAX_HEIGHT));
}

function getMobileTopViewportPadding() {
  return Math.max(MAP_PADDING.top, getMobileTopbarHeight() + MOBILE_TOPBAR_LAYOUT_GAP);
}

function syncMobileLayoutMetrics() {
  elements.appShell.style.setProperty("--mobile-topbar-height", `${getMobileTopbarHeight()}px`);
  elements.appShell.style.setProperty("--mobile-panel-height", `${getMobileSidebarPanelHeight()}px`);
}

function getViewportPadding(state = getState()) {
  const basePadding = getBaseViewportPadding();

  if (isNarrowViewport()) {
    return {
      ...basePadding,
      top: getMobileTopViewportPadding(),
      bottom:
        state?.mobilePanel === "sidebar"
          ? getMobileSidebarPanelHeight() + MOBILE_PANEL_OPEN_GAP
          : MOBILE_PANEL_COLLAPSED_BOTTOM_PADDING,
    };
  }

  return {
    ...basePadding,
    left: DESKTOP_SIDEBAR_WIDTH + 40,
  };
}

function getMobileSidebarPanelStatePatch() {
  return isNarrowViewport() ? { mobilePanel: "sidebar" } : {};
}

function renderStatus(title, message) {
  elements.statusOverlay.innerHTML = `
    <div class="app-state__card">
      <img class="app-state__mark" src="./assets/icons/irish-trad-music-icon.png" alt="" aria-hidden="true" />
      <p class="eyebrow">Atlas of Irish Traditional Music</p>
      <h1>${title}</h1>
      <p>${message}</p>
    </div>
  `;
  elements.statusOverlay.classList.remove("is-hidden");
}

function hideStatus() {
  elements.statusOverlay.classList.add("is-hidden");
}

function waitForLibraries() {
  return new Promise((resolve) => {
    const startedAt = Date.now();

    function checkLibraries() {
      if (window.mapboxgl && window.Chart) {
        resolve();
        return;
      }

      if (Date.now() - startedAt > 10000) {
        resolve();
        return;
      }

      window.requestAnimationFrame(checkLibraries);
    }

    checkLibraries();
  });
}

function getSelectedPlace(atlasData, state) {
  return state.selectedPlaceId ? atlasData.placesById.get(state.selectedPlaceId) || null : null;
}

function getSelectedTune(atlasData, state) {
  return state.selectedTuneId ? atlasData.tunesById.get(state.selectedTuneId) || null : null;
}

function getFilteredPlaces(atlasData, state) {
  const normalizedQuery = normalizeForSearch(state.placesSearch.trim());

  return [...atlasData.places]
    .filter((place) =>
      state.placesTypeFilter === "all" ? true : place.placeType === state.placesTypeFilter,
    )
    .filter((place) => {
      if (!normalizedQuery) {
        return true;
      }

      return [place.name, place.irishName || ""].some((value) =>
        normalizeForSearch(value).includes(normalizedQuery),
      );
    })
    .sort((left, right) => {
      if (state.placesSort === "most-tunes" && right.tuneCount !== left.tuneCount) {
        return right.tuneCount - left.tuneCount;
      }

      return left.name.localeCompare(right.name, "en");
    });
}

function getFilteredTunes(atlasData, state) {
  const normalizedQuery = normalizeForSearch(state.tunesSearch.trim());

  return [...atlasData.mappedTunes]
    .filter((tune) => (state.tunesTypeFilter === "all" ? true : tune.type === state.tunesTypeFilter))
    .filter((tune) => {
      if (!normalizedQuery) {
        return true;
      }

      return [tune.primaryName, ...tune.alternateNames].some((value) =>
        normalizeForSearch(value).includes(normalizedQuery),
      );
    })
    .sort((left, right) => {
      if (
        state.tunesSort === "most-places" &&
        right.relatedPlaces.length !== left.relatedPlaces.length
      ) {
        return right.relatedPlaces.length - left.relatedPlaces.length;
      }

      return left.primaryName.localeCompare(right.primaryName, "en");
    });
}

function getVisibleMapPlaces(atlasData, state, selectedTune) {
  if (state.activeTab === "tunes" && !selectedTune && state.tunesTypeFilter !== "all") {
    return atlasData.places
      .map((place) => {
        const filteredTunes = place.tunes.filter((tune) => tune.type === state.tunesTypeFilter);
        if (filteredTunes.length === 0) {
          return null;
        }

        const tuneTypeCounts = summarizeTuneTypeCounts(filteredTunes);

        return {
          ...place,
          tuneIds: filteredTunes.map((tune) => tune.id),
          tunes: filteredTunes,
          tuneCount: filteredTunes.length,
          tuneTypeCounts,
          blockMarkerId: buildBlockMarkerId(tuneTypeCounts),
          ringMarkerId: buildRingMarkerId(tuneTypeCounts),
          coneMarkerId: buildConeMarkerId(tuneTypeCounts),
        };
      })
      .filter(Boolean);
  }

  return atlasData.places;
}

async function bootstrap() {
  try {
    await waitForLibraries();
    const atlasData = await loadAtlasData();
    let mapController = null;
    const charts = createChartsController();

    const actions = {
      closeMobilePanel() {
        if (isNarrowViewport()) {
          setState({ mobilePanel: null });
        }
      },

      toggleMobileSidebarPanel() {
        if (!isNarrowViewport()) {
          return;
        }

        setState({
          mobilePanel: getState().mobilePanel === "sidebar" ? null : "sidebar",
        });
      },

      toggleMobileLegendPanel() {
        if (!isNarrowViewport()) {
          return;
        }

        setState({
          mobilePanel: getState().mobilePanel === "legend" ? null : "legend",
        });
      },

      switchTab(nextTab) {
        setState({
          activeTab: nextTab,
          ...getMobileSidebarPanelStatePatch(),
        });
      },

      selectPlace(placeId, options = {}) {
        const place = atlasData.placesById.get(placeId);
        if (!place) {
          return;
        }

        const nextState = {
          activeTab: "places",
          selectedPlaceId: placeId,
          selectedTuneId: null,
          ...getMobileSidebarPanelStatePatch(),
        };

        setState(nextState);

        if (options.focus !== false && mapController) {
          mapController.focusPlace(place, getViewportPadding(getState()));
        }
      },

      selectTune(tuneId, options = {}) {
        const tune = atlasData.tunesById.get(tuneId);
        if (!tune) {
          return;
        }

        const nextState = {
          activeTab: "tunes",
          selectedTuneId: tuneId,
          ...getMobileSidebarPanelStatePatch(),
        };

        if (!options.preservePlace) {
          nextState.selectedPlaceId = null;
        }

        setState(nextState);

        if (options.focusMode === "bounds" && mapController) {
          const relatedPlaces = tune.relatedPlaces
            .map((place) => atlasData.placesById.get(place.id))
            .filter(Boolean);
          mapController.focusPlaces(relatedPlaces, getViewportPadding(getState()));
        }
      },

      viewPlaceOnMap(placeId) {
        actions.selectPlace(placeId);
      },

      restoreView(viewSnapshot) {
        if (!viewSnapshot) {
          return;
        }

        const normalizedTab =
          viewSnapshot.activeTab === "places" ||
          viewSnapshot.activeTab === "tunes" ||
          viewSnapshot.activeTab === "overview"
            ? viewSnapshot.activeTab
            : "overview";

        const nextState = {
          activeTab: normalizedTab,
          selectedPlaceId: null,
          selectedTuneId: null,
          ...getMobileSidebarPanelStatePatch(),
        };

        if (
          viewSnapshot.selectedPlaceId &&
          atlasData.placesById.has(String(viewSnapshot.selectedPlaceId))
        ) {
          nextState.selectedPlaceId = String(viewSnapshot.selectedPlaceId);
        }

        if (viewSnapshot.selectedTuneId && atlasData.tunesById.has(String(viewSnapshot.selectedTuneId))) {
          nextState.selectedTuneId = String(viewSnapshot.selectedTuneId);
        }

        setState(nextState);
      },

      backToPlacesList() {
        setState({ selectedPlaceId: null });
      },

      backToTunesList() {
        setState({ selectedTuneId: null });
      },

      setPlacesSearch(value) {
        setState({ placesSearch: value });
      },

      setPlacesSort(value) {
        setState({ placesSort: value });
      },

      setPlacesTypeFilter(value) {
        setState({ placesTypeFilter: value });
      },

      setTunesSearch(value) {
        setState({ tunesSearch: value });
      },

      setTunesTypeFilter(value) {
        setState({ tunesTypeFilter: value });
      },

      setTunesSort(value) {
        setState({ tunesSort: value });
      },

      setMapMode(value) {
        setState({ mapMode: value });
      },

      openTuneTypeFilter(tuneType) {
        const nextState = {
          activeTab: "tunes",
          selectedPlaceId: null,
          selectedTuneId: null,
          tunesSearch: "",
          tunesTypeFilter: tuneType,
          ...getMobileSidebarPanelStatePatch(),
        };

        setState(nextState);
      },

      openPlaceTypeFilter(placeType) {
        const nextState = {
          activeTab: "places",
          selectedPlaceId: null,
          placesTypeFilter: placeType,
          ...getMobileSidebarPanelStatePatch(),
        };

        setState(nextState);
      },

      openPlacesByName(placeName) {
        const nextState = {
          activeTab: "places",
          selectedPlaceId: null,
          selectedTuneId: null,
          placesSearch: placeName,
          placesSort: "most-tunes",
          ...getMobileSidebarPanelStatePatch(),
        };

        setState(nextState);
      },

      openPlacesIndex() {
        const nextState = {
          activeTab: "places",
          selectedPlaceId: null,
          selectedTuneId: null,
          placesSearch: "",
          placesSort: "alpha",
          placesTypeFilter: "all",
          ...getMobileSidebarPanelStatePatch(),
        };

        setState(nextState);
      },

      openTunesIndex() {
        const nextState = {
          activeTab: "tunes",
          selectedPlaceId: null,
          selectedTuneId: null,
          tunesSearch: "",
          tunesTypeFilter: "all",
          tunesSort: "alpha",
          ...getMobileSidebarPanelStatePatch(),
        };

        setState(nextState);
      },
    };

    const ui = createUIController({
      elements,
      actions,
      charts,
    });

    const initialState = getInitialStateFromLocation();
    if (Object.keys(initialState).length > 0) {
      setState(initialState);
    }

    mapController = createMapController({
      container: elements.mapShell,
      atlasData,
      getViewportPadding() {
        return getViewportPadding(getState());
      },
      mobileLegendToggle: elements.mobileLegendToggle,
      onPlaceSelect(placeId) {
        actions.selectPlace(placeId, { focus: isNarrowViewport() });
      },
      onMapBackgroundClick() {
        const state = getState();
        const nextState = {};

        if (state.selectedPlaceId) {
          nextState.selectedPlaceId = null;
        }

        if (isNarrowViewport() && state.mobilePanel) {
          nextState.mobilePanel = null;
        }

        if (Object.keys(nextState).length > 0) {
          setState(nextState);
        }
      },
      onMapModeChange(mode) {
        actions.setMapMode(mode);
      },
      onMobileLegendToggle() {
        actions.toggleMobileLegendPanel();
      },
    });

    let wasNarrow = isNarrowViewport();

    subscribe((state) => {
      const selectedPlace = getSelectedPlace(atlasData, state);
      const selectedTune = getSelectedTune(atlasData, state);
      const context = {
        atlasData,
        state,
        selectedPlace,
        selectedTune,
        filteredPlaces: getFilteredPlaces(atlasData, state),
        filteredTunes: getFilteredTunes(atlasData, state),
        visibleMapPlaces: getVisibleMapPlaces(atlasData, state, selectedTune),
        isNarrowViewport: isNarrowViewport(),
      };

      ui.render(context);
      syncMobileLayoutMetrics();
      mapController.setSelections({
        selectedPlace,
        selectedTune,
        visiblePlaces: context.visibleMapPlaces,
        mapMode: state.mapMode,
        isNarrowViewport: context.isNarrowViewport,
        mobilePanel: state.mobilePanel,
      });

      requestAnimationFrame(() => {
        mapController.resize();
      });
    });

    window.addEventListener("resize", () => {
      const nowNarrow = isNarrowViewport();
      syncMobileLayoutMetrics();

      if (nowNarrow !== wasNarrow) {
        wasNarrow = nowNarrow;
        setState({ mobilePanel: null });

        return;
      }

      requestAnimationFrame(() => {
        mapController.resize();
      });
    });

    syncMobileLayoutMetrics();
    hideStatus();
    mapController.fitToAtlas(atlasData.bounds, getViewportPadding(getState()));
  } catch (error) {
    renderStatus(
      "Unable to load the atlas",
      error instanceof Error ? error.message : "The data files could not be loaded.",
    );
  }
}

bootstrap();

