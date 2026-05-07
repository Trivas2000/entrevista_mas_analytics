const API_URL = "http://127.0.0.1:8000";

const sections = document.querySelectorAll("main > section");
document.querySelectorAll("header nav button").forEach(btn => {
  btn.addEventListener("click", () => {
    sections.forEach(s => s.hidden = s.id !== btn.dataset.view);
    if (btn.dataset.view === "metrics") loadMetrics();
    if (btn.dataset.view === "anomalies") loadAnomalies();
    if (btn.dataset.view === "summary") loadSummary();
  });
});

document.querySelectorAll(".sub-nav button").forEach(btn => {
  btn.addEventListener("click", () => {
    const parent = btn.closest("section");
    parent.querySelectorAll(".sub-nav button").forEach(b => b.classList.toggle("active", b === btn));
    parent.querySelectorAll(".metric-panel").forEach(p => {
      p.hidden = p.dataset.metric !== btn.dataset.metric;
    });
  });
});

document.getElementById("metrics-filters").addEventListener("submit", e => {
  e.preventDefault();
  loadMetrics();
});

document.getElementById("upload-form").addEventListener("submit", async e => {
  e.preventDefault();
  const file = document.getElementById("csv-file").files[0];
  const status = document.getElementById("upload-status");
  status.textContent = "Subiendo...";
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_URL}/upload`, { method: "POST", body: fd });
  const data = await res.json();
  status.textContent = res.ok ? `OK — ${data.rows.toLocaleString()} filas cargadas` : `Error: ${data.detail}`;
  if (res.ok) loadSummary();
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

async function loadSummary() {
  const d = await fetch(`${API_URL}/summary`, { cache: "no-cache" }).then(r => r.json());
  const compact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
  const num = new Intl.NumberFormat("en-US");
  const kpis = [
    { label: "Revenue total", value: compact.format(d.total_revenue) },
    { label: "Unidades vendidas", value: num.format(d.total_units) },
    { label: "Transacciones", value: num.format(d.rows) },
    { label: "Tiendas", value: d.stores },
    { label: "Productos", value: d.products },
    { label: "Categorías", value: d.categories },
    { label: "Clientes únicos", value: num.format(d.customers) },
    { label: "Transacciones con clientes identificados", value: (100 - d.missing_customer_pct).toFixed(2) + "%" },
  ];
  const flip = s => s.split("-").reverse().join("-");
  document.getElementById("period-info").innerHTML = `Datos del <strong>${flip(d.date_range.start)}</strong> al <strong>${flip(d.date_range.end)}</strong>`;
  document.getElementById("kpi-grid").innerHTML = kpis.map(k =>
    `<div class="kpi"><div class="kpi-value">${k.value}</div><div class="kpi-label">${k.label}</div></div>`
  ).join("");
}

loadSummary();

async function loadAnomalies() {
  const data = await fetch(`${API_URL}/anomalies`, { cache: "no-cache" }).then(r => r.json());
  const cols = ["transaction_id", "date", "store_id", "product_id", "category", "quantity", "unit_price", "customer_id"];
  renderTable("anomalies-quantity", data.filter(r => r.reason.includes("quantity_le_0")), cols);
  renderTable("anomalies-price", data.filter(r => r.reason.includes("price_le_0")), cols);
  renderTable("anomalies-duplicate", data.filter(r => r.reason.includes("duplicate_id")), cols);
  renderTable("anomalies-quantity-high", data.filter(r => r.reason.includes("quantity_high")), cols);
}

function renderTable(id, rows, cols) {
  const fmt = v => {
    if (typeof v === "number") return v.toLocaleString("en-US");
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 10);
    return v ?? "";
  };
  const head = `<thead><tr>${cols.map(c => `<th>${c}</th>`).join("")}</tr></thead>`;
  const body = `<tbody>${rows.map(r => `<tr>${cols.map(c => `<td>${fmt(r[c])}</td>`).join("")}</tr>`).join("")}</tbody>`;
  document.getElementById(id).innerHTML = head + body;
}
