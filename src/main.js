import { renderRadar, svgToPngBlob } from "./radar.js";

const state = {
  schema: null,
  values: {}      // { dimensionId: number 0-100 OR { selected: [optionIds], slider?: number } }
};

const PRESETS = {
  frontal: { default: 15 },
  offen:   { default: 85 },
  misch:   { default: 50 }
};

async function loadSchema() {
  const res = await fetch("data/dimensions.json");
  state.schema = await res.json();
}

function defaultValue(dim) {
  if (dim.type === "multi") {
    return { selected: [] };
  }
  return 50;
}

function initState() {
  state.values = {};
  for (const b of state.schema.bausteine) {
    for (const d of b.dimensions) {
      state.values[d.id] = defaultValue(d);
      if (d.subMulti) state.values[d.subMulti.id] = { selected: [] };
    }
  }
}

function applyPreset(name) {
  const p = PRESETS[name];
  if (!p) return;
  for (const b of state.schema.bausteine) {
    for (const d of b.dimensions) {
      if (d.type === "slider") {
        state.values[d.id] = p.default;
      } else if (d.type === "multi") {
        const all = d.options.map(o => o.id);
        if (p.default >= 75) state.values[d.id] = { selected: all };
        else if (p.default <= 25) state.values[d.id] = { selected: all.slice(0, 1) };
        else state.values[d.id] = { selected: all.slice(0, Math.ceil(all.length / 2)) };
      }
      if (d.subMulti) {
        const all = d.subMulti.options.map(o => o.id);
        if (p.default >= 75) state.values[d.subMulti.id] = { selected: all.slice(0, Math.ceil(all.length * 0.6)) };
        else if (p.default <= 25) state.values[d.subMulti.id] = { selected: [] };
        else state.values[d.subMulti.id] = { selected: all.slice(0, 2) };
      }
    }
  }
}

function dimensionValue(dim) {
  const v = state.values[dim.id];
  if (dim.type === "multi") {
    const total = dim.options.length;
    return total ? Math.round((v.selected.length / total) * 100) : 0;
  }
  return v;
}

function bausteinValue(b) {
  const vals = b.dimensions.map(d => dimensionValue(d));
  return vals.reduce((a, c) => a + c, 0) / vals.length;
}

function overallIndex() {
  const vals = state.schema.bausteine.map(bausteinValue);
  return Math.round(vals.reduce((a, c) => a + c, 0) / vals.length);
}

function renderInputs() {
  const container = document.getElementById("bausteine");
  container.innerHTML = "";
  for (const b of state.schema.bausteine) {
    const details = document.createElement("details");
    details.className = "baustein";
    details.open = true;
    const summary = document.createElement("summary");
    summary.innerHTML = `<span>${b.title}</span><span class="baustein-val" data-baustein="${b.id}"></span>`;
    details.appendChild(summary);

    const list = document.createElement("div");
    list.className = "dim-list";
    for (const d of b.dimensions) list.appendChild(renderDimension(d));
    details.appendChild(list);
    container.appendChild(details);
  }
}

function renderDimension(d) {
  const wrap = document.createElement("div");
  wrap.className = "dimension";
  wrap.dataset.dimension = d.id;

  const labelRow = document.createElement("div");
  labelRow.className = "dim-label";
  labelRow.innerHTML = `<span class="label">${d.label}</span><span class="value" data-value-for="${d.id}"></span>`;
  wrap.appendChild(labelRow);

  if (d.type === "slider") {
    const input = document.createElement("input");
    input.type = "range";
    input.min = "0";
    input.max = "100";
    input.step = "1";
    input.value = state.values[d.id];
    input.setAttribute("aria-label", d.label);
    input.addEventListener("input", () => {
      state.values[d.id] = Number(input.value);
      update();
    });
    wrap.appendChild(input);

    const poles = document.createElement("div");
    poles.className = "poles";
    poles.innerHTML = `<span class="pole-left">◀ ${d.left}</span><span class="pole-right">${d.right} ▶</span>`;
    wrap.appendChild(poles);
  } else if (d.type === "multi") {
    const opts = document.createElement("div");
    opts.className = "multi-options";
    for (const o of d.options) {
      const lbl = document.createElement("label");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = o.id;
      cb.checked = state.values[d.id].selected.includes(o.id);
      cb.addEventListener("change", () => {
        const cur = new Set(state.values[d.id].selected);
        if (cb.checked) cur.add(o.id); else cur.delete(o.id);
        state.values[d.id] = { selected: [...cur] };
        update();
      });
      lbl.appendChild(cb);
      lbl.appendChild(document.createTextNode(" " + o.label));
      opts.appendChild(lbl);
    }
    wrap.appendChild(opts);

    const poles = document.createElement("div");
    poles.className = "poles";
    poles.innerHTML = `<span class="pole-left">◀ ${d.left}</span><span class="pole-right">${d.right} ▶</span>`;
    wrap.appendChild(poles);
  }

  if (d.subMulti) {
    const sub = document.createElement("div");
    sub.className = "sub-multi";
    const subLabel = document.createElement("div");
    subLabel.className = "sub-multi-label";
    subLabel.textContent = d.subMulti.label;
    sub.appendChild(subLabel);
    const opts = document.createElement("div");
    opts.className = "multi-options";
    for (const o of d.subMulti.options) {
      const lbl = document.createElement("label");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = o.id;
      cb.checked = state.values[d.subMulti.id].selected.includes(o.id);
      cb.addEventListener("change", () => {
        const cur = new Set(state.values[d.subMulti.id].selected);
        if (cb.checked) cur.add(o.id); else cur.delete(o.id);
        state.values[d.subMulti.id] = { selected: [...cur] };
        update();
      });
      lbl.appendChild(cb);
      lbl.appendChild(document.createTextNode(" " + o.label));
      opts.appendChild(lbl);
    }
    sub.appendChild(opts);
    wrap.appendChild(sub);
  }

  return wrap;
}

function updateValueLabels() {
  for (const b of state.schema.bausteine) {
    const el = document.querySelector(`[data-baustein="${b.id}"]`);
    if (el) el.textContent = `${Math.round(bausteinValue(b))} / 100`;
    for (const d of b.dimensions) {
      const v = document.querySelector(`[data-value-for="${d.id}"]`);
      if (!v) continue;
      if (d.type === "multi") {
        v.textContent = `${state.values[d.id].selected.length} / ${d.options.length}`;
      } else {
        v.textContent = state.values[d.id];
      }
    }
  }
}

function getRadarAxes() {
  const mode = document.querySelector('input[name="viz-mode"]:checked').value;
  if (mode === "8") {
    return state.schema.bausteine.map(b => ({
      label: b.title,
      value: bausteinValue(b)
    }));
  }
  const axes = [];
  for (const b of state.schema.bausteine) {
    for (const d of b.dimensions) {
      axes.push({ label: d.label, value: dimensionValue(d) });
    }
  }
  return axes;
}

function renderProfile() {
  const card = document.getElementById("profile-card");
  const idx = overallIndex();
  const sorted = [...state.schema.bausteine]
    .map(b => ({ b, v: bausteinValue(b) }))
    .sort((a, z) => z.v - a.v);
  const top = sorted.slice(0, 2);
  const low = sorted.slice(-2).reverse();
  card.innerHTML = `
    <div class="index">${idx}<span class="unit"> / 100 Gesamtindex</span></div>
    <p style="margin:.4rem 0 .2rem">Stärkste Bausteine</p>
    <ul>${top.map(t => `<li>${t.b.title} – ${Math.round(t.v)}</li>`).join("")}</ul>
    <p style="margin:.4rem 0 .2rem">Bausteine mit Entwicklungspotenzial</p>
    <ul>${low.map(t => `<li>${t.b.title} – ${Math.round(t.v)}</li>`).join("")}</ul>
  `;
}

function update() {
  updateValueLabels();
  renderRadar(document.getElementById("radar-container"), getRadarAxes());
  renderProfile();
  syncURL();
}

// --- URL state (compact) ---
function encodeState() {
  const obj = {};
  for (const [k, v] of Object.entries(state.values)) {
    if (typeof v === "number") obj[k] = v;
    else if (v && Array.isArray(v.selected) && v.selected.length) obj[k] = v.selected;
  }
  const json = JSON.stringify(obj);
  return btoa(unescape(encodeURIComponent(json)));
}
function decodeState(s) {
  try {
    const json = decodeURIComponent(escape(atob(s)));
    return JSON.parse(json);
  } catch { return null; }
}
function syncURL() {
  const enc = encodeState();
  const url = new URL(location.href);
  url.searchParams.set("s", enc);
  history.replaceState(null, "", url);
}
function loadFromURL() {
  const url = new URL(location.href);
  const s = url.searchParams.get("s");
  if (!s) return;
  const obj = decodeState(s);
  if (!obj) return;
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "number") state.values[k] = v;
    else if (Array.isArray(v)) state.values[k] = { selected: v };
  }
}

// --- Wiring ---
function wireToolbar() {
  document.getElementById("reset-btn").addEventListener("click", () => {
    initState();
    renderInputs();
    update();
  });
  document.querySelectorAll("[data-preset]").forEach(btn => {
    btn.addEventListener("click", () => {
      applyPreset(btn.dataset.preset);
      renderInputs();
      update();
    });
  });
  document.querySelectorAll('input[name="viz-mode"]').forEach(r => {
    r.addEventListener("change", update);
  });
  document.getElementById("copy-link-btn").addEventListener("click", async () => {
    syncURL();
    try {
      await navigator.clipboard.writeText(location.href);
      flash("Link kopiert.");
    } catch {
      flash("Bitte URL aus der Adressleiste kopieren.");
    }
  });
  document.getElementById("export-png-btn").addEventListener("click", async () => {
    const svg = document.querySelector("#radar-container svg");
    if (!svg) return;
    const blob = await svgToPngBlob(svg, 2);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "oep-radar.png";
    a.click();
    URL.revokeObjectURL(url);
  });
  document.getElementById("export-json-btn").addEventListener("click", () => {
    const data = {
      version: state.schema.version,
      generated: new Date().toISOString(),
      values: state.values,
      bausteinScores: Object.fromEntries(
        state.schema.bausteine.map(b => [b.id, Math.round(bausteinValue(b))])
      ),
      overall: overallIndex()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "oep-check.json";
    a.click();
    URL.revokeObjectURL(url);
  });
}

let flashTimer = null;
function flash(msg) {
  let el = document.getElementById("flash");
  if (!el) {
    el = document.createElement("div");
    el.id = "flash";
    el.style.cssText = "position:fixed;bottom:1rem;left:50%;transform:translateX(-50%);background:#1a1a1a;color:#fff;padding:.5rem 1rem;border-radius:6px;font-size:.9rem;z-index:1000;";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = "1";
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .4s"; }, 1800);
}

(async function init() {
  await loadSchema();
  initState();
  loadFromURL();
  renderInputs();
  wireToolbar();
  update();
})();
