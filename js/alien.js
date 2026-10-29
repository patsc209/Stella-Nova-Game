/**
 * ReGrade alien avatar — SVG builder from options.
 */
(function (global) {
  const DEFAULT_ALIEN = {
    shape: "round", // round | pear | tall
    antenna: "double", // none | single | double | curly | star
    eyes: "big", // dots | big | happy
    spots: "few", // none | few | many | stars
    colour: "#7c6cf0",
    hat: "none", // none | wizard
    outfit: "none", // none | suit
  };

  const COLOURS = ["#7c6cf0", "#5b8cff", "#ff7a9a", "#ff9a4a", "#3ecf8e", "#4fd1c5"];

  function mergeAlien(partial) {
    return Object.assign({}, DEFAULT_ALIEN, partial || {});
  }

  function shade(hex, percent) {
    if (!hex || hex[0] !== "#") return "#5b4db8";
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + percent));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + percent));
    const b = Math.min(255, Math.max(0, (num & 0xff) + percent));
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function bodyPath(shape) {
    if (shape === "pear") {
      return "M60 28 C88 28 104 52 100 78 C96 108 78 122 60 122 C42 122 24 108 20 78 C16 52 32 28 60 28 Z";
    }
    if (shape === "tall") {
      return "M60 22 C82 22 96 40 94 70 C92 108 78 128 60 128 C42 128 28 108 26 70 C24 40 38 22 60 22 Z";
    }
    return "M60 30 C90 30 108 52 108 78 C108 110 88 128 60 128 C32 128 12 110 12 78 C12 52 30 30 60 30 Z";
  }

  function antennaSvg(antenna, colour) {
    const dark = shade(colour, -35);
    if (antenna === "none") return "";
    if (antenna === "single") {
      return `<path d="M60 30 C60 12 60 8 60 4" stroke="${dark}" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="60" cy="4" r="6" fill="#ffd56a"/>`;
    }
    if (antenna === "curly") {
      return `<path d="M46 34 C30 18 42 2 54 14" stroke="${dark}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M74 34 C90 18 78 2 66 14" stroke="${dark}" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="54" cy="12" r="5" fill="#ffd56a"/><circle cx="66" cy="12" r="5" fill="#ffd56a"/>`;
    }
    if (antenna === "star") {
      return `<path d="M42 34 C34 18 34 8 36 4" stroke="${dark}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M78 34 C86 18 86 8 84 4" stroke="${dark}" stroke-width="4" fill="none" stroke-linecap="round"/><polygon points="36,-2 37.6,3.2 43,3.6 39,7 40,12.4 36,10 32,12.4 33,7 29,3.6 34.4,3.2" fill="#ffd56a"/><polygon points="84,-2 85.6,3.2 91,3.6 87,7 88,12.4 84,10 80,12.4 81,7 77,3.6 82.4,3.2" fill="#ffd56a"/>`;
    }
    return `<path d="M42 34 C34 18 34 8 36 4" stroke="${dark}" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M78 34 C86 18 86 8 84 4" stroke="${dark}" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="36" cy="4" r="6" fill="#ffd56a"/><circle cx="84" cy="4" r="6" fill="#ffd56a"/>`;
  }

  function eyesSvg(eyes) {
    if (eyes === "dots") {
      return `<circle cx="46" cy="70" r="5" fill="#1b2440"/><circle cx="74" cy="70" r="5" fill="#1b2440"/>`;
    }
    if (eyes === "happy") {
      return `<path d="M38 72 Q46 64 54 72" stroke="#1b2440" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M66 72 Q74 64 82 72" stroke="#1b2440" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    }
    return `<circle cx="46" cy="70" r="11" fill="#fff"/><circle cx="74" cy="70" r="11" fill="#fff"/><circle cx="48" cy="72" r="5" fill="#1b2440"/><circle cx="76" cy="72" r="5" fill="#1b2440"/>`;
  }

  function starMark(cx, cy, r, fill) {
    return `<polygon points="${cx},${cy - r} ${cx + r * 0.3},${cy - r * 0.3} ${cx + r},${cy - r * 0.2} ${cx + r * 0.45},${cy + r * 0.15} ${cx + r * 0.6},${cy + r} ${cx},${cy + r * 0.45} ${cx - r * 0.6},${cy + r} ${cx - r * 0.45},${cy + r * 0.15} ${cx - r},${cy - r * 0.2} ${cx - r * 0.3},${cy - r * 0.3}" fill="${fill}"/>`;
  }

  function spotsSvg(spots, colour) {
    const spot = shade(colour, -40);
    if (spots === "none") return "";
    if (spots === "stars") {
      return starMark(38, 92, 7, "#ffd56a") + starMark(78, 88, 8, "#ffd56a") + starMark(58, 104, 5, "#fff3b0");
    }
    if (spots === "many") {
      return `<circle cx="34" cy="88" r="5" fill="${spot}" opacity="0.55"/><circle cx="48" cy="102" r="4" fill="${spot}" opacity="0.55"/><circle cx="72" cy="98" r="6" fill="${spot}" opacity="0.55"/><circle cx="88" cy="84" r="4" fill="${spot}" opacity="0.55"/><circle cx="60" cy="90" r="3.5" fill="${spot}" opacity="0.45"/>`;
    }
    return `<circle cx="38" cy="92" r="5" fill="${spot}" opacity="0.55"/><circle cx="78" cy="88" r="6" fill="${spot}" opacity="0.55"/><circle cx="58" cy="104" r="4" fill="${spot}" opacity="0.45"/>`;
  }

  function hatSvg(hat) {
    if (hat !== "wizard") return "";
    return `<ellipse cx="60" cy="38" rx="36" ry="9" fill="#2c2458"/><path d="M32 38 L60 0 L88 38 Z" fill="#4c3f92"/>${starMark(52, 18, 4, "#ffe27a")}${starMark(70, 14, 3, "#fff")}`;
  }

  function suitBody(outfit) {
    if (outfit !== "suit") return "";
    return `<path d="M24 102 Q60 84 96 102 L100 128 Q60 136 20 128 Z" fill="#e7edff"/><rect x="48" y="106" width="24" height="14" rx="4" fill="#6d8dff"/><circle cx="60" cy="113" r="3" fill="#fff"/>`;
  }

  function suitHelmet(outfit) {
    if (outfit !== "suit") return "";
    return `<ellipse cx="60" cy="64" rx="40" ry="34" fill="none" stroke="#f7f8ff" stroke-width="6"/>`;
  }

  function toSvg(alienInput, size) {
    const a = mergeAlien(alienInput);
    const s = size || 120;
    const rainbow = a.colour === "rainbow";
    const dark = shade(rainbow ? "#7c6cf0" : a.colour, -25);
    const light = shade(rainbow ? "#7c6cf0" : a.colour, 40);
    const gid = "ag" + Math.random().toString(36).slice(2, 8);
    const fill = rainbow ? "url(#" + gid + ")" : a.colour;
    const defs = rainbow
      ? `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c6cf0"/><stop offset="0.5" stop-color="#5b8cff"/><stop offset="1" stop-color="#ff7a9a"/></linearGradient></defs>`
      : "";
    return `
<svg viewBox="0 0 120 140" width="${s}" height="${s * 1.16}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  ${defs}
  ${antennaSvg(a.antenna, rainbow ? "#7c6cf0" : a.colour)}
  <path d="${bodyPath(a.shape)}" fill="${fill}"/>
  <ellipse cx="44" cy="58" rx="14" ry="10" fill="${light}" opacity="0.35"/>
  ${suitBody(a.outfit)}
  ${spotsSvg(a.spots, rainbow ? "#7c6cf0" : a.colour)}
  ${eyesSvg(a.eyes)}
  <path d="M50 92 Q60 102 70 92" stroke="${dark}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  ${suitHelmet(a.outfit)}
  ${hatSvg(a.hat)}
</svg>`;
  }

  function renderInto(el, alien, size) {
    if (!el) return;
    el.innerHTML = toSvg(alien, size);
  }

  global.ReGradeAlien = {
    DEFAULT_ALIEN,
    COLOURS,
    mergeAlien,
    toSvg,
    renderInto,
  };
})(window);
