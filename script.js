// script.js

let puzzleData = [];
let filteredData = [];
let selectedPuzzles = [];
let exportMode = false;

function init() {
  let pupusa = "https://api.apify.com/v2/acts/lukaskrivka~google-sheets/runs/last/key-value-store/records/OUTPUT?token=rWE";
  pupusa += "3PGPKfe";
  pupusa += "hDW7Myr9PE3pmZq";
  fetch(pupusa)
    .then((response) => response.json())
    .then((data) => {
      puzzleData = data.filter((puzzle) => puzzle.ID !== "00000" && puzzle.Datacenter !== "-" && puzzle.Datacenter !== "");
      filteredData = filterData();
      displayData(filteredData);
      createDatacenterToggles();
      createDistrictToggles();
      createTagToggles();
      updatePuzzlesFound();
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
    });
}

function filterData() {
  const minRating = document.getElementById("minRating").value;
  const maxRating = document.getElementById("maxRating").value;
  const searchQuery = document.getElementById("searchInput").value.toLowerCase();
  const excludeQuery = document.getElementById("excludeInput").value.toLowerCase();
  const selectedDatacenters = Array.from(document.querySelectorAll("#toggleContainer input:checked")).map((checkbox) => checkbox.dataset.datacenter);
  const selectedDistricts = Array.from(document.querySelectorAll("#districtToggleContainer input:checked")).map((checkbox) => checkbox.dataset.district);
  const selectedTags = Array.from(document.querySelectorAll("#tagToggleContainer input:checked")).map((checkbox) => checkbox.dataset.tag);

  return puzzleData.filter((puzzle) => {
    const rating = isNaN(parseInt(puzzle.Rating)) ? 1 : parseInt(puzzle.Rating);
    const builderMatch = puzzle.Builder.toLowerCase().includes(searchQuery);
    const puzzleNameMatch = puzzle["Puzzle Name"].toLowerCase().includes(searchQuery);
    const excludeMatch = !excludeQuery || !puzzle.Builder.toLowerCase().includes(excludeQuery);
    const datacenterMatch = selectedDatacenters.length === 0 || selectedDatacenters.includes(puzzle.Datacenter);
    const districtMatch = selectedDistricts.length === 0 || selectedDistricts.includes(puzzle.District);
    const ratingMatch = rating >= minRating && rating <= maxRating;
    const tagMatch = selectedTags.length === 0 || selectedTags.every((tag) => puzzle[tag] || puzzle[tag] === "+");

    return puzzle.Status === "Active" && ratingMatch && (builderMatch || puzzleNameMatch) && excludeMatch && datacenterMatch && districtMatch && tagMatch;
  });
}

function sortData() {
  const sortBy = document.getElementById("sortBy").value;
  const sortOrder = document.getElementById("sortOrder").value;

  filteredData.sort((a, b) => {
    if (sortBy === "name") {
      return sortOrder === "asc" ? a["Puzzle Name"].localeCompare(b["Puzzle Name"]) : b["Puzzle Name"].localeCompare(a["Puzzle Name"]);
    } else if (sortBy === "rating") {
      const ratingA = isNaN(parseInt(a.Rating)) ? 1 : parseInt(a.Rating);
      const ratingB = isNaN(parseInt(b.Rating)) ? 1 : parseInt(b.Rating);
      return sortOrder === "asc" ? ratingA - ratingB : ratingB - ratingA;
    }
  });
  displayData(filteredData);
}

function displayData(data) {
  const container = document.getElementById("puzzleContainer");
  container.innerHTML = "";

  data.forEach((puzzle) => {
    const infoCard = document.createElement("div");
    infoCard.className = "info-card";
    infoCard.innerHTML = `
      <h3>${puzzle["Puzzle Name"]} by ${puzzle.Builder} ${getStarRating(puzzle.Rating)} [${getTags(puzzle)}]</h3>
      ${puzzle["Goals/Rules"] ? `<p><strong>Goals/Rules:</strong> ${puzzle["Goals/Rules"]}</p>` : ""}
      <p>${puzzle.Datacenter}, ${puzzle.World} - ${puzzle.Address}</p>
      <span class="puzzle-id">${puzzle.ID}</span>
      ${exportMode ? `<div class="checkbox-container"><input type="checkbox" data-puzzle-id="${puzzle.ID}"></div>` : ""}
    `;
    container.appendChild(infoCard);

    if (selectedPuzzles.includes(puzzle.ID)) {
      infoCard.classList.add("selected");
      infoCard.querySelector('input[type="checkbox"]').checked = true;
    }
  });

  updatePuzzlesFound();

  if (exportMode) {
    const checkboxes = document.querySelectorAll('.checkbox-container input[type="checkbox"]');
    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", handlePuzzleSelection);
    });
  }
}

function getStarRating(rating) {
  if (isNaN(parseInt(rating))) {
    return `☆ ${rating}`;
  } else {
    return "★".repeat(parseInt(rating));
  }
}

function getTags(puzzle) {
  const tags = ["M", "E", "S", "P", "V", "J", "G", "L", "X"];
  return tags
    .filter((tag) => puzzle[tag])
    .map((tag) => (puzzle[tag].includes("+") ? `${tag}+` : tag))
    .join("");
}

function createDatacenterToggles() {
  const datacenters = [...new Set(puzzleData.map((puzzle) => puzzle.Datacenter))];
  const toggleContainer = document.getElementById("toggleContainer");

  const toggleGroup = document.createElement("div");
  toggleGroup.className = "toggle-group";

  datacenters.forEach((datacenter) => {
    const toggle = document.createElement("div");
    toggle.innerHTML = `
      <label>
        <input type="checkbox" checked data-datacenter="${datacenter}" onchange="applyFilters()">
        ${datacenter}
      </label>
    `;
    toggleGroup.appendChild(toggle);
  });

  toggleContainer.appendChild(toggleGroup);
}

function createDistrictToggles() {
  const districts = [...new Set(puzzleData.map((puzzle) => puzzle.District))];
  const toggleContainer = document.getElementById("districtToggleContainer");

  const toggleGroup = document.createElement("div");
  toggleGroup.className = "toggle-group";

  districts.forEach((district) => {
    const toggle = document.createElement("div");
    toggle.innerHTML = `
      <label>
        <input type="checkbox" checked data-district="${district}" onchange="applyFilters()">
        ${district}
      </label>
    `;
    toggleGroup.appendChild(toggle);
  });

  toggleContainer.appendChild(toggleGroup);
}

function createTagToggles() {
  const tags = ["M", "E", "S", "P", "V", "J", "G", "L", "X"];
  const toggleContainer = document.getElementById("tagToggleContainer");

  const toggleGroup = document.createElement("div");
  toggleGroup.className = "toggle-group";

  tags.forEach((tag) => {
    const toggle = document.createElement("div");
    toggle.innerHTML = `
      <label>
        <input type="checkbox" data-tag="${tag}" onchange="applyFilters()">
        ${tag}
      </label>
    `;
    toggleGroup.appendChild(toggle);
  });

  toggleContainer.appendChild(toggleGroup);
}

function applyFilters() {
  filteredData = filterData();
  sortData();
}

function updatePuzzlesFound() {
  const puzzlesFoundElement = document.getElementById("puzzlesFound");
  puzzlesFoundElement.textContent = `Puzzles Found: ${filteredData.length}`;
}

function generateDailyRoulette() {
  const minRating = parseInt(document.getElementById("minRating").value);
  const maxRating = parseInt(document.getElementById("maxRating").value);

  const minRatingPuzzles = filteredData.filter((puzzle) => {
    const rating = isNaN(parseInt(puzzle.Rating)) ? 1 : parseInt(puzzle.Rating);
    return rating === minRating;
  });

  const maxRatingPuzzles = filteredData.filter((puzzle) => {
    const rating = isNaN(parseInt(puzzle.Rating)) ? 1 : parseInt(puzzle.Rating);
    return rating === maxRating;
  });

  const remainingPuzzles = filteredData.filter((puzzle) => {
    const rating = isNaN(parseInt(puzzle.Rating)) ? 1 : parseInt(puzzle.Rating);
    return rating !== minRating && rating !== maxRating;
  });

  const roulettePuzzles = [];

  if (minRatingPuzzles.length > 0) {
    const randomIndex = Math.floor(Math.random() * minRatingPuzzles.length);
    roulettePuzzles.push(minRatingPuzzles[randomIndex]);
  }

  if (maxRatingPuzzles.length > 0) {
    const randomIndex = Math.floor(Math.random() * maxRatingPuzzles.length);
    roulettePuzzles.push(maxRatingPuzzles[randomIndex]);
  }

  while (roulettePuzzles.length < 5 && remainingPuzzles.length > 0) {
    const randomIndex = Math.floor(Math.random() * remainingPuzzles.length);
    roulettePuzzles.push(remainingPuzzles[randomIndex]);
    remainingPuzzles.splice(randomIndex, 1);
  }

  displayRouletteModal(roulettePuzzles);
}

function displayRouletteModal(puzzles) {
  const modalContent = document.getElementById("modalContent");
  modalContent.innerHTML = "";

  puzzles.forEach((puzzle) => {
    const puzzleElement = document.createElement("div");
    puzzleElement.className = "info-card";
    puzzleElement.innerHTML = `
      <h3>${puzzle["Puzzle Name"]} by ${puzzle.Builder} ${getStarRating(puzzle.Rating)} [${getTags(puzzle)}]</h3>
      ${puzzle["Goals/Rules"] ? `<p><strong>Goals/Rules:</strong> ${puzzle["Goals/Rules"]}</p>` : ""}
      <p>${puzzle.Datacenter}, ${puzzle.World} - ${puzzle.Address}</p>
    `;
    modalContent.appendChild(puzzleElement);
  });

  const modal = document.getElementById("rouletteModal");
  modal.style.display = "block";
}

function closeModal() {
  const modal = document.getElementById("rouletteModal");
  modal.style.display = "none";
}

function copyToClipboard() {
  const modalContent = document.getElementById("modalContent");
  const puzzleElements = modalContent.querySelectorAll(".info-card");
  let markdownText = "**Duty Roulette**";

  puzzleElements.forEach((element) => {
    const puzzleName = element.querySelector("h3").textContent;
    const puzzleGoalsRules = element.querySelector("p:first-of-type");
    const puzzleAddress = element.querySelector("p:last-of-type").textContent;

    markdownText += "```prolog\n";
    markdownText += puzzleName + "\n";

    if (puzzleGoalsRules && !puzzleGoalsRules.textContent.includes(puzzleAddress)) {
      markdownText += puzzleGoalsRules.textContent + "\n";
      markdownText += puzzleAddress + "\n";
    } else {
      markdownText += puzzleAddress + "\n";
    }

    markdownText += "```";
  });

  const tempElement = document.createElement("textarea");
  tempElement.value = markdownText;
  document.body.appendChild(tempElement);
  tempElement.select();
  document.execCommand("copy");
  document.body.removeChild(tempElement);

  //alert("Daily Roulette copied to clipboard as Discord markdown!");
}

function toggleExportMode() {
  exportMode = !exportMode;
  const exportModeButton = document.getElementById("exportModeButton");
  const exportButtons = document.getElementById("exportButtons");
  exportModeButton.textContent = exportMode ? "Disable Export Mode" : "Enable Export Mode";
  exportButtons.style.display = exportMode ? "inline-block" : "none";
  displayData(filteredData);
}

function handlePuzzleSelection(event) {
  const puzzleId = event.target.dataset.puzzleId;
  const infoCard = event.target.closest(".info-card");

  if (event.target.checked) {
    selectedPuzzles.push(puzzleId);
    infoCard.classList.add("selected");
  } else {
    const index = selectedPuzzles.indexOf(puzzleId);
    if (index !== -1) {
      selectedPuzzles.splice(index, 1);
    }
    infoCard.classList.remove("selected");
  }
}

function clearSelection() {
  selectedPuzzles = [];
  displayData(filteredData);
}

function copySelectedPuzzleIds() {
  const puzzleIds = selectedPuzzles.join(" ");
  const tempElement = document.createElement("textarea");
  tempElement.value = puzzleIds;
  document.body.appendChild(tempElement);
  tempElement.select();
  document.execCommand("copy");
  document.body.removeChild(tempElement);
  //alert("Selected puzzle IDs copied to clipboard!");
}

window.onclick = function (event) {
  const modal = document.getElementById("rouletteModal");
  if (event.target === modal) {
    closeModal();
  }
};
