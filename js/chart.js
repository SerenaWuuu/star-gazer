/* Star Gazer: canvas star chart rendering. Depends on STAR_CATALOG,
   CONSTELLATIONS and Astro. */

const StarChart = (() => {
  const D2R = Math.PI / 180;

  // Greek letter prettifier for Bayer designations like "Alp UMa" or "Del-2 Lyr".
  const GREEK = {
    Alp: "α", Bet: "β", Gam: "γ", Del: "δ", Eps: "ε", Zet: "ζ",
    Eta: "η", The: "θ", Iot: "ι", Kap: "κ", Lam: "λ", Mu: "μ",
    Nu: "ν", Xi: "ξ", Omi: "ο", Pi: "π", Rho: "ρ", Sig: "σ",
    Tau: "τ", Ups: "υ", Phi: "φ", Chi: "χ", Psi: "ψ", Ome: "ω"
  };
  const SUPER = { 1: "¹", 2: "²", 3: "³" };

  function prettyName(name) {
    const parts = name.split(" ");
    if (parts.length < 2) return name;
    const m = parts[0].match(/^([A-Za-z]+)(?:-(\d))?$/);
    if (!m || !GREEK[m[1]]) return name;
    return GREEK[m[1]] + (m[2] && SUPER[m[2]] ? SUPER[m[2]] : "") + " " + parts.slice(1).join(" ");
  }

  function starColor(ci) {
    if (ci < 0.0) return "#cfe0ff";
    if (ci < 0.5) return "#ffffff";
    if (ci < 1.0) return "#fff3d6";
    if (ci < 1.5) return "#ffd9a0";
    return "#ff9e7a";
  }

  function starRadius(mag) {
    return Math.max(0.8, Math.min(4.6, 3.6 - 0.8 * mag));
  }

  function computeVisible(lat, lon, date) {
    const out = [];
    for (let i = 0; i < STAR_CATALOG.length; i++) {
      const s = STAR_CATALOG[i];
      const pos = Astro.altAz(s.ra, s.dec, lat, lon, date);
      if (pos.alt > 0) out.push({ i, s, alt: pos.alt, az: pos.az });
    }
    return out;
  }

  function project(o, cx, cy, R) {
    const z = 90 - o.alt;
    const r = (R * z) / 90;
    const azR = o.az * D2R;
    return { x: cx + r * Math.sin(azR), y: cy - r * Math.cos(azR) };
  }

  function setupCanvas(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  function drawSkyBackground(ctx, w, h, cx, cy, R) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.15);
    g.addColorStop(0, "#0a1130");
    g.addColorStop(0.7, "#070c24");
    g.addColorStop(1, "#04060f");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // horizon glow
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(157,180,255,0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // cardinal labels
    ctx.fillStyle = "rgba(200,212,255,0.65)";
    ctx.font = "600 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const cards = [["N", 0], ["E", 90], ["S", 180], ["W", 270]];
    for (const [label, az] of cards) {
      const a = az * D2R;
      ctx.fillText(label, cx + (R + 16) * Math.sin(a), cy - (R + 16) * Math.cos(a));
    }
  }

  // visible: array from computeVisible. Returns per-constellation info for labels.
  function draw(canvas, visible, opts) {
    const { ctx, w, h } = setupCanvas(canvas);
    const cx = w / 2;
    const cy = h / 2;
    const R = Math.min(w, h) / 2 - 34;
    drawSkyBackground(ctx, w, h, cx, cy, R);

    const byIndex = new Map();
    for (const o of visible) {
      const p = project(o, cx, cy, R);
      o.x = p.x; o.y = p.y;
      byIndex.set(o.i, o);
    }

    // constellation lines
    ctx.strokeStyle = "rgba(140,170,255,0.32)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const c of CONSTELLATIONS) {
      for (const [a, b] of c.lines) {
        const A = byIndex.get(a);
        const B = byIndex.get(b);
        if (A && B) {
          ctx.moveTo(A.x, A.y);
          ctx.lineTo(B.x, B.y);
        }
      }
    }
    ctx.stroke();

    // stars, dim first so bright ones draw on top
    const sorted = visible.slice().sort((p, q) => q.s.m - p.s.m);
    for (const o of sorted) {
      const r = starRadius(o.s.m);
      ctx.beginPath();
      ctx.arc(o.x, o.y, r, 0, Math.PI * 2);
      ctx.fillStyle = starColor(o.s.ci);
      if (o.s.m < 1.0) {
        ctx.shadowColor = starColor(o.s.ci);
        ctx.shadowBlur = 12;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // bright star labels
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    for (const o of visible) {
      if (o.s.m <= 1.5 && o.alt > 12) {
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.fillText(prettyName(o.s.n), o.x + 6, o.y - 4);
      }
    }

    // constellation labels at centroid of visible members
    ctx.font = "600 10px system-ui, sans-serif";
    ctx.fillStyle = "rgba(157,180,255,0.75)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const c of CONSTELLATIONS) {
      const members = new Set();
      for (const [a, b] of c.lines) { members.add(a); members.add(b); }
      let sx = 0, sy = 0, n = 0;
      for (const idx of members) {
        const o = byIndex.get(idx);
        if (o) { sx += o.x; sy += o.y; n++; }
      }
      if (n >= 3) {
        const lx = sx / n, ly = sy / n;
        const dx = lx - cx, dy = ly - cy;
        if (dx * dx + dy * dy < (R - 8) * (R - 8)) {
          ctx.fillText(c.name.toUpperCase().split("").join(" "), lx, ly);
        }
      }
    }
    return { byIndex };
  }

  // Easter egg: a shooting star streaks across the chart.
  // Note: we deliberately do NOT resize the canvas here, resizing would
  // erase the chart underneath. Coordinates are CSS pixels, matching the
  // transform left in place by draw().
  function shoot(canvas, onDone) {
    const ctx = canvas.getContext("2d");
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const startX = w * (0.15 + Math.random() * 0.5);
    const startY = h * (0.1 + Math.random() * 0.25);
    const angle = Math.PI * (0.72 + Math.random() * 0.1);
    const dist = Math.min(w, h) * 0.45;
    const dur = 900;
    const t0 = performance.now();
    function frame(t) {
      const k = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      const hx = startX + Math.cos(angle) * dist * eased;
      const hy = startY - Math.sin(angle) * dist * eased * 0.6;
      // redraw base? We draw the trail on a copy-safe overlay: clear a fading rect is complex,
      // so instead we paint the meteor head plus a gradient tail each frame without clearing,
      // then ask the caller to redraw the chart when done.
      const tail = 90;
      const grad = ctx.createLinearGradient(hx, hy, hx - Math.cos(angle) * tail, hy + Math.sin(angle) * tail * 0.6);
      grad.addColorStop(0, "rgba(255,255,255,0.95)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx - Math.cos(angle) * tail, hy + Math.sin(angle) * tail * 0.6);
      ctx.stroke();
      if (k < 1) {
        requestAnimationFrame(frame);
      } else if (onDone) {
        onDone();
      }
    }
    requestAnimationFrame(frame);
  }

  return { computeVisible, project, draw, shoot, prettyName, starColor, starRadius };
})();
