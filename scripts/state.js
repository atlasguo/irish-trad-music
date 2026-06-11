const uiState = {
  activeTab: "overview",
  mapMode: "total",
  selectedPlaceId: null,
  selectedTuneId: null,
  placesSearch: "",
  placesSort: "alpha",
  placesTypeFilter: "all",
  tunesSearch: "",
  tunesTypeFilter: "all",
  tunesSort: "alpha",
  mobilePanel: null,
};

const listeners = new Set();

export function getState() {
  return { ...uiState };
}

export function setState(patch) {
  let hasChanged = false;

  Object.entries(patch).forEach(([key, value]) => {
    if (uiState[key] !== value) {
      uiState[key] = value;
      hasChanged = true;
    }
  });

  if (!hasChanged) {
    return;
  }

  listeners.forEach((listener) => listener(getState()));
}

export function subscribe(listener) {
  listeners.add(listener);
  listener(getState());

  return () => {
    listeners.delete(listener);
  };
}
