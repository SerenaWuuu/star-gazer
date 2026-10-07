/* Star Gazer: night photo bright-spot detector.
   Honest scope: this finds bright blobs in a photo. It does NOT plate-solve,
   it does not know constellations, and it cannot tell a star from a porch light. */

const PhotoMode = (() => {
  const MAX_DIM = 900;   // downscale for analysis
  const CELL = 26;       // non-maximum suppression grid cell (px, analysis scale)
  const MIN_SEP = 22;    // minimum separation between spots (px, analysis scale)
  const MAX_SPOTS = 36;

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) {
        reject(new Error("not-an-image"));
        return;
      }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode-failed")); };
      img.src = url;
    });
  }

  function analyzeImage(img) {
    const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;

    // brightness stats for an adaptive threshold
    let sum = 0, sum2 = 0;
    const n = w * h;
    const bright = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const b = (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3;
      bright[i] = b;
      sum += b; sum2 += b * b;
    }
    const mean = sum / n;
    const std = Math.sqrt(Math.max(0, sum2 / n - mean * mean));
    const thresh = Math.max(70, mean + 3.2 * std);

    // grid non-maximum suppression: brightest pixel per cell above threshold
    const cols = Math.ceil(w / CELL), rows = Math.ceil(h / CELL);
    const best = new Array(cols * rows).fill(null);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const b = bright[i];
        if (b < thresh) continue;
        const c = Math.floor(x / CELL) + Math.floor(y / CELL) * cols;
        const cur = best[c];
        if (!cur || b > cur.v) best[c] = { x, y, v: b };
      }
    }
    const cands = best.filter(Boolean).sort((a, b) => b.v - a.v);

    // greedy minimum separation, brightest first
    const spots = [];
    for (const c of cands) {
      if (spots.length >= MAX_SPOTS) break;
      let ok = true;
      for (const s of spots) {
        const dx = c.x - s.x, dy = c.y - s.y;
        if (dx * dx + dy * dy < MIN_SEP * MIN_SEP) { ok = false; break; }
      }
      if (ok) spots.push(c);
    }
    return { spots, w, h, img, thresh };
  }

  // Draw the photo fitted into displayCanvas and overlay numbered markers.
  function renderResult(displayCanvas, result) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const cssW = displayCanvas.clientWidth;
    const img = result.img;
    const fitScale = cssW / img.naturalWidth;
    const cssH = img.naturalHeight * fitScale;
    displayCanvas.style.height = cssH + "px";
    displayCanvas.width = Math.round(cssW * dpr);
    displayCanvas.height = Math.round(cssH * dpr);
    const ctx = displayCanvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(img, 0, 0, cssW, cssH);

    const ax = cssW / result.w; // analysis -> display scale
    const ay = cssH / result.h;
    ctx.font = "600 11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    result.spots.forEach((s, idx) => {
      const x = s.x * ax, y = s.y * ay;
      const r = 10 + Math.min(8, (s.v - result.thresh) / 40);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,217,138,0.9)";
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = "#ffd98a";
      ctx.fill();
      ctx.fillStyle = "rgba(255,217,138,0.95)";
      ctx.fillText(String(idx + 1), x, y - r - 8);
    });
  }

  async function analyze(file) {
    const img = await loadImage(file);
    return analyzeImage(img);
  }

  return { analyze, renderResult };
})();
