// script.js

let puzzleData = [];
let filteredData = [];
let selectedPuzzles = [];
let exportMode = false;
let discordId = localStorage.getItem("discordId") || "";
let clearData = [];
let currentTab = "search";
let lists = JSON.parse(localStorage.getItem("puzzleLists") || "{}");

function init() {
  updateDiscordIdDisplay();

  fetch("sh-dump/puzzles.json")
    .then((response) => response.json())
    .then((data) => {
      puzzleData = data.filter((puzzle) => puzzle.ID !== "00000" && puzzle.Datacenter !== "-" && puzzle.Datacenter !== "");
      filteredData = filterData();
      displayData(filteredData);
      createDatacenterToggles();
      createDistrictToggles();
      createTagToggles();
      updatePuzzlesFound();
      // Initialize hub mode dropdowns
      populateHubWorlds();
      // Display lists
      displayLists();
    })
    .catch((error) => {
      console.error("Error fetching data:", error);
    });

  fetchClearData();
}

function switchTab(tabName) {
  currentTab = tabName;
  
  // Update tab buttons
  document.querySelectorAll('.tab-button').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  
  // Hide all tabs
  document.getElementById('searchTab').style.display = 'none';
  document.getElementById('hubModeTab').style.display = 'none';
  document.getElementById('listsTab').style.display = 'none';
  
  // Show selected tab
  if (tabName === 'search') {
    document.getElementById('searchTab').style.display = 'block';
  } else if (tabName === 'hub') {
    document.getElementById('hubModeTab').style.display = 'block';
  } else if (tabName === 'lists') {
    document.getElementById('listsTab').style.display = 'block';
    displayLists();
  }
}

function fetchClearData() {
  if (discordId) {
    fetch("sh-dump/clears.json")
      .then((response) => response.json())
      .then((data) => {
        clearData = data.filter((clear) => clear.jumper === discordId);
        displayData(filteredData);
      })
      .catch((error) => {
        console.error("Error fetching clear data:", error);
      });
  }
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
    const puzzleNameMatch = puzzle.PuzzleName.toLowerCase().includes(searchQuery);
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
      return sortOrder === "asc" ? a.PuzzleName.localeCompare(b.PuzzleName) : b.PuzzleName.localeCompare(a.PuzzleName);
    } else if (sortBy === "rating") {
      const ratingA = isNaN(parseInt(a.Rating)) ? 1 : parseInt(a.Rating);
      const ratingB = isNaN(parseInt(b.Rating)) ? 1 : parseInt(b.Rating);
      return sortOrder === "asc" ? ratingA - ratingB : ratingB - ratingA;
    }
  });
  displayData(filteredData);
}

function isPuzzleCleared(puzzleId) {
  return clearData.some((clear) => clear.puzzleId === puzzleId);
}

function createPuzzleCard(puzzle) {
  const infoCard = document.createElement("div");
  infoCard.className = "info-card";
  if (isPuzzleCleared(puzzle.ID)) {
    infoCard.classList.add("cleared");
  }
  infoCard.innerHTML = `
    <h3>${puzzle.PuzzleName} by ${puzzle.Builder} ${getStarRating(puzzle.Rating)} [${getTags(puzzle)}]</h3>
    ${puzzle.GoalsRules && puzzle.GoalsRules !== "-" ? `<p><strong>Goals/Rules:</strong> ${puzzle.GoalsRules}</p>` : ""}
    <p>${puzzle.Datacenter}, ${puzzle.World} - ${puzzle.Address}</p>
    <div class="card-footer">
      <span class="puzzle-id">${puzzle.ID}</span>
      <div class="action-buttons">
        <div class="action-button jump-button" data-puzzle-id="${puzzle.ID}" data-tooltip="Copy clear command"></div>
        <div class="action-button sprint-button" data-puzzle-id="${puzzle.ID}" data-world="${puzzle.World}" data-district="${puzzle.District}" data-ward="${puzzle.Ward}" data-plot="${puzzle.Plot}" data-room="${puzzle.Room}" data-tooltip="Copy lifestream command"></div>
      </div>
    </div>
    ${exportMode ? `<div class="checkbox-container"><input type="checkbox" data-puzzle-id="${puzzle.ID}" ${selectedPuzzles.includes(puzzle.ID) ? 'checked' : ''}></div>` : ""}
  `;
  
  if (selectedPuzzles.includes(puzzle.ID)) {
    infoCard.classList.add("selected");
  }
  
  return infoCard;
}

function createPuzzleListItem(puzzle) {
  const listItem = document.createElement("div");
  listItem.className = "list-item";
  if (isPuzzleCleared(puzzle.ID)) {
    listItem.classList.add("cleared");
  }
  
  const tags = getTags(puzzle);
  const tagsDisplay = tags ? ` [${tags}]` : '';
  
  listItem.innerHTML = `
    <div class="list-item-info">
      ${getStarRating(puzzle.Rating)} ${puzzle.PuzzleName} by ${puzzle.Builder}${tagsDisplay} (${puzzle.Datacenter}, ${puzzle.World} - ${puzzle.Address})
    </div>
    <div class="list-item-actions">
      <div class="action-button copy-button" data-puzzle="${JSON.stringify(puzzle).replace(/"/g, '&quot;')}" data-tooltip="Copy formatted text"></div>
      <div class="action-button jump-button" data-puzzle-id="${puzzle.ID}" data-tooltip="Copy clear command"></div>
      <div class="action-button sprint-button" data-puzzle-id="${puzzle.ID}" data-world="${puzzle.World}" data-district="${puzzle.District}" data-ward="${puzzle.Ward}" data-plot="${puzzle.Plot}" data-room="${puzzle.Room}" data-tooltip="Copy lifestream command"></div>
    </div>
  `;
  
  return listItem;
}

function attachActionButtonListeners(container) {
  const jumpButtons = container.querySelectorAll(".jump-button");
  const sprintButtons = container.querySelectorAll(".sprint-button");
  const copyButtons = container.querySelectorAll(".copy-button");

  jumpButtons.forEach((button) => {
    button.addEventListener("click", handleJumpButtonClick);
    button.addEventListener("mouseenter", showTooltip);
    button.addEventListener("mouseleave", hideTooltip);
  });

  sprintButtons.forEach((button) => {
    button.addEventListener("click", handleSprintButtonClick);
    button.addEventListener("mouseenter", showTooltip);
    button.addEventListener("mouseleave", hideTooltip);
  });
  
  copyButtons.forEach((button) => {
    button.addEventListener("click", handleCopyButtonClick);
    button.addEventListener("mouseenter", showTooltip);
    button.addEventListener("mouseleave", hideTooltip);
  });
}

function displayData(data) {
  const container = document.getElementById("puzzleContainer");
  container.innerHTML = "";

  data.forEach((puzzle) => {
    const infoCard = createPuzzleCard(puzzle);
    container.appendChild(infoCard);
  });

  updatePuzzlesFound();

  if (exportMode) {
    const checkboxes = document.querySelectorAll('#puzzleContainer .checkbox-container input[type="checkbox"]');
    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", handlePuzzleSelection);
    });
  }

  attachActionButtonListeners(container);
}

function openDiscordIdModal() {
  const modal = document.getElementById("discordIdModal");
  modal.style.display = "block";
}

function closeDiscordIdModal() {
  const modal = document.getElementById("discordIdModal");
  modal.style.display = "none";
}

function saveDiscordId() {
  const input = document.getElementById("discordIdInput");
  discordId = input.value.trim();
  localStorage.setItem("discordId", discordId);
  updateDiscordIdDisplay();
  closeDiscordIdModal();
  fetchClearData();
}

function updateDiscordIdDisplay() {
  const discordIdDisplay = document.getElementById("discordIdDisplay");
  if (discordId) {
    discordIdDisplay.textContent = `Discord ID: ${discordId}`;
  } else {
    discordIdDisplay.textContent = "";
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
    const listItem = createPuzzleListItem(puzzle);
    modalContent.appendChild(listItem);
  });

  attachActionButtonListeners(modalContent);
  
  const modal = document.getElementById("rouletteModal");
  modal.style.display = "block";
}

function closeModal() {
  const modal = document.getElementById("rouletteModal");
  modal.style.display = "none";
}

function copyToClipboard() {
  const modalContent = document.getElementById("modalContent");
  const listItems = modalContent.querySelectorAll(".list-item");
  let markdownText = "**Duty Roulette**\n\n";

  listItems.forEach((item) => {
    const infoText = item.querySelector(".list-item-info").textContent;
    markdownText += "```prolog\n";
    markdownText += infoText + "\n";
    markdownText += "```\n";
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
  
  // Update all export mode buttons and button containers
  const searchExportButton = document.getElementById("exportModeButton");
  const searchExportButtons = document.getElementById("exportButtons");
  const hubExportButton = document.getElementById("hubExportModeButton");
  const hubExportButtons = document.getElementById("hubExportButtons");
  
  const buttonText = exportMode ? "Disable Selection Mode" : "Enable Selection Mode";
  const buttonsDisplay = exportMode ? "inline-block" : "none";
  
  searchExportButton.textContent = buttonText;
  searchExportButtons.style.display = buttonsDisplay;
  hubExportButton.textContent = buttonText;
  hubExportButtons.style.display = buttonsDisplay;
  
  // Refresh current tab display
  if (currentTab === "search") {
    displayData(filteredData);
  } else if (currentTab === "hub") {
    filterByHub();
  }
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

function handleJumpButtonClick(event) {
  const puzzleId = event.target.dataset.puzzleId;
  const clearCommand = `/clear puzzleids: ${puzzleId}`;
  copyToClipboard(clearCommand);
}

function handleSprintButtonClick(event) {
  const world = event.target.dataset.world;
  const district = event.target.dataset.district;
  const ward = event.target.dataset.ward;
  const plot = event.target.dataset.plot;
  const room = event.target.dataset.room;
  let lifeStreamCommand = "";

  if (plot === "A1" || plot === "A2") {
    // This is an apartment
    const isSubdivision = plot === "A2";
    lifeStreamCommand = `/li ${world} ${district} w${ward}${isSubdivision ? " s" : ""} a${room}`;
  } else if (plot && plot !== "-") {
    // This is a house plot
    lifeStreamCommand = `/li ${world} ${district} w${ward} p${plot}`;
  }

  copyToClipboard(lifeStreamCommand);
}

function handleCopyButtonClick(event) {
  const puzzle = JSON.parse(event.target.dataset.puzzle);
  const tags = getTags(puzzle);
  const tagsDisplay = tags ? ` [${tags}]` : '';
  const formattedText = `${getStarRating(puzzle.Rating)} ${puzzle.PuzzleName} by ${puzzle.Builder}${tagsDisplay} (${puzzle.Address})`;
  copyToClipboard(formattedText);
}

function copyToClipboard(text) {
  const tempElement = document.createElement("textarea");
  tempElement.value = text;
  document.body.appendChild(tempElement);
  tempElement.select();
  document.execCommand("copy");
  document.body.removeChild(tempElement);
}

function showTooltip(event) {
  const tooltip = document.getElementById("tooltip");
  tooltip.textContent = event.target.dataset.tooltip;
  tooltip.style.left = `${event.pageX + 10}px`;
  tooltip.style.top = `${event.pageY + 10}px`;
  tooltip.style.opacity = 1;
}

function hideTooltip() {
  const tooltip = document.getElementById("tooltip");
  tooltip.style.opacity = 0;
}

window.onclick = function (event) {
  const rouletteModal = document.getElementById("rouletteModal");
  const listCreationModal = document.getElementById("listCreationModal");
  
  if (event.target === rouletteModal) {
    closeModal();
  } else if (event.target === listCreationModal) {
    closeListCreationModal();
  }
};

// Hub Mode Functions
function populateHubWorlds() {
  const worldSelect = document.getElementById("hubWorld");
  const worlds = [...new Set(puzzleData.map((puzzle) => puzzle.World))].sort();
  
  worlds.forEach((world) => {
    const option = document.createElement("option");
    option.value = world;
    option.textContent = world;
    worldSelect.appendChild(option);
  });
}

function updateHubDistricts() {
  const worldSelect = document.getElementById("hubWorld");
  const districtSelect = document.getElementById("hubDistrict");
  const wardSelect = document.getElementById("hubWard");
  
  // Clear existing options
  districtSelect.innerHTML = '<option value="">Select a district</option>';
  wardSelect.innerHTML = '<option value="">Select a ward</option>';
  
  if (worldSelect.value) {
    const districts = [...new Set(puzzleData
      .filter((puzzle) => puzzle.World === worldSelect.value)
      .map((puzzle) => puzzle.District))].sort();
    
    districts.forEach((district) => {
      const option = document.createElement("option");
      option.value = district;
      option.textContent = district;
      districtSelect.appendChild(option);
    });
  }
  
  document.getElementById("hubPuzzleContainer").innerHTML = "";
  document.getElementById("hubPuzzlesFound").textContent = "";
}

function updateHubWards() {
  const worldSelect = document.getElementById("hubWorld");
  const districtSelect = document.getElementById("hubDistrict");
  const wardSelect = document.getElementById("hubWard");
  
  // Clear existing options
  wardSelect.innerHTML = '<option value="">Select a ward</option>';
  
  if (worldSelect.value && districtSelect.value) {
    const wards = [...new Set(puzzleData
      .filter((puzzle) => puzzle.World === worldSelect.value && puzzle.District === districtSelect.value)
      .map((puzzle) => puzzle.Ward))].sort((a, b) => parseInt(a) - parseInt(b));
    
    wards.forEach((ward) => {
      const option = document.createElement("option");
      option.value = ward;
      option.textContent = `Ward ${ward}`;
      wardSelect.appendChild(option);
    });
  }
  
  document.getElementById("hubPuzzleContainer").innerHTML = "";
  document.getElementById("hubPuzzlesFound").textContent = "";
}

function filterByHub() {
  const worldSelect = document.getElementById("hubWorld");
  const districtSelect = document.getElementById("hubDistrict");
  const wardSelect = document.getElementById("hubWard");
  
  if (worldSelect.value && districtSelect.value && wardSelect.value) {
    const hubPuzzles = puzzleData.filter((puzzle) => 
      puzzle.World === worldSelect.value &&
      puzzle.District === districtSelect.value &&
      puzzle.Ward === wardSelect.value &&
      puzzle.Status === "Active"
    );
    
    displayHubPuzzles(hubPuzzles);
  }
}

function displayHubPuzzles(data) {
  const container = document.getElementById("hubPuzzleContainer");
  container.innerHTML = "";

  data.forEach((puzzle) => {
    const infoCard = createPuzzleCard(puzzle);
    container.appendChild(infoCard);
  });

  document.getElementById("hubPuzzlesFound").textContent = `Puzzles Found: ${data.length}`;

  if (exportMode) {
    const checkboxes = document.querySelectorAll('#hubPuzzleContainer .checkbox-container input[type="checkbox"]');
    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", handlePuzzleSelection);
    });
  }

  attachActionButtonListeners(container);
}

// Lists Functions
function createListFromSelection() {
  if (selectedPuzzles.length === 0) {
    showNotification("No puzzles selected. Please select some puzzles first.", "error");
    return;
  }
  
  openListCreationModal();
}

function openListCreationModal() {
  const modal = document.getElementById("listCreationModal");
  const description = document.getElementById("listCreationDescription");
  const input = document.getElementById("listNameInput");
  
  description.textContent = `Creating a list with ${selectedPuzzles.length} selected puzzle${selectedPuzzles.length === 1 ? '' : 's'}.`;
  input.value = "";
  modal.style.display = "block";
  input.focus();
  
  // Add keyboard event listeners
  input.addEventListener('keydown', handleListCreationKeydown);
  modal.addEventListener('keydown', handleListCreationKeydown);
}

function handleListCreationKeydown(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    saveNewList();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    closeListCreationModal();
  }
}

function closeListCreationModal() {
  const modal = document.getElementById("listCreationModal");
  const input = document.getElementById("listNameInput");
  
  // Remove event listeners
  input.removeEventListener('keydown', handleListCreationKeydown);
  modal.removeEventListener('keydown', handleListCreationKeydown);
  
  modal.style.display = "none";
}

function saveNewList() {
  const input = document.getElementById("listNameInput");
  const listName = input.value.trim();
  
  if (!listName) {
    showNotification("Please enter a name for your list.", "error");
    return;
  }
  
  if (lists[listName]) {
    if (!confirm(`A list named "${listName}" already exists. Do you want to replace it?`)) {
      return;
    }
  }
  
  const timestamp = new Date().toISOString();
  lists[listName] = {
    name: listName,
    puzzleIds: [...selectedPuzzles],
    created: timestamp
  };
  
  localStorage.setItem("puzzleLists", JSON.stringify(lists));
  showNotification(`List "${listName}" created with ${selectedPuzzles.length} puzzle${selectedPuzzles.length === 1 ? '' : 's'}.`, "success");
  clearSelection();
  closeListCreationModal();
  
  if (currentTab === 'lists') {
    displayLists();
  }
}

function displayLists() {
  const container = document.getElementById("listsContainer");
  container.innerHTML = "";
  
  const listNames = Object.keys(lists);
  if (listNames.length === 0) {
    container.innerHTML = '<p style="color: #ad9462;">No lists created yet. Use Selection Mode to create lists.</p>';
    return;
  }
  
  listNames.forEach((listName) => {
    const list = lists[listName];
    const listSection = document.createElement("div");
    listSection.className = "list-section";
    
    const listHeader = document.createElement("div");
    listHeader.className = "list-header";
    listHeader.innerHTML = `
      <h3>${listName} (${list.puzzleIds.length} puzzles)</h3>
      <div class="list-actions">
        <button onclick="copyList('${listName}')">Copy</button>
        <button onclick="deleteList('${listName}')">Delete</button>
      </div>
    `;
    
    const listItems = document.createElement("div");
    listItems.className = "list-items";
    listItems.id = `list-${listName.replace(/\s+/g, '-')}`;
    
    // Add puzzles to the list
    list.puzzleIds.forEach((puzzleId) => {
      const puzzle = puzzleData.find(p => p.ID === puzzleId);
      if (puzzle) {
        const listItem = createPuzzleListItem(puzzle);
        listItems.appendChild(listItem);
      }
    });
    
    listHeader.addEventListener("click", (e) => {
      if (!e.target.closest('button')) {
        listItems.classList.toggle("expanded");
      }
    });
    
    listSection.appendChild(listHeader);
    listSection.appendChild(listItems);
    container.appendChild(listSection);
    
    attachActionButtonListeners(listItems);
  });
}

function deleteList(listName) {
  if (confirm(`Are you sure you want to delete the list "${listName}"?`)) {
    delete lists[listName];
    localStorage.setItem("puzzleLists", JSON.stringify(lists));
    displayLists();
  }
}

// Notification System
function showNotification(message, type = 'info') {
  // Remove any existing notifications
  const existingNotification = document.querySelector('.notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Trigger animation
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // Auto remove after 4 seconds
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
  }, 4000);
}

function copyList(listName) {
  const list = lists[listName];
  if (!list) return;
  
  let formattedText = `**${listName}**\n\n`;
  
  list.puzzleIds.forEach((puzzleId) => {
    const puzzle = puzzleData.find(p => p.ID === puzzleId);
    if (puzzle) {
      const tags = getTags(puzzle);
      const tagsDisplay = tags ? ` [${tags}]` : '';
      formattedText += `- ${puzzleId}: ${getStarRating(puzzle.Rating)} ${puzzle.PuzzleName} by ${puzzle.Builder}${tagsDisplay} (${puzzle.Address})\n`;
    }
  });
  
  copyToClipboard(formattedText);
  showNotification(`List "${listName}" copied to clipboard`, "success");
}

function exportAllLists() {
  const listNames = Object.keys(lists);
  if (listNames.length === 0) {
    showNotification("No lists to export", "error");
    return;
  }
  
  let exportData = "**All Puzzle Lists**\n\n";
  
  listNames.forEach((listName) => {
    const list = lists[listName];
    exportData += `**${listName}**\n`;
    
    list.puzzleIds.forEach((puzzleId) => {
      const puzzle = puzzleData.find(p => p.ID === puzzleId);
      if (puzzle) {
        const tags = getTags(puzzle);
        const tagsDisplay = tags ? ` [${tags}]` : '';
        exportData += `- ${puzzleId}: ${getStarRating(puzzle.Rating)} ${puzzle.PuzzleName} by ${puzzle.Builder}${tagsDisplay} (${puzzle.Address})\n`;
      }
    });
    
    exportData += "\n";
  });
  
  copyToClipboard(exportData);
  showNotification(`All ${listNames.length} lists exported to clipboard`, "success");
}

function importListFromClipboard() {
  navigator.clipboard.readText().then(text => {
    // Try to parse as individual list format first
    if (parseIndividualList(text)) {
      return;
    }
    
    // Try to parse as export all format
    if (parseAllListsFormat(text)) {
      return;
    }
    
    // Try to parse as JSON format (backup/manual)
    parseJSONFormat(text);
  }).catch(() => {
    // Silently fail as requested - no error messages
  });
}

function parseIndividualList(text) {
  // Match format: **ListName** followed by lines with "- ID: puzzle info"
  const listNameMatch = text.match(/^\*\*(.+?)\*\*/);
  if (!listNameMatch) return false;
  
  const listName = listNameMatch[1].trim();
  const lines = text.split('\n');
  const puzzleIds = [];
  
  let foundPuzzles = false;
  for (const line of lines) {
    const puzzleMatch = line.match(/^-\s+(\d{5}):/);
    if (puzzleMatch) {
      puzzleIds.push(puzzleMatch[1]);
      foundPuzzles = true;
    }
  }
  
  if (foundPuzzles && puzzleIds.length > 0) {
    // Validate that puzzles exist
    const validPuzzleIds = puzzleIds.filter(id => puzzleData.find(p => p.ID === id));
    
    if (validPuzzleIds.length > 0) {
      const timestamp = new Date().toISOString();
      lists[listName] = {
        name: listName,
        puzzleIds: validPuzzleIds,
        created: timestamp
      };
      
      localStorage.setItem("puzzleLists", JSON.stringify(lists));
      showNotification(`Imported list "${listName}" with ${validPuzzleIds.length} puzzles`, "success");
      
      if (currentTab === 'lists') {
        displayLists();
      }
      return true;
    }
  }
  
  return false;
}

function parseAllListsFormat(text) {
  // Match format: **All Puzzle Lists** followed by multiple **ListName** sections
  if (!text.includes('**All Puzzle Lists**')) return false;
  
  const sections = text.split(/\*\*([^*]+)\*\*/);
  let importedCount = 0;
  
  for (let i = 2; i < sections.length; i += 2) {
    const listName = sections[i - 1].trim();
    const listContent = sections[i];
    
    if (listName === 'All Puzzle Lists') continue;
    
    const lines = listContent.split('\n');
    const puzzleIds = [];
    
    for (const line of lines) {
      const puzzleMatch = line.match(/^-\s+(\d{5}):/);
      if (puzzleMatch) {
        puzzleIds.push(puzzleMatch[1]);
      }
    }
    
    if (puzzleIds.length > 0) {
      const validPuzzleIds = puzzleIds.filter(id => puzzleData.find(p => p.ID === id));
      
      if (validPuzzleIds.length > 0) {
        const timestamp = new Date().toISOString();
        lists[listName] = {
          name: listName,
          puzzleIds: validPuzzleIds,
          created: timestamp
        };
        importedCount++;
      }
    }
  }
  
  if (importedCount > 0) {
    localStorage.setItem("puzzleLists", JSON.stringify(lists));
    showNotification(`Imported ${importedCount} lists`, "success");
    
    if (currentTab === 'lists') {
      displayLists();
    }
    return true;
  }
  
  return false;
}

function parseJSONFormat(text) {
  try {
    const importedLists = JSON.parse(text);
    let importedCount = 0;
    
    for (const [listName, listData] of Object.entries(importedLists)) {
      if (listData.puzzleIds && Array.isArray(listData.puzzleIds)) {
        const validPuzzleIds = listData.puzzleIds.filter(id => puzzleData.find(p => p.ID === id));
        
        if (validPuzzleIds.length > 0) {
          lists[listName] = {
            name: listData.name || listName,
            puzzleIds: validPuzzleIds,
            created: listData.created || new Date().toISOString()
          };
          importedCount++;
        }
      }
    }
    
    if (importedCount > 0) {
      localStorage.setItem("puzzleLists", JSON.stringify(lists));
      showNotification(`Imported ${importedCount} lists from JSON`, "success");
      
      if (currentTab === 'lists') {
        displayLists();
      }
      return true;
    }
  } catch (e) {
    // Silently fail
  }
  
  return false;
}

// Make functions accessible globally for onclick
window.deleteList = deleteList;
window.closeListCreationModal = closeListCreationModal;
window.saveNewList = saveNewList;
window.copyList = copyList;
window.exportAllLists = exportAllLists;
window.importListFromClipboard = importListFromClipboard;
