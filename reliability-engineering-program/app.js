const STORAGE_KEY = "reliabilityProgramTracker.v1";
const reviewLevels = ["Draft", "Supervisor Review", "Maintenance Review", "Reliability Engineer Review", "Operations Review", "Reliability Review Board", "Closed / Implemented"];

const defaultState = {
  equipment: [],
  workOrders: [],
  failures: [],
  reviews: []
};

let state = loadState();

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || structuredClone(defaultState); }
  catch { return structuredClone(defaultState); }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
const uid = () => crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
const fmt = value => value === undefined || value === null || value === "" ? "—" : value;
const num = value => Number(value || 0);

function init() {
  setupTabs();
  bindForms();
  bindActions();
  renderAll();
}

function setupTabs() {
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".panel").forEach(p => p.classList.remove("active-panel"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.tab).classList.add("active-panel");
    });
  });
}

function bindForms() {
  bindForm("equipmentForm", data => {
    state.equipment.push({ id: uid(), ...data, createdAt: new Date().toISOString() });
  });
  bindForm("woForm", data => {
    state.workOrders.push({ id: uid(), ...data, laborHours: num(data.laborHours), createdAt: new Date().toISOString() });
  });
  bindForm("failureForm", data => {
    state.failures.push({ id: uid(), ...data, downtimeHours: num(data.downtimeHours), createdAt: new Date().toISOString() });
  });
  bindForm("reviewForm", data => {
    state.reviews.push({ id: uid(), ...data, createdAt: new Date().toISOString() });
  });
}

function bindForm(formId, handler) {
  document.getElementById(formId).addEventListener("submit", event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target).entries());
    handler(data);
    saveState();
    event.target.reset();
    renderAll();
  });
}

function bindActions() {
  document.querySelectorAll("[data-trend]").forEach(btn => btn.addEventListener("click", () => renderTrend(btn.dataset.trend)));
  document.getElementById("generateSummaryBtn").addEventListener("click", generateSummary);
  document.getElementById("exportBtn").addEventListener("click", exportJson);
  document.getElementById("importInput").addEventListener("change", importJson);
  document.getElementById("clearBtn").addEventListener("click", () => {
    if (confirm("Clear all local reliability data? Export first if you need a backup.")) {
      state = structuredClone(defaultState); saveState(); renderAll();
    }
  });
  document.getElementById("seedDemoBtn").addEventListener("click", seedDemoData);
}

function renderAll() {
  renderKpis();
  renderEquipmentOptions();
  renderTable("equipmentTable", state.equipment, ["tag", "site", "area", "system", "asset", "component", "criticality", "owner"], "equipment");
  renderTable("woTable", state.workOrders, ["woNumber", "equipmentTag", "woType", "priority", "dateOpened", "dateClosed", "laborHours", "description"], "workOrders");
  renderTable("failureTable", state.failures, ["eventDate", "equipmentTag", "failureType", "failureMode", "mechanism", "downtimeHours", "consequence", "correctiveAction"], "failures");
  renderReviewTable();
  renderTrend("pareto");
}

function renderKpis() {
  const totalDowntime = state.failures.reduce((sum, f) => sum + num(f.downtimeHours), 0);
  const correctiveWOs = state.workOrders.filter(w => w.woType === "Corrective").length;
  const openReviews = state.reviews.filter(r => r.level !== "Closed / Implemented").length;
  const criticalAssets = state.equipment.filter(e => ["High", "Critical"].includes(e.criticality)).length;
  const mtbf = calculateMtbf();
  const kpis = [
    ["Equipment", state.equipment.length], ["Failures", state.failures.length], ["Downtime Hrs", totalDowntime.toFixed(1)],
    ["Corrective WOs", correctiveWOs], ["Open Reviews", openReviews], ["High/Critical Assets", criticalAssets], ["MTBF Est.", mtbf]
  ];
  document.getElementById("kpiGrid").innerHTML = kpis.map(([label, value]) => `<article class="kpi"><span>${label}</span><strong>${value}</strong></article>`).join("");
}

function renderEquipmentOptions() {
  const options = state.equipment.length
    ? state.equipment.map(e => `<option value="${escapeHtml(e.tag)}">${escapeHtml(e.tag)} — ${escapeHtml(e.asset || e.system || "")}</option>`).join("")
    : `<option value="Unassigned">Unassigned - add equipment first</option>`;
  document.getElementById("woEquipmentSelect").innerHTML = options;
  document.getElementById("failureEquipmentSelect").innerHTML = options;
}

function renderTable(targetId, rows, columns, collectionName) {
  if (!rows.length) { document.getElementById(targetId).innerHTML = `<p class="empty">No records yet.</p>`; return; }
  document.getElementById(targetId).innerHTML = `<table><thead><tr>${columns.map(c => `<th>${label(c)}</th>`).join("")}<th>Actions</th></tr></thead><tbody>${rows.map(row => `<tr>${columns.map(c => `<td>${escapeHtml(fmt(row[c]))}</td>`).join("")}<td><button onclick="deleteRow('${collectionName}','${row.id}')">Delete</button></td></tr>`).join("")}</tbody></table>`;
}

function renderReviewTable() {
  if (!state.reviews.length) { document.getElementById("reviewTable").innerHTML = `<p class="empty">No review items yet.</p>`; return; }
  const columns = ["title", "sourceType", "level", "owner", "dueDate", "notes"];
  document.getElementById("reviewTable").innerHTML = `<table><thead><tr>${columns.map(c => `<th>${label(c)}</th>`).join("")}<th>Advance</th><th>Actions</th></tr></thead><tbody>${state.reviews.map(row => `<tr>${columns.map(c => `<td>${c === "level" ? `<span class="badge">${escapeHtml(row[c])}</span>` : escapeHtml(fmt(row[c]))}</td>`).join("")}<td><button onclick="advanceReview('${row.id}')">Next Level</button></td><td><button onclick="deleteRow('reviews','${row.id}')">Delete</button></td></tr>`).join("")}</tbody></table>`;
}

function deleteRow(collectionName, id) {
  state[collectionName] = state[collectionName].filter(item => item.id !== id);
  saveState(); renderAll();
}

function advanceReview(id) {
  const item = state.reviews.find(r => r.id === id);
  const index = reviewLevels.indexOf(item.level);
  item.level = reviewLevels[Math.min(index + 1, reviewLevels.length - 1)];
  saveState(); renderAll();
}

function renderTrend(type) {
  const output = document.getElementById("trendOutput");
  const map = {
    pareto: () => groupedBar("Failure Pareto by Mode", groupCount(state.failures, "failureMode")),
    downtime: () => groupedBar("Downtime by Equipment", groupSum(state.failures, "equipmentTag", "downtimeHours"), "hrs"),
    type: () => groupedBar("Failure Type Mix", groupCount(state.failures, "failureType")),
    mtbf: () => mtbfTrend(),
    review: () => groupedBar("Cooperative Review Backlog", groupCount(state.reviews.filter(r => r.level !== "Closed / Implemented"), "level"))
  };
  output.innerHTML = map[type] ? map[type]() : "";
}

function groupedBar(title, data, suffix = "") {
  const entries = Object.entries(data).sort((a,b) => b[1]-a[1]);
  if (!entries.length) return `<h3>${title}</h3><p>No data available yet.</p>`;
  const max = Math.max(...entries.map(([,v]) => v));
  return `<h3>${title}</h3>${entries.map(([key, value]) => `<div class="bar-row"><strong>${escapeHtml(key || "Unspecified")}</strong><div class="bar" style="width:${Math.max((value/max)*100, 4)}%"></div><span>${value}${suffix ? " " + suffix : ""}</span></div>`).join("")}`;
}

function mtbfTrend() {
  const byAsset = groupDates(state.failures, "equipmentTag", "eventDate");
  const rows = Object.entries(byAsset).map(([asset, dates]) => {
    dates.sort();
    if (dates.length < 2) return [asset, "Need 2+ failures"];
    const first = new Date(dates[0]);
    const last = new Date(dates[dates.length - 1]);
    const days = Math.max((last - first) / 86400000, 1);
    return [asset, `${(days / (dates.length - 1)).toFixed(1)} days between failures`];
  });
  if (!rows.length) return `<h3>MTBF Estimate</h3><p>No failure data available yet.</p>`;
  return `<h3>MTBF Estimate</h3><table><thead><tr><th>Equipment</th><th>Estimate</th></tr></thead><tbody>${rows.map(r => `<tr><td>${escapeHtml(r[0])}</td><td>${escapeHtml(r[1])}</td></tr>`).join("")}</tbody></table>`;
}

function calculateMtbf() {
  if (state.failures.length < 2) return "—";
  const dates = state.failures.map(f => new Date(f.eventDate)).filter(d => !isNaN(d)).sort((a,b) => a-b);
  if (dates.length < 2) return "—";
  const days = Math.max((dates[dates.length - 1] - dates[0]) / 86400000, 1);
  return `${(days / (dates.length - 1)).toFixed(1)}d`;
}

function generateSummary() {
  const topMode = topEntry(groupCount(state.failures, "failureMode"));
  const topAsset = topEntry(groupSum(state.failures, "equipmentTag", "downtimeHours"));
  const topType = topEntry(groupCount(state.failures, "failureType"));
  const totalDowntime = state.failures.reduce((s, f) => s + num(f.downtimeHours), 0).toFixed(1);
  const openReviews = state.reviews.filter(r => r.level !== "Closed / Implemented");
  const correctiveWOs = state.workOrders.filter(w => w.woType === "Corrective").length;

  const summary = `RELIABILITY ENGINEERING ANALYSIS SUMMARY\nGenerated: ${new Date().toLocaleString()}\n\nPROGRAM SNAPSHOT\n- Equipment records: ${state.equipment.length}\n- Work orders: ${state.workOrders.length}\n- Corrective work orders: ${correctiveWOs}\n- Failure events: ${state.failures.length}\n- Total downtime: ${totalDowntime} hours\n- Open cooperative review items: ${openReviews.length}\n\nTOP RELIABILITY SIGNALS\n- Leading failure mode: ${topMode || "Not enough data"}\n- Highest downtime equipment: ${topAsset || "Not enough data"}\n- Most common failure type: ${topType || "Not enough data"}\n- Estimated MTBF: ${calculateMtbf()}\n\nENGINEERING INTERPRETATION\n${interpretation(topMode, topAsset, topType, openReviews)}\n\nRECOMMENDED NEXT ACTIONS\n1. Validate whether top failure modes are repeat failures or isolated events.\n2. Review high-downtime assets for PM optimization or design improvement.\n3. Convert repeat corrective work into documented reliability actions.\n4. Move open review items to the proper cooperative review level.\n5. Confirm whether failures need RCA, FMEA, lubrication review, PM task change, spare parts review, or operator training.\n\nCOOPERATIVE REVIEW BACKLOG\n${openReviews.length ? openReviews.map(r => `- ${r.title} | ${r.level} | Owner: ${fmt(r.owner)} | Due: ${fmt(r.dueDate)}`).join("\n") : "- No open review items."}\n`;
  document.getElementById("summaryOutput").value = summary;
}

function interpretation(topMode, topAsset, topType, openReviews) {
  if (!state.failures.length) return "Failure data has not been entered yet. Start by logging each functional failure event with mode, mechanism, downtime, consequence, and corrective action.";
  return `Current data suggests the strongest reliability focus should be on ${topAsset || "the assets with repeat downtime"}. The program should prioritize failure-mode validation, consequence ranking, and review closure discipline. ${openReviews.length ? "There are open cooperative review items that may block corrective action implementation." : "The review backlog is clear based on current records."}`;
}

function groupCount(rows, field) { return rows.reduce((acc, row) => { const key = row[field] || "Unspecified"; acc[key] = (acc[key] || 0) + 1; return acc; }, {}); }
function groupSum(rows, groupField, sumField) { return rows.reduce((acc, row) => { const key = row[groupField] || "Unspecified"; acc[key] = (acc[key] || 0) + num(row[sumField]); return acc; }, {}); }
function groupDates(rows, groupField, dateField) { return rows.reduce((acc, row) => { const key = row[groupField] || "Unspecified"; if (row[dateField]) (acc[key] ||= []).push(row[dateField]); return acc; }, {}); }
function topEntry(obj) { const e = Object.entries(obj).sort((a,b) => b[1]-a[1])[0]; return e ? `${e[0]} (${e[1]})` : ""; }
function label(key) { return key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()); }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch])); }

function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `reliability-program-backup-${new Date().toISOString().slice(0,10)}.json`; a.click();
  URL.revokeObjectURL(url);
}

function importJson(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      state = { ...structuredClone(defaultState), ...imported };
      saveState(); renderAll(); alert("Import complete.");
    } catch { alert("That file could not be imported. Please choose a valid JSON backup."); }
  };
  reader.readAsText(file);
}

function seedDemoData() {
  state = {
    equipment: [
      { id: uid(), tag: "P-101", site: "Plant 1", area: "Utilities", system: "Cooling Water", asset: "Pump", component: "Bearing", criticality: "High", owner: "Maintenance" },
      { id: uid(), tag: "CMP-204", site: "Plant 1", area: "Process", system: "Compressed Air", asset: "Compressor", component: "Motor", criticality: "Critical", owner: "Operations" },
      { id: uid(), tag: "CV-330", site: "Plant 1", area: "Packaging", system: "Conveyor", asset: "Belt Conveyor", component: "Drive", criticality: "Medium", owner: "Production" }
    ],
    workOrders: [
      { id: uid(), woNumber: "WO-1001", equipmentTag: "P-101", woType: "Corrective", priority: "High", dateOpened: "2026-06-01", dateClosed: "2026-06-02", laborHours: 5, description: "Replaced failed bearing and checked alignment." },
      { id: uid(), woNumber: "WO-1002", equipmentTag: "CMP-204", woType: "Preventive", priority: "Medium", dateOpened: "2026-06-04", dateClosed: "2026-06-04", laborHours: 3, description: "PM inspection and oil sample." }
    ],
    failures: [
      { id: uid(), equipmentTag: "P-101", eventDate: "2026-05-12", failureType: "Mechanical", failureMode: "Bearing failure", mechanism: "Lubrication starvation", downtimeHours: 4, consequence: "Production Loss", correctiveAction: "Replaced bearing and added lube inspection." },
      { id: uid(), equipmentTag: "P-101", eventDate: "2026-06-01", failureType: "Mechanical", failureMode: "Bearing failure", mechanism: "Misalignment", downtimeHours: 6, consequence: "Production Loss", correctiveAction: "Aligned pump/motor set." },
      { id: uid(), equipmentTag: "CMP-204", eventDate: "2026-06-20", failureType: "Electrical", failureMode: "Motor trip", mechanism: "Overload", downtimeHours: 2, consequence: "Minor", correctiveAction: "Reset and inspected load condition." }
    ],
    reviews: [
      { id: uid(), title: "P-101 repeat bearing failures", sourceType: "RCA", level: "Reliability Engineer Review", owner: "Reliability", dueDate: "2026-07-15", notes: "Review lubrication route and alignment standard." }
    ]
  };
  saveState(); renderAll();
}

window.deleteRow = deleteRow;
window.advanceReview = advanceReview;
document.addEventListener("DOMContentLoaded", init);
