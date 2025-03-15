/* script.js */
const fullViewDepts = ["OP", "GR", "IPL", "EXP", "RET"];
const departmentStandardRoles = {
  "OP": ["Supervisor", "Mentor", "Admin", "QC", "Cleaning", "Training", "Wrap", "RCB", "Pick", "Pausa"],
  "GR": ["Supervisor", "Admin", "Training", "Crossdock", "Employee", "Container"],
  "IPL": ["Supervisor", "Reacher", "Training", "Cleaner"],
  "EXP": ["Supervisor", "Employee", "Crossdock"],
  "RET": ["Supervisor", "Admin", "Employee"]
};
const defaultUnexpectedRoles = ["Abs (np)", "Abs (p)", "Near Miss", "Malessere", "ROL"];
const defaultExtraRoles = ["GR", "IPL", "EXP", "SC", "RET"];

let departmentGrids = {}; // grid separate per ogni dipartimento full view
let currentDept = "OP";
const END_HOUR = 23.5;
const START_HOUR = 6;

function loadGrid(dept) {
  const saved = localStorage.getItem("grid_" + dept);
  return saved ? JSON.parse(saved) : null;
}
function saveGrid(dept, gridData) {
  localStorage.setItem("grid_" + dept, JSON.stringify(gridData));
}
function initGridForDept(dept) {
  const saved = loadGrid(dept);
  if (saved) {
    departmentGrids[dept] = saved;
  } else {
    const headers = ['Nome', 'Cancella'];
    const cols = (END_HOUR - START_HOUR) * 4;
    for (let i = 0; i < cols; i++) {
      const hour = START_HOUR + Math.floor(i / 4);
      const minute = (i % 4) * 15;
      headers.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    }
    const grid = Array.from({ length: 250 }, () => Array(headers.length).fill(""));
    grid.unshift(headers);
    departmentGrids[dept] = grid;
    saveGrid(dept, grid);
  }
}
function initAllGrids() {
  fullViewDepts.forEach(dept => initGridForDept(dept));
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('loginUsername').value.trim();
    const pass = document.getElementById('loginPassword').value;
    // Aggiunti nuovi account: r.castrovilli ed e.doria
    if ((user === "v.scatizza" || user === "a.stefanini" || user === "r.castrovilli" || user === "e.doria") && pass === "1234") {
      alert("Credenziali corrette");
      document.getElementById('loginOverlay').style.display = "none";
    } else {
      alert("Credenziali incorrette");
    }
  });
  initAllGrids();
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const t = tab.getAttribute("data-tab");
      switchTab(t);
    });
  });
  switchTab("OP");
  setInterval(updateSummary, 5000);
});

function updateControlHeading(dept) {
  const heading = document.getElementById("controlHeading");
  let html = "";
  if (dept === "OP") {
    html = `<i class="fas fa-box"></i> Orderpick`;
  } else if (dept === "GR") {
    html = `<i class="fas fa-barcode"></i> Good Receipt`;
  } else if (dept === "IPL") {
    html = `<i class="fas fa-forklift"></i> IPL`;
  } else if (dept === "EXP") {
    html = `<i class="fas fa-truck"></i> Expedition`;
  } else if (dept === "RET") {
    html = `<i class="fas fa-trash-alt"></i> Returns`;
  }
  heading.innerHTML = html;
}

function updateRoleDropdown(dept) {
  const select = document.getElementById("targetRole");
  let stdRoles = (dept in departmentStandardRoles) ? departmentStandardRoles[dept] : departmentStandardRoles["OP"];
  let html = `<optgroup label="Standard Hours">`;
  stdRoles.forEach(r => { html += `<option value="${r}">${r}</option>`; });
  html += `</optgroup><optgroup label="Unexpected Hours">`;
  defaultUnexpectedRoles.forEach(r => { html += `<option value="${r}">${r}</option>`; });
  html += `</optgroup><optgroup label="Extra Hours">`;
  defaultExtraRoles.concat(["OP"]).forEach(r => { html += `<option value="${r}">${r}</option>`; });
  html += `</optgroup>`;
  select.innerHTML = html;
}

function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const clicked = document.querySelector(`.tab[data-tab="${tabName}"]`);
  if (clicked) clicked.classList.add('active');
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  if (tabName === "Main") {
    document.getElementById("mainView").classList.remove("hidden");
    updateSummary();
  } else if (fullViewDepts.includes(tabName)) {
    currentDept = tabName;
    updateControlHeading(currentDept);
    updateRoleDropdown(currentDept);
    renderGridForDept(currentDept);
    updateSummary();
    document.getElementById("opView").classList.remove("hidden");
  } else {
    document.getElementById("devView").classList.remove("hidden");
  }
}

function renderGridForDept(dept) {
  const grid = document.getElementById("grid");
  let data = departmentGrids[dept];
  const cols = (END_HOUR - START_HOUR) * 4;
  grid.style.gridTemplateColumns = `150px 80px repeat(${cols}, 80px)`;
  grid.innerHTML = data.flatMap((row, ri) =>
    row.map((cell, ci) => {
      const cls = (ri === 0) ? "" : getRoleClass(cell);
      return `<div class="${ri === 0 ? 'header-cell' : 'cell'} ${cls}" data-row="${ri}" data-col="${ci}" 
        ${ri > 0 && ci > 1 ? 'contenteditable="true" oninput="updateCell('+ri+','+ci+',this.innerText)"' : ''}>
        ${ri === 0 ? cell : cell}
        ${ri > 0 && ci === 1 ? `<button class="delete-row" onclick="deleteRow(${ri})">X</button>` : ''}
        </div>`;
    }).join("")
  ).join("");
}

function getRoleClass(value) {
  if (!value) return "";
  const mapping = { "near miss": "near-miss", "abs (np)": "abs-np", "abs (p)": "abs-p" };
  let key = value.toLowerCase();
  if (mapping[key]) {
    return "role-" + mapping[key];
  } else {
    let safeValue = value.replace(/\s+/g, '-').replace(/\(|\)/g, '');
    return "role-" + safeValue.toLowerCase();
  }
}

function allocateShifts() {
  showLoading();
  setTimeout(() => {
    const startTime = parseTime(document.getElementById('startTime').value);
    const endTime = parseTime(document.getElementById('endTime').value);
    const targetRole = document.getElementById('targetRole').value;
    const names = document.getElementById('names').value.split('\n').map(n => n.trim()).filter(n => n);
    if (!startTime || !endTime || !targetRole || names.length === 0 || !validateTime(startTime) || !validateTime(endTime)) {
      alert("Dati mancanti o non validi!");
      hideLoading();
      return;
    }
    const startCol = Math.round((startTime - START_HOUR) * 4);
    const endCol = Math.round((endTime - START_HOUR) * 4);
    let grid = departmentGrids[currentDept];
    names.forEach(name => {
      let rowIndex = grid.findIndex((r, idx) => idx > 0 && r[0].toLowerCase() === name.toLowerCase());
      if (rowIndex === -1) {
        rowIndex = grid.findIndex((r, idx) => idx > 0 && r[0] === "");
        if (rowIndex === -1) return;
        grid[rowIndex][0] = name;
      }
      for (let col = startCol; col < endCol; col++) {
        grid[rowIndex][col + 2] = targetRole;
      }
    });
    saveGrid(currentDept, grid);
    renderGridForDept(currentDept);
    updateSummary();
    hideLoading();
  }, 300);
}

function deleteRow(row) {
  let grid = departmentGrids[currentDept];
  grid[row] = Array.from({ length: grid[0].length }, () => "");
  saveGrid(currentDept, grid);
  renderGridForDept(currentDept);
  updateSummary();
}

function clearAll() {
  let grid = departmentGrids[currentDept];
  grid = grid.map((r, i) => i === 0 ? r : r.map(() => ""));
  departmentGrids[currentDept] = grid;
  saveGrid(currentDept, grid);
  renderGridForDept(currentDept);
  updateSummary();
}

function parseTime(t) {
  const parts = t.split(":").map(Number);
  if (parts.length < 2) return null;
  return parts[0] + (parts[1] / 60);
}

function validateTime(time) {
  return time >= START_HOUR && time <= END_HOUR;
}

function updateCell(row, col, value) {
  let grid = departmentGrids[currentDept];
  grid[row][col] = value;
  saveGrid(currentDept, grid);
  renderGridForDept(currentDept);
  updateSummary();
}

function exportData() {
  const grid = departmentGrids[currentDept];
  const csv = grid.map(r => r.join(";")).join("\n");
  downloadCSV(csv, "shift_allocations_" + currentDept + ".csv");
}

function downloadCSV(data, filename) {
  const blob = new Blob([data], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

function showLoading() {
  document.getElementById("loadingOverlay").style.display = "flex";
}
function hideLoading() {
  document.getElementById("loadingOverlay").style.display = "none";
}

function showHelp() {
  alert(`Guida rapida:
1. Inserisci l'orario di inizio e fine (es. 09:00 - 17:00)
2. Seleziona il ruolo (il menu si aggiorna in base al dipartimento)
3. Inserisci i nomi (uno per riga)
4. Clicca "Alloca" per assegnare i turni`);
}

function showUpdateNotes() {
  alert(`v1.3 (20/03/2025)

- (fun) Su Main, la schermata dei dipartimenti ora mostra per ogni dipartimento tre riquadri (Standard Hours, Unexpected Hours ed Extra Hours) come nella Full View.
- (fun) Aggiunti nuovi account: r.castrovilli ed e.doria (password "1234").
- (fun) Modifiche grafiche per una presentazione ordinata.`);
}

/* Aggiorna il riepilogo ore */
function updateSummary() {
  // Aggiorna riepilogo nella Full View
  if (document.getElementById("standardSummary")) {
    let grid = departmentGrids[currentDept];
    const roleHours = {};
    grid.slice(1).forEach(row => {
      row.slice(2).forEach(cell => {
        if(cell) roleHours[cell] = (roleHours[cell] || 0) + 0.25;
      });
    });
    fillSummaryBlocks(roleHours, "standardSummary", "unexpectedSummary", "extraSummary");
  }
  // Aggiorna riepilogo per ogni dipartimento nella Main Dashboard
  fullViewDepts.forEach(dept => {
    let grid = departmentGrids[dept];
    const roleHours = {};
    grid.slice(1).forEach(row => {
      row.slice(2).forEach(cell => {
        if(cell) roleHours[cell] = (roleHours[cell] || 0) + 0.25;
      });
    });
    if (document.getElementById("dept" + dept)) {
      document.getElementById("dept" + dept).innerHTML = generateDeptSummary(dept, roleHours);
    }
  });
  // Riepilogo complessivo per la Main Dashboard
  if(document.getElementById("overallSummary")){
    let overallHTML = "<table><tr><th>Dipartimento</th><th>Standard</th><th>Unexpected</th><th>Extra</th></tr>";
    ["PC","SC","GR","OP","IPL","EXP","RET"].forEach(dept => {
      let std = "00:00", unx = "00:00", ext = "00:00";
      if (fullViewDepts.includes(dept)) {
        let grid = departmentGrids[dept];
        const roleHours = {};
        grid.slice(1).forEach(row => {
          row.slice(2).forEach(cell => {
            if(cell) roleHours[cell] = (roleHours[cell] || 0) + 0.25;
          });
        });
        let roles = (dept in departmentStandardRoles) ? departmentStandardRoles[dept] : [];
        std = convertHoursToHHMM(sumCategory(roleHours, roles));
        unx = convertHoursToHHMM(sumCategory(roleHours, defaultUnexpectedRoles));
        ext = convertHoursToHHMM(sumCategory(roleHours, defaultExtraRoles.concat(["OP"])));
      }
      overallHTML += `<tr><td>${dept}</td><td>${std}</td><td>${unx}</td><td>${ext}</td></tr>`;
    });
    overallHTML += "</table>";
    document.getElementById("overallSummary").innerHTML = overallHTML;
  }
}

function generateDeptSummary(dept, roleHours) {
  let stdRoles = (dept in departmentStandardRoles) ? departmentStandardRoles[dept] : [];
  
  let standardHTML = "<ul>";
  stdRoles.forEach(r => {
    let hrs = roleHours[r] || 0;
    standardHTML += `<li>${r}: ${convertHoursToHHMM(hrs)}</li>`;
  });
  standardHTML += "</ul>";
  
  let unexpectedHTML = "<ul>";
  defaultUnexpectedRoles.forEach(r => {
    let hrs = roleHours[r] || 0;
    unexpectedHTML += `<li>${r}: ${convertHoursToHHMM(hrs)}</li>`;
  });
  unexpectedHTML += "</ul>";
  
  let extraHTML = "<ul>";
  defaultExtraRoles.concat(["OP"]).forEach(r => {
    let hrs = roleHours[r] || 0;
    extraHTML += `<li>${r}: ${convertHoursToHHMM(hrs)}</li>`;
  });
  extraHTML += "</ul>";
  
  return `<div class="dept-summary-box">
      <div class="summary-box standard">
         <h4>Standard Hours</h4>
         ${standardHTML}
      </div>
      <div class="summary-box unexpected">
         <h4>Unexpected Hours</h4>
         ${unexpectedHTML}
      </div>
      <div class="summary-box extra">
         <h4>Extra Hours</h4>
         ${extraHTML}
      </div>
  </div>`;
}

function fillSummaryBlocks(roleHours, stdId, unxId, extId) {
  const stdDiv = document.getElementById(stdId);
  const unxDiv = document.getElementById(unxId);
  const extDiv = document.getElementById(extId);
  if (!stdDiv || !unxDiv || !extDiv) return;
  stdDiv.innerHTML = '';
  unxDiv.innerHTML = '';
  extDiv.innerHTML = '';
  let standardHTML = '<h3>Standard Hours</h3>';
  departmentStandardRoles["OP"].forEach(role => {
    if (roleHours[role]) {
      standardHTML += `<div>${role}: ${convertHoursToHHMM(roleHours[role])}</div>`;
    }
  });
  stdDiv.innerHTML = standardHTML;
  let unexpectedHTML = '<h3>Unexpected Hours</h3>';
  defaultUnexpectedRoles.forEach(role => {
    if (roleHours[role]) {
      unexpectedHTML += `<div>${role}: ${convertHoursToHHMM(roleHours[role])}</div>`;
    }
  });
  unxDiv.innerHTML = unexpectedHTML;
  let extraHTML = '<h3>Extra Hours</h3>';
  defaultExtraRoles.concat(["OP"]).forEach(role => {
    if (roleHours[role]) {
      extraHTML += `<div>${role}: ${convertHoursToHHMM(roleHours[role])}</div>`;
    }
  });
  extDiv.innerHTML = extraHTML;
}

function sumCategory(roleHours, rolesArray) {
  let sum = 0;
  rolesArray.forEach(r => { if (roleHours[r]) sum += roleHours[r]; });
  return sum;
}

function convertHoursToHHMM(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function exportSummary() {
  const roleHours = {};
  departmentGrids["OP"].slice(1).forEach(row => {
    row.slice(2).forEach(cell => {
      if (cell) roleHours[cell] = (roleHours[cell] || 0) + 0.25;
    });
  });
  const lines = [];
  lines.push("Standard Hours");
  departmentStandardRoles["OP"].forEach(r => {
    if (roleHours[r]) lines.push(`${r};${convertHoursToHHMM(roleHours[r])}`);
  });
  lines.push("");
  lines.push("Unexpected Hours");
  defaultUnexpectedRoles.forEach(r => {
    if (roleHours[r]) lines.push(`${r};${convertHoursToHHMM(roleHours[r])}`);
  });
  lines.push("");
  lines.push("Extra Hours");
  defaultExtraRoles.concat(["OP"]).forEach(r => {
    if (roleHours[r]) lines.push(`${r};${convertHoursToHHMM(roleHours[r])}`);
  });
  downloadCSV(lines.join("\n"), "riepilogo_ore.csv");
}

function exportMainDashboard() {
  let csv = "Dipartimento;Categoria;Ruolo;Ore\n";
  const departments = ["PC","SC","GR","OP","IPL","EXP","RET"];
  departments.forEach(dept => {
    let grid = fullViewDepts.includes(dept) ? departmentGrids[dept] : null;
    const roleHours = {};
    if (grid) {
      grid.slice(1).forEach(row => {
        row.slice(2).forEach(cell => {
          if (cell) roleHours[cell] = (roleHours[cell] || 0) + 0.25;
        });
      });
    }
    let stdRoles = (dept in departmentStandardRoles) ? departmentStandardRoles[dept] : [];
    stdRoles.forEach(r => {
      let hrs = grid ? (roleHours[r] || 0) : 0;
      csv += `${dept};Standard;${r};${convertHoursToHHMM(hrs)}\n`;
    });
    defaultUnexpectedRoles.forEach(r => {
      csv += `${dept};Unexpected;${r};${grid ? convertHoursToHHMM(roleHours[r] || 0) : "00:00"}\n`;
    });
    defaultExtraRoles.concat(["OP"]).forEach(r => {
      csv += `${dept};Extra;${r};${grid ? convertHoursToHHMM(roleHours[r] || 0) : "00:00"}\n`;
    });
  });
  downloadCSV(csv, "main_dashboard.csv");
}

function downloadCSV(data, filename) {
  const blob = new Blob([data], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
