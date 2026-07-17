const references = [
  {
    name: "Cubao",
    coordinates: [14.6206, 121.0536],
    description: "Day-strong while remaining visibly active at night, consistent with a mixed-use commercial and transport center."
  },
  {
    name: "UP Diliman",
    coordinates: [14.6547, 121.0645],
    description: "A public reference area used to test whether the signal direction is plausible for a large institutional campus."
  },
  {
    name: "La Mesa",
    coordinates: [14.7181, 121.0714],
    description: "A lower-intensity public reference area used to challenge the method against a less urbanized context."
  }
];

const bandColors = {
  Lower: "#dce8f1",
  Moderate: "#9fc8e6",
  Strong: "#4b96d1",
  "Very strong": "#175f9f"
};

let mode = "orientation";
let activityLayer;

const legendTitle = document.getElementById("legend-title");
const legendItems = document.getElementById("legend-items");
const selectionCard = document.getElementById("selection-card");
const selectionLabel = document.getElementById("selection-label");
const selectionTitle = document.getElementById("selection-title");
const selectionDescription = document.getElementById("selection-description");
const signalPills = document.getElementById("signal-pills");
const daySignal = document.getElementById("day-signal");
const nightSignal = document.getElementById("night-signal");
const coverageNote = document.getElementById("coverage-note");
const studyPanel = document.getElementById("study-panel");
const panelScrim = document.getElementById("panel-scrim");

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;"
  })[character]);
}

function getStyle(properties, selectedMode) {
  if (selectedMode === "orientation") {
    const fillColor = properties.orientation === "Day-oriented"
      ? "#e45745"
      : properties.orientation === "Night-oriented"
        ? "#3f7fd9"
        : "#b9bdc3";
    return { color: "#ffffff", weight: 0.8, fillColor, fillOpacity: 0.74 };
  }
  const band = selectedMode === "day" ? properties.day_signal : properties.night_signal;
  return { color: "#ffffff", weight: 0.8, fillColor: bandColors[band] || "#dce8f1", fillOpacity: 0.78 };
}

function getLegend() {
  if (mode === "orientation") {
    return [
      ["#e45745", "More day-oriented", "Day signal is stronger"],
      ["#3f7fd9", "More night-oriented", "Night signal is stronger"],
      ["#b9bdc3", "Relatively balanced", "Signals are closer"]
    ];
  }
  return Object.entries(bandColors).map(([label, color]) => [
    color,
    label,
    `${mode === "day" ? "Daytime" : "Nighttime"} relative signal`
  ]);
}

function renderLegend() {
  legendTitle.textContent = mode === "orientation"
    ? "Day vs night orientation"
    : `${mode[0].toUpperCase()}${mode.slice(1)} signal strength`;
  legendItems.replaceChildren();
  getLegend().forEach(([color, label, description]) => {
    const item = document.createElement("div");
    item.className = "legend-item";
    const swatch = document.createElement("span");
    swatch.style.background = color;
    const copy = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = label;
    const small = document.createElement("small");
    small.textContent = description;
    copy.append(strong, small);
    item.append(swatch, copy);
    legendItems.append(item);
  });
}

function showSelection(selected) {
  selectionLabel.textContent = selected.label;
  selectionTitle.textContent = selected.title;
  selectionDescription.textContent = selected.description;
  if (selected.day && selected.night) {
    daySignal.textContent = selected.day;
    nightSignal.textContent = selected.night;
    signalPills.hidden = false;
  } else {
    signalPills.hidden = true;
  }
  if (selected.note) {
    coverageNote.textContent = selected.note;
    coverageNote.hidden = false;
  } else {
    coverageNote.hidden = true;
  }
  selectionCard.hidden = false;
}

function openStudyPanel() {
  studyPanel.classList.add("open");
  studyPanel.setAttribute("aria-hidden", "false");
  panelScrim.hidden = false;
}

function closeStudyPanel() {
  studyPanel.classList.remove("open");
  studyPanel.setAttribute("aria-hidden", "true");
  panelScrim.hidden = true;
}

document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    mode = button.dataset.mode;
    document.querySelectorAll("[data-mode]").forEach((candidate) => {
      const active = candidate === button;
      candidate.classList.toggle("active", active);
      candidate.setAttribute("aria-pressed", String(active));
    });
    if (activityLayer) {
      activityLayer.setStyle((feature) => getStyle(feature.properties, mode));
    }
    renderLegend();
  });
});

document.getElementById("open-panel").addEventListener("click", openStudyPanel);
document.getElementById("close-panel").addEventListener("click", closeStudyPanel);
panelScrim.addEventListener("click", closeStudyPanel);
document.getElementById("close-selection").addEventListener("click", () => {
  selectionCard.hidden = true;
});
document.getElementById("stories-button").addEventListener("click", () => {
  showSelection({
    title: "Reference stories",
    label: "Three public contexts",
    description: "Click Cubao, UP Diliman, or La Mesa on the map to explore how public reference areas were used as plausibility checks."
  });
});

renderLegend();

const map = L.map("map", { zoomControl: false, preferCanvas: true }).setView([14.675, 121.055], 11);
L.control.zoom({ position: "bottomright" }).addTo(map);
L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
}).addTo(map);

fetch("map-data.geojson")
  .then((response) => {
    if (!response.ok) throw new Error("Map data could not be loaded");
    return response.json();
  })
  .then((data) => {
    activityLayer = L.geoJSON(data, {
      style: (feature) => getStyle(feature.properties, "orientation"),
      onEachFeature: (feature, cellLayer) => {
        const properties = feature.properties;
        cellLayer.bindTooltip(
          `<strong>${escapeHtml(properties.cell_id)}</strong><br>${escapeHtml(properties.orientation)}`,
          { sticky: true, className: "map-tooltip" }
        );
        cellLayer.on("click", () => {
          showSelection({
            title: properties.cell_id,
            label: properties.orientation,
            description: "A qualitative view of relative activity signals within Quezon City.",
            day: properties.day_signal,
            night: properties.night_signal,
            note: properties.observation_note
          });
        });
      }
    }).addTo(map);
    map.fitBounds(activityLayer.getBounds(), { padding: [28, 28] });

    references.forEach((reference) => {
      const icon = L.divIcon({
        className: "reference-marker-wrap",
        html: `<span class="reference-marker"><i></i>${escapeHtml(reference.name)}</span>`,
        iconSize: [95, 30],
        iconAnchor: [12, 15]
      });
      L.marker(reference.coordinates, { icon }).addTo(map).on("click", () => {
        showSelection({
          title: reference.name,
          label: "Public reference area",
          description: reference.description
        });
      });
    });
  })
  .catch(() => {
    document.getElementById("map-error").hidden = false;
  });
