/* Prototype-only: offline mock + lightweight canvas charts (no deps). */

function $(sel, root = document) {
  return root.querySelector(sel);
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function safeClone(obj) {
  // structuredClone is not available in some older browsers.
  if (typeof globalThis.structuredClone === "function") return globalThis.structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}

function prepareCanvas(canvas, cssHeightPx) {
  // Scale internal resolution for crisp rendering on HiDPI screens.
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const rect = canvas.getBoundingClientRect();
  const cssW = Math.max(1, Math.round(rect.width));
  const cssH = Math.max(1, Math.round(cssHeightPx ?? rect.height));
  const targetW = Math.round(cssW * dpr);
  const targetH = Math.round(cssH * dpr);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: cssW, h: cssH };
}

function fmtInt(n) {
  if (!Number.isFinite(n)) return "--";
  return Math.round(n).toLocaleString("zh-CN");
}

function fmtPct(p) {
  if (!Number.isFinite(p)) return "--";
  return `${Math.round(p * 100)}%`;
}

function severityFromProb(p) {
  if (p >= 0.75) return "high";
  if (p >= 0.55) return "mid";
  return "low";
}

function severityLabel(s) {
  return s === "high" ? "高" : s === "mid" ? "中" : "低";
}

function pillForRisk(el, p) {
  const sev = severityFromProb(p);
  el.classList.remove("pill--warn", "pill--danger", "pill--info", "pill--ghost");
  if (sev === "high") el.classList.add("pill--danger");
  else if (sev === "mid") el.classList.add("pill--warn");
  else el.classList.add("pill--info");
  el.textContent = `风险：${severityLabel(sev)}`;
}

function badgeClass(sev) {
  return sev === "high" ? "badge--high" : sev === "mid" ? "badge--mid" : "badge--low";
}

function chipClass(sev) {
  return sev === "high" ? "chip--high" : sev === "mid" ? "chip--mid" : "chip--low";
}

function monthLabel(ym) {
  if (!ym) return "--";
  const parts = String(ym).split("-");
  if (parts.length < 2) return ym;
  return `${Number(parts[1])}月`;
}

function normalizeForecastRows(rows) {
  if (!rows) return [];
  return rows.map((r) => ({
    name: r.province_short || r.province || r.name || "未知",
    values: r.values || r.probs || r.risks || []
  }));
}

function buildLeadRows(leads, valueKey = "mean_prob") {
  const map = new Map();
  const order = ["山东", "河北", "辽宁"];
  const leadKeys = [1, 2, 3];
  for (let i = 0; i < leadKeys.length; i += 1) {
    const lead = leadKeys[i];
    const rows = leads?.[lead] || leads?.[String(lead)] || [];
    for (const r of rows) {
      const name = r.province_short || r.province || r.name || "未知";
      if (!map.has(name)) map.set(name, { name, values: [null, null, null] });
      map.get(name).values[i] = r[valueKey];
    }
  }
  const ordered = [];
  for (const key of order) {
    if (map.has(key)) ordered.push(map.get(key));
  }
  for (const row of map.values()) {
    if (!order.includes(row.name)) ordered.push(row);
  }
  return ordered;
}

function renderForecastTable(el, rows, months, options) {
  if (!el) return;
  el.innerHTML = "";
  const safeRows = normalizeForecastRows(rows);
  if (!safeRows.length) {
    const empty = document.createElement("div");
    empty.className = "hint";
    empty.textContent = "暂无数据。";
    el.appendChild(empty);
    return;
  }
  const labels = (months || []).length ? months.map(monthLabel) : ["M+1", "M+2", "M+3"];

  const header = document.createElement("div");
  header.className = "forecast-row forecast-row--head";
  header.innerHTML = `
    <div class="forecast-cell forecast-cell--label">产区</div>
    <div class="forecast-cell">${labels[0] || "--"}</div>
    <div class="forecast-cell">${labels[1] || "--"}</div>
    <div class="forecast-cell">${labels[2] || "--"}</div>
  `;
  el.appendChild(header);

  const unit = options?.unit || "";
  const type = options?.type || "value";
  const decimals = Number.isFinite(options?.decimals) ? options.decimals : type === "value" ? 1 : 0;

  for (const row of safeRows) {
    const line = document.createElement("div");
    line.className = "forecast-row";
    const label = document.createElement("div");
    label.className = "forecast-cell forecast-cell--label";
    label.textContent = row.name;
    line.appendChild(label);

    for (let i = 0; i < 3; i += 1) {
      const value = row.values?.[i];
      const cell = document.createElement("div");
      cell.className = "forecast-cell";
      if (type === "risk") {
        const sev = severityFromProb(value ?? 0);
        cell.classList.add(`forecast-cell--${sev}`);
        cell.innerHTML = `<div class="forecast-value">${fmtPct(value)}</div>`;
      } else {
        const text =
          Number.isFinite(value) && value !== null
            ? `${value.toFixed(decimals)}${unit}`
            : "--";
        cell.innerHTML = `<div class="forecast-value">${text}</div>`;
      }
      line.appendChild(cell);
    }
    el.appendChild(line);
  }
}

function drawRiskGauge(el, p) {
  if (!el) return;
  if (el.tagName === "CANVAS") return; // legacy canvas removed

  const total = 10;
  const value = clamp01(p);
  const filled = Math.round(value * total);
  el.innerHTML = "";

  for (let i = 0; i < total; i += 1) {
    const bar = document.createElement("div");
    bar.className = "risk-battery__bar";
    const height = 28 + i * 6;
    bar.style.height = `${height}px`;
    if (i < filled) {
      const ratio = (i + 1) / total;
      const sev = ratio <= 0.33 ? "low" : ratio <= 0.66 ? "mid" : "high";
      bar.classList.add("is-on", `is-on--${sev}`);
    }
    el.appendChild(bar);
  }
}

function drawFanChart(canvas, series, options) {
  const { ctx, w, h } = prepareCanvas(canvas, 300);

  const pad = { l: 64, r: 18, t: 22, b: 52 };
  ctx.clearRect(0, 0, w, h);

  const xs = series.map((_, i) => i);
  const yAll = [];
  for (const p of series) yAll.push(p.q10, p.q50, p.q90);
  const yMin = Math.min(...yAll);
  const yMax = Math.max(...yAll);
  const yPad = (yMax - yMin) * 0.12;
  const ymin = yMin - yPad;
  const ymax = yMax + yPad;

  function x(i) {
    if (xs.length <= 1) return pad.l;
    return pad.l + (i / (xs.length - 1)) * (w - pad.l - pad.r);
  }
  function y(v) {
    const t = (v - ymin) / (ymax - ymin);
    return pad.t + (1 - t) * (h - pad.t - pad.b);
  }

  // Gridlines
  ctx.strokeStyle = "rgba(38,216,255,0.10)";
  ctx.lineWidth = 1;
  for (let k = 0; k <= 4; k++) {
    const gy = pad.t + (k / 4) * (h - pad.t - pad.b);
    ctx.beginPath();
    ctx.moveTo(pad.l, gy);
    ctx.lineTo(w - pad.r, gy);
    ctx.stroke();
  }

  // y-axis labels
  ctx.fillStyle = "rgba(185,230,255,0.55)";
  ctx.font = "12px ui-sans-serif, system-ui";
  ctx.textAlign = "right";
  for (let k = 0; k <= 4; k++) {
    const v = ymin + (1 - k / 4) * (ymax - ymin);
    const gy = pad.t + (k / 4) * (h - pad.t - pad.b);
    ctx.fillText(fmtInt(v), pad.l - 8, gy + 4);
  }

  // Fan band (q10-q90)
  if (options.showFan) {
    ctx.beginPath();
    for (let i = 0; i < series.length; i++) {
      const px = x(i);
      const py = y(series[i].q90);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    for (let i = series.length - 1; i >= 0; i--) {
      ctx.lineTo(x(i), y(series[i].q10));
    }
    ctx.closePath();
    const grad = ctx.createLinearGradient(pad.l, 0, w - pad.r, 0);
    grad.addColorStop(0, "rgba(38,216,255,0.25)");
    grad.addColorStop(0.6, "rgba(26,162,255,0.18)");
    grad.addColorStop(1, "rgba(38,216,255,0.08)");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "rgba(38,216,255,0.18)";
    ctx.stroke();
  }

  // P50 line
  if (options.showP50) {
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = "rgba(38,216,255,0.95)";
    ctx.beginPath();
    for (let i = 0; i < series.length; i++) {
      const px = x(i);
      const py = y(series[i].q50);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Glow
    ctx.lineWidth = 6.5;
    ctx.strokeStyle = "rgba(38,216,255,0.16)";
    ctx.beginPath();
    for (let i = 0; i < series.length; i++) {
      const px = x(i);
      const py = y(series[i].q50);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // X labels
  ctx.fillStyle = "rgba(185,230,255,0.5)";
  ctx.font = "12px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  for (let i = 0; i < series.length; i++) {
    if (i === 0 || i === series.length - 1 || i === Math.floor(series.length / 2)) {
      ctx.fillText(series[i].t, x(i), h - 16);
    }
  }

  // Optional markers (agro phenology milestones, demo-only)
  if (options.showMarkers) {
    const ms = [
      { idx: 2, label: "定植窗口" },
      { idx: 4, label: "膨大期" },
      { idx: 6, label: "采收前" }
    ];
    for (const m of ms) {
      const px = x(Math.min(series.length - 1, m.idx));
      ctx.strokeStyle = "rgba(255,209,89,0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, pad.t);
      ctx.lineTo(px, h - pad.b);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,209,89,0.9)";
      ctx.font = "12px ui-sans-serif, system-ui";
      ctx.textAlign = "left";
      ctx.fillText(m.label, px + 6, pad.t + 14);
    }
  }
}

function drawRainChart(canvas, series) {
  if (!series?.length) return;
  const { ctx, w, h } = prepareCanvas(canvas, 220);
  ctx.clearRect(0, 0, w, h);

  const pad = { l: 46, r: 16, t: 18, b: 36 };
  const values = series.map((s) => s.v);
  const vMin = Math.min(...values);
  const vMax = Math.max(...values);
  const ymin = Math.max(0, vMin - 0.08);
  const ymax = vMax + 0.08;

  function x(i) {
    if (series.length <= 1) return pad.l;
    return pad.l + (i / (series.length - 1)) * (w - pad.l - pad.r);
  }
  function y(v) {
    const t = (v - ymin) / (ymax - ymin);
    return pad.t + (1 - t) * (h - pad.t - pad.b);
  }

  // gridlines
  ctx.strokeStyle = "rgba(38,216,255,0.08)";
  ctx.lineWidth = 1;
  for (let k = 0; k <= 3; k++) {
    const gy = pad.t + (k / 3) * (h - pad.t - pad.b);
    ctx.beginPath();
    ctx.moveTo(pad.l, gy);
    ctx.lineTo(w - pad.r, gy);
    ctx.stroke();
  }

  // baseline (normal = 1.0)
  const baseY = y(1);
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.beginPath();
  ctx.moveTo(pad.l, baseY);
  ctx.lineTo(w - pad.r, baseY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(185,230,255,0.45)";
  ctx.font = "12px ui-sans-serif, system-ui";
  ctx.textAlign = "left";
  ctx.fillText("常年", pad.l + 4, baseY - 6);

  // line
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = "rgba(38,216,255,0.95)";
  ctx.beginPath();
  for (let i = 0; i < series.length; i++) {
    const px = x(i);
    const py = y(series[i].v);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // glow
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(38,216,255,0.18)";
  ctx.beginPath();
  for (let i = 0; i < series.length; i++) {
    const px = x(i);
    const py = y(series[i].v);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // points + labels
  ctx.fillStyle = "rgba(38,216,255,0.95)";
  ctx.font = "12px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  for (let i = 0; i < series.length; i++) {
    const px = x(i);
    const py = y(series[i].v);
    ctx.beginPath();
    ctx.arc(px, py, 3.2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = "rgba(185,230,255,0.6)";
    ctx.fillText(series[i].m, px, h - 12);
    ctx.fillStyle = "rgba(38,216,255,0.95)";
  }
}

function renderAlerts(el, alerts, threshold) {
  el.innerHTML = "";
  const list = alerts
    .filter((a) => a.probability >= threshold)
    .sort((a, b) => b.probability - a.probability);

  if (list.length === 0) {
    const empty = document.createElement("div");
    empty.className = "hint";
    empty.textContent = "当前阈值下暂无预警（可降低阈值查看更多）。";
    el.appendChild(empty);
    return;
  }

  for (const a of list) {
    const item = document.createElement("div");
    item.className = "alert";
    const sev = a.severity;
    item.innerHTML = `
      <div>
        <div class="alert__type">${a.type}</div>
        <div class="alert__desc">${a.region} · ${a.window}</div>
      </div>
      <div class="alert__desc">${a.desc}</div>
      <div class="alert__right">
        <div class="badge ${badgeClass(sev)}"><span class="dot dot--${sev === "high" ? "high" : sev === "mid" ? "mid" : "low"}"></span>概率 ${Math.round(a.probability * 100)}%</div>
      </div>
    `;
    el.appendChild(item);
  }
}

function renderClimate(data) {
  const climate = data.all?.climate;
  if (!climate) return;
  const tag = $("#climateTag");
  if (tag) tag.textContent = climate.tag || "趋势简报";
  $("#climateHeadline").textContent = climate.headline || "--";
  const labelText = climate.labels ? ` · ${climate.labels}` : "";
  $("#climateSub").textContent = `${climate.sub || ""}${labelText}`.trim();
  $("#rainNote").textContent = climate.rain_note || "";

  const list = $("#climateList");
  list.innerHTML = "";
  for (const item of climate.items || []) {
    const node = document.createElement("div");
    node.className = "climate__item";
    node.innerHTML = `
      <div class="climate__phenomenon">${item.phenomenon}</div>
      <div class="climate__impact">${item.impact}</div>
    `;
    list.appendChild(node);
  }

  drawRainChart($("#rainChart"), climate.rain_trend || []);
}

function openDialog(dlg) {
  if (!dlg) return;
  if (typeof dlg.showModal === "function") dlg.showModal();
  else dlg.setAttribute("open", "");
}

function closeDialog(dlg) {
  if (!dlg) return;
  if (typeof dlg.close === "function") dlg.close();
  else dlg.removeAttribute("open");
}

function wireDialogClose(dlg) {
  dlg?.addEventListener("click", (e) => {
    const t = e.target;
    if (t?.matches?.("[data-close]")) closeDialog(dlg);
  });
  dlg?.addEventListener("cancel", (e) => {
    e.preventDefault();
    closeDialog(dlg);
  });
}

function updateProvinceCards(data) {
  const cards = $$("#provinceCards .province");
  for (const btn of cards) {
    const code = btn.getAttribute("data-region");
    const r = data.regions[code];
    if (!r) continue;
    const risk = r.risk_prob_under_10pct_below_normal;
    const total = r.forecast_total_tons.q50;
    btn.querySelector('[data-role="risk"]').textContent = fmtPct(risk);
    btn.querySelector('[data-role="total"]').textContent = fmtInt(total);
    const fill = btn.querySelector('[data-role="fill"]');
    fill.style.width = `${Math.round(clamp01(risk) * 100)}%`;

    // Tint based on risk
    const sev = severityFromProb(risk);
    btn.style.borderColor =
      sev === "high"
        ? "rgba(251,113,133,0.28)"
        : sev === "mid"
          ? "rgba(251,191,36,0.26)"
          : "rgba(74,222,128,0.22)";
  }
}

function $$(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}

function renderAboutDialog(data, threshold) {
  $("#dlgSub").textContent = `产季 ${data.season} · 提前量 ${leadLabel(data.lead)} · 阈值 ${Math.round(threshold * 100)}%`;
  const rp = data.all.risk_prob_under_10pct_below_normal;
  const riskLine =
    rp >= threshold
      ? "当前减产风险已触达阈值，重点关注降雨集中与渍涝触发器。"
      : "当前风险低于阈值，但需关注中期降雨与墒情变化。";
  const climateLine = data.all?.climate?.headline;
  $("#txtOneLiner").textContent = climateLine ? `${climateLine} ${riskLine}` : riskLine;

  const driverList = $("#driverList");
  driverList.innerHTML = "";
  for (const d of data.all.drivers) {
    const node = document.createElement("div");
    node.className = "driver";
    node.innerHTML = `
      <div class="driver__top">
        <div class="driver__name">${d.name}</div>
        <div class="driver__dir">${d.dir}</div>
      </div>
      <div class="driver__evi">证据：${d.evidence}</div>
    `;
    driverList.appendChild(node);
  }

  const adviceList = $("#adviceList");
  adviceList.innerHTML = "";
  for (const a of data.all.advice) {
    const li = document.createElement("li");
    li.textContent = a;
    adviceList.appendChild(li);
  }
}

function renderRegionDialog(data, code) {
  const r = data.regions[code];
  if (!r) return;

  $("#dlgRegionTitle").textContent = `${r.name} 产区详情（原型）`;
  $("#dlgRegionSub").textContent = `减产风险概率：${fmtPct(r.risk_prob_under_10pct_below_normal)} · 总产 P50：${fmtInt(r.forecast_total_tons.q50)} 吨`;

  $("#deArea").textContent = fmtInt(r.decomp.area_mu);
  $("#deYield").textContent = fmtInt(r.decomp.yield_kg_per_mu);
  const computedTotal = (r.decomp.area_mu * r.decomp.yield_kg_per_mu) / 1000;
  $("#deTotal").textContent = fmtInt(computedTotal);

  const chips = $("#regionChips");
  chips.innerHTML = "";
  for (const k of r.key_risks) {
    const chip = document.createElement("span");
    chip.className = `chip ${chipClass(k.severity)}`;
    chip.textContent = `${k.name} · ${severityLabel(k.severity)}`;
    chips.appendChild(chip);
  }

  const rows = $("#countyRows");
  rows.innerHTML = "";
  for (const c of r.counties) {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <div class="row__name">${c.name}</div>
      <div class="row__meta">风险 ${Math.round(c.risk * 100)}%</div>
    `;
    rows.appendChild(row);
  }
}

function leadLabel(lead) {
  if (lead === "14d") return "未来 2 周";
  if (lead === "30d") return "未来 1 个月";
  if (lead === "90d") return "未来 3 个月";
  return "到采收";
}

const WEATHER_FILES = {
  forecast: "./data/weather_forecast_latest.json",
  tempAnomaly: "./data/temp_anomaly_province_latest.json",
  extremeRain: "./data/extreme_risk_province_latest.json"
};
const CLIMATE_FILE = "./data/climate_insight_latest.json";
const weatherCache = new Map();

function addMonths(ym, delta) {
  const [y, m] = ym.split("-").map((n) => Number(n));
  if (!y || !m) return ym;
  const total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

async function loadWeatherFile(key) {
  const url = WEATHER_FILES[key];
  if (!url) return null;
  if (weatherCache.has(url)) return weatherCache.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`天气数据加载失败：${res.status}`);
  const data = await res.json();
  weatherCache.set(url, data);
  return data;
}

async function loadClimateInsight() {
  if (!CLIMATE_FILE) return null;
  const res = await fetch(CLIMATE_FILE);
  if (!res.ok) throw new Error(`气象解读加载失败：${res.status}`);
  return res.json();
}

async function hydrateWeatherFromFiles(weather) {
  if (!weather) return;
  let touched = false;
  try {
    const forecast = await loadWeatherFile("forecast");
    if (forecast) {
      if (forecast.issue_month) weather.issue_month = forecast.issue_month;
      if (forecast.months) weather.months = forecast.months;
      if (forecast.temperature) weather.temperature = forecast.temperature;
      if (forecast.precipitation) weather.precipitation = forecast.precipitation;
      touched = true;
    }
  } catch (err) {
    console.warn(err);
  }

  try {
    const temp = await loadWeatherFile("tempAnomaly");
    if (temp) {
      const warmLeads = temp.warm?.leads || temp.leads;
      const coldLeads = temp.cold?.leads || temp.leads;
      if (!weather.months && temp.target_month) {
        weather.months = [
          temp.target_month,
          addMonths(temp.target_month, 1),
          addMonths(temp.target_month, 2)
        ];
      }
      weather.temp_anomaly_high = weather.temp_anomaly_high || {};
      weather.temp_anomaly_low = weather.temp_anomaly_low || {};
      weather.temp_anomaly_high.rows = buildLeadRows(warmLeads || {}, "mean_prob");
      weather.temp_anomaly_low.rows = buildLeadRows(coldLeads || {}, "mean_prob");
      weather.temp_anomaly_high.source = "模型输出";
      weather.temp_anomaly_low.source = "模型输出";
      touched = true;
    }
  } catch (err) {
    console.warn(err);
  }

  try {
    const extreme = await loadWeatherFile("extremeRain");
    if (extreme) {
      if (!weather.months && extreme.target_month) {
        weather.months = [
          extreme.target_month,
          addMonths(extreme.target_month, 1),
          addMonths(extreme.target_month, 2)
        ];
      }
      weather.extreme_precip = weather.extreme_precip || {};
      weather.extreme_precip.rows = buildLeadRows(extreme.leads || {}, "mean_prob");
      weather.extreme_precip.source = "模型输出";
      touched = true;
    }
  } catch (err) {
    console.warn(err);
  }

  if (touched) {
    weather.source = "模型输出";
  }
}

function setStatus(data) {
  $("#txtStatus").textContent = `数据：Mock（离线） · 更新时间：${data.generated_at}`;
}

function setKPIs(data, threshold) {
  const f = data.all.forecast_total_tons;
  $("#kpiTotal").textContent = fmtInt(f.q50);
  $("#kpiP10").textContent = fmtInt(f.q10);
  $("#kpiP90").textContent = fmtInt(f.q90);

  const conf = data.all.confidence;
  const confPct = Math.round(conf * 100);
  const confEl = $("#pillConfidence");
  confEl.textContent = `置信度：${confPct}%`;
  confEl.classList.remove("pill--danger", "pill--warn", "pill--info");
  confEl.classList.add(conf >= 0.75 ? "pill--info" : conf >= 0.6 ? "pill--warn" : "pill--danger");

  const delta = f.q50 - data.all.last_week_q50_tons;
  const deltaPct = data.all.last_week_q50_tons ? delta / data.all.last_week_q50_tons : 0;
  $("#kpiDelta").textContent = `${delta >= 0 ? "+" : ""}${fmtInt(delta)} 吨`;
  $("#kpiDeltaMeta").textContent = `上周 P50：${fmtInt(data.all.last_week_q50_tons)} 吨（变化 ${Math.round(deltaPct * 1000) / 10}%）`;
  const deltaTag = $("#pillDeltaTag");
  deltaTag.textContent = delta >= 0 ? "上调" : "下调";
  deltaTag.classList.remove("pill--info", "pill--warn", "pill--danger", "pill--ghost");
  deltaTag.classList.add(Math.abs(deltaPct) >= 0.03 ? "pill--warn" : "pill--info");
  $("#deltaFill").style.width = `${Math.round(clamp01(Math.abs(deltaPct) / 0.08) * 100)}%`;

  // Risk KPI
  const rp = data.all.risk_prob_under_10pct_below_normal;
  $("#kpiRisk").textContent = fmtPct(rp);
  pillForRisk($("#pillRiskTag"), rp);
  $("#riskHint").textContent =
    rp >= threshold
      ? "达到阈值：建议重点关注高风险产区与触发器窗口。"
      : "低于阈值：建议保持监测，关注中期信号。";

  // Alerts KPI
  const counts = { high: 0, mid: 0, low: 0 };
  for (const a of data.all.alerts) counts[a.severity] = (counts[a.severity] || 0) + 1;
  $("#nHigh").textContent = String(counts.high);
  $("#nMid").textContent = String(counts.mid);
  $("#nLow").textContent = String(counts.low);
  $("#kpiAlerts").textContent = String(data.all.alerts.length);
  $("#kpiAlertsMeta").textContent = `高 ${counts.high} · 中 ${counts.mid} · 低 ${counts.low}`;
  const topAlert = [...data.all.alerts].sort((a, b) => b.probability - a.probability)[0];
  const topText = topAlert
    ? `${topAlert.region} · ${topAlert.type} · ${Math.round(topAlert.probability * 100)}%`
    : "暂无预警";
  const topEl = $("#alertTop");
  if (topEl) topEl.textContent = topText;
  const totalAlerts = Math.max(1, data.all.alerts.length);
  const barHigh = $("#barHigh");
  const barMid = $("#barMid");
  const barLow = $("#barLow");
  if (barHigh) barHigh.style.width = `${Math.round((counts.high / totalAlerts) * 100)}%`;
  if (barMid) barMid.style.width = `${Math.round((counts.mid / totalAlerts) * 100)}%`;
  if (barLow) barLow.style.width = `${Math.round((counts.low / totalAlerts) * 100)}%`;
  const alertTag = $("#pillAlertTag");
  alertTag.textContent = counts.high > 0 ? "高风险存在" : counts.mid > 1 ? "中风险偏多" : "平稳";
  alertTag.classList.remove("pill--danger", "pill--warn", "pill--info");
  alertTag.classList.add(counts.high > 0 ? "pill--danger" : counts.mid > 1 ? "pill--warn" : "pill--info");

  // Spark fill (normalized q50)
  $("#sparkBar").style.width = `${Math.round(clamp01((f.q50 - 320000) / 180000) * 100)}%`;

  $("#kpiNote").textContent = "提示：建议用区间与概率沟通不确定性（而非单点数值）。";
}

function renderWeatherPanels(view) {
  const weather = view.weather;
  const status = $("#weatherStatus");
  const subtitle = $("#weatherSubtitle");

  if (!weather) {
    if (status) status.textContent = "暂无数据";
    return;
  }

  const months = weather.months || [];
  const issue = weather.issue_month || "--";
  const labels = months.length ? months.map(monthLabel).join(" / ") : "M+1 / M+2 / M+3";
  if (subtitle) subtitle.textContent = `预测时刻 ${issue} · 目标月 ${labels}`;
  if (status) status.textContent = `数据：${weather.source || "Mock"}`;

  const temp = weather.temperature || {};
  const rain = weather.precipitation || {};
  const hot = weather.temp_anomaly_high || {};
  const cold = weather.temp_anomaly_low || {};
  const extreme = weather.extreme_precip || {};

  renderForecastTable(
    $("#tempForecastTable"),
    temp.rows || temp.provinces,
    months,
    { type: "value", unit: temp.unit || "℃", decimals: 1 }
  );
  renderForecastTable(
    $("#rainForecastTable"),
    rain.rows || rain.provinces,
    months,
    { type: "value", unit: rain.unit || "mm", decimals: 0 }
  );
  renderForecastTable(
    $("#tempAnomHighTable"),
    hot.rows || hot.provinces,
    months,
    { type: "risk" }
  );
  renderForecastTable(
    $("#tempAnomLowTable"),
    cold.rows || cold.provinces,
    months,
    { type: "risk" }
  );
  renderForecastTable(
    $("#extremeRainTable"),
    extreme.rows || extreme.provinces,
    months,
    { type: "risk" }
  );
}

function applyRegionFilter(raw, regionCode) {
  if (!regionCode || regionCode === "ALL") return raw;
  const r = raw.regions[regionCode];
  if (!r) return raw;

  // Create a shallow view where "all" reflects the selected region.
  const view = safeClone(raw);
  view.all.forecast_total_tons = r.forecast_total_tons;
  view.all.risk_prob_under_10pct_below_normal = r.risk_prob_under_10pct_below_normal;
  view.all.alerts = raw.all.alerts.filter((a) => a.region === r.name);
  view.all.drivers = raw.all.drivers;
  view.all.advice = raw.all.advice;
  view.all.last_week_q50_tons = Math.round(r.forecast_total_tons.q50 * 1.012); // demo
  return view;
}

function wireToggles(state) {
  $$(".toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-toggle");
      const on = !btn.classList.contains("is-on");
      btn.classList.toggle("is-on", on);
      if (key === "fan") state.showFan = on;
      if (key === "p50") state.showP50 = on;
      if (key === "markers") state.showMarkers = on;
      state.redraw?.();
    });
  });
}

async function main() {
  const raw =
    globalThis.__MOCK_DATA__ ??
    (await fetch("./mock-data.json").then((r) => {
      if (!r.ok) throw new Error(`mock-data.json HTTP ${r.status}`);
      return r.json();
    }));
  const weather = safeClone(raw.weather || {});
  await hydrateWeatherFromFiles(weather);
  raw.weather = weather;
  try {
    const climate = await loadClimateInsight();
    if (climate) {
      raw.all = raw.all || {};
      raw.all.climate = climate;
    }
  } catch (err) {
    console.warn(err);
  }

  const state = {
    showFan: true,
    showP50: true,
    showMarkers: false,
    redraw: null
  };

  const dlgAbout = $("#dlgAbout");
  const dlgRegion = $("#dlgRegion");
  wireDialogClose(dlgAbout);
  wireDialogClose(dlgRegion);

  const seasonEl = $("#selSeason");
  const leadEl = $("#selLead");
  const regionEl = $("#selRegion");
  const rng = $("#rngRisk");
  const txtRisk = $("#txtRisk");

  function render() {
    // Prototype keeps season/lead as UI only; real product would query backend.
    const threshold = Number(rng.value) / 100;
    txtRisk.textContent = String(rng.value);
    $("#pillThreshold").textContent = `阈值：${rng.value}%`;

    const view = applyRegionFilter(raw, regionEl.value);
    view.season = seasonEl.value;
    view.lead = leadEl.value;

    setStatus(view);
    setKPIs(view, threshold);
    drawRiskGauge($("#riskBattery"), view.all.risk_prob_under_10pct_below_normal);
    renderClimate(view);

    const fan = $("#fanChart");
    drawFanChart(fan, view.all.trend_weeks, state);

    updateProvinceCards(raw);
    renderWeatherPanels(view);
    renderAlerts($("#alertList"), view.all.alerts, threshold);

    renderAboutDialog(view, threshold);
  }

  state.redraw = render;
  wireToggles(state);

  [seasonEl, leadEl, regionEl].forEach((el) => el.addEventListener("change", render));
  rng.addEventListener("input", render);

  $("#btnAbout").addEventListener("click", () => openDialog(dlgAbout));
  $("#btnExport").addEventListener("click", () => {
    // No file system writes; just a nice modal text.
    const now = new Date();
    $("#txtOneLiner").textContent =
      `导出周报（模拟）：${now.toLocaleString("zh-CN")}。上线版可导出 PDF/图片并附数据来源与阈值记录。`;
    openDialog(dlgAbout);
  });

  $$("#provinceCards .province").forEach((btn) => {
    btn.addEventListener("click", () => {
      const code = btn.getAttribute("data-region");
      renderRegionDialog(raw, code);
      openDialog(dlgRegion);
    });
  });

  render();
}

main().catch((e) => {
  console.error(e);
  $("#txtStatus").textContent = "加载失败：请用浏览器直接打开 prototype/index.html（或使用任意本地服务器）。";
});
