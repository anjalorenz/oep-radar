const NS = "http://www.w3.org/2000/svg";

function el(name, attrs = {}, children = []) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  for (const c of children) node.appendChild(c);
  return node;
}

function polarToXY(cx, cy, r, angle) {
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

function wrapLabel(text, maxChars = 18) {
  const words = text.split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = (cur + " " + w).trim();
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export function renderRadar(container, axes) {
  // axes: [{ label, value (0-100) }]
  container.innerHTML = "";
  const size = 480;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.36;
  const n = axes.length;
  if (n < 3) {
    container.textContent = "Mindestens 3 Achsen für ein Radar nötig.";
    return;
  }

  const svg = el("svg", {
    viewBox: `0 0 ${size} ${size}`,
    role: "img",
    "aria-label": "Radar-Diagramm der OEP-Dimensionen"
  });

  // Background rings (5 levels)
  for (let lvl = 1; lvl <= 5; lvl++) {
    const r = (radius * lvl) / 5;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
      const [x, y] = polarToXY(cx, cy, r, angle);
      pts.push(`${x},${y}`);
    }
    svg.appendChild(el("polygon", { points: pts.join(" "), class: "radar-grid" }));
  }

  // Axes + labels
  axes.forEach((ax, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    const [x2, y2] = polarToXY(cx, cy, radius, angle);
    svg.appendChild(el("line", { x1: cx, y1: cy, x2, y2, class: "radar-axis" }));

    const [lx, ly] = polarToXY(cx, cy, radius + 22, angle);
    const lines = wrapLabel(ax.label, 16);
    const text = el("text", { x: lx, y: ly, class: "radar-label" });
    lines.forEach((line, idx) => {
      const tspan = el("tspan", {
        x: lx,
        dy: idx === 0 ? `-${(lines.length - 1) * 0.55}em` : "1.1em"
      });
      tspan.textContent = line;
      text.appendChild(tspan);
    });
    svg.appendChild(text);
  });

  // Data shape
  const dataPts = axes.map((ax, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    const r = (radius * Math.max(0, Math.min(100, ax.value))) / 100;
    return polarToXY(cx, cy, r, angle);
  });
  svg.appendChild(el("polygon", {
    points: dataPts.map(p => p.join(",")).join(" "),
    class: "radar-shape"
  }));
  dataPts.forEach(([x, y]) => {
    svg.appendChild(el("circle", { cx: x, cy: y, r: 3, class: "radar-vertex" }));
  });

  container.appendChild(svg);
}

export function svgToPngBlob(svgEl, scale = 2) {
  return new Promise((resolve, reject) => {
    const xml = new XMLSerializer().serializeToString(svgEl);
    const svg64 = btoa(unescape(encodeURIComponent(xml)));
    const img = new Image();
    img.onload = () => {
      const w = svgEl.viewBox.baseVal.width * scale;
      const h = svgEl.viewBox.baseVal.height * scale;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(b => b ? resolve(b) : reject(new Error("toBlob failed")), "image/png");
    };
    img.onerror = reject;
    img.src = "data:image/svg+xml;base64," + svg64;
  });
}
