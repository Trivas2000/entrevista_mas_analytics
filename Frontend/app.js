const API_URL = "http://127.0.0.1:8000";

const sections = document.querySelectorAll("main > section");
document.querySelectorAll("header nav button").forEach(btn => {
  btn.addEventListener("click", () => {
    sections.forEach(s => s.hidden = s.id !== btn.dataset.view);
    if (btn.dataset.view === "metrics") loadMetrics();
  });
});

document.querySelectorAll(".sub-nav button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".sub-nav button").forEach(b => b.classList.toggle("active", b === btn));
    document.querySelectorAll(".metric-panel").forEach(p => {
      p.hidden = p.dataset.metric !== btn.dataset.metric;
    });
  });
});

document.getElementById("metrics-filters").addEventListener("submit", e => {
  e.preventDefault();
  loadMetrics();
});

async function loadMetrics() {
  const params = new URLSearchParams();
  const start = document.getElementById("date-start").value;
  const end = document.getElementById("date-end").value;
  const n = document.getElementById("top-n").value;
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  if (n) params.set("n", n);

  const [top, byStore, byCat] = await Promise.all([
    fetch(`${API_URL}/top-products?${params}`).then(r => r.json()),
    fetch(`${API_URL}/sales-by-store`).then(r => r.json()),
    fetch(`${API_URL}/sales-by-category`).then(r => r.json()),
  ]);

  renderTable("top-products", top, ["product_id", "category", "units", "revenue"]);
  renderTable("by-store", byStore, ["store_id", "revenue", "units", "transactions"]);
  renderTable("by-category", byCat, ["category", "revenue", "units", "transactions"]);
}

function renderTable(id, rows, cols) {
  const fmt = v => typeof v === "number" ? v.toLocaleString("en-US") : v ?? "";
  const head = `<thead><tr>${cols.map(c => `<th>${c}</th>`).join("")}</tr></thead>`;
  const body = `<tbody>${rows.map(r => `<tr>${cols.map(c => `<td>${fmt(r[c])}</td>`).join("")}</tr>`).join("")}</tbody>`;
  document.getElementById(id).innerHTML = head + body;
}
