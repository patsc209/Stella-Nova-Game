/* Stella Nova tablet — onboarding + solar home + star-slash sync */

(function () {
  const PLANETS = [
    {
      id: "sun",
      name: "Sun",
      game: "Star Slash",
      gameType: "stars",
      blurb: "Slash rising stars for 20 seconds — first world",
      colour: "#ffb84d",
      playable: true,
      sun: true,
      tvPage: "game.html",
    },
    {
      id: "mercury",
      name: "Mercury",
      game: "Orbit Rally",
      gameType: "orbit",
      blurb: "Air-hockey with your arms — unlocks after the Sun",
      colour: "#c5c9d1",
      playable: true,
      tvPage: "orbit.html",
    },
    {
      id: "venus",
      name: "Venus",
      game: "Orbit Rally",
      gameType: "orbit",
      blurb: "Orbit Rally in a brighter arena",
      colour: "#c4894a",
      playable: true,
      tvPage: "orbit.html",
    },
    {
      id: "earth",
      name: "Earth",
      game: "Orbit Rally",
      gameType: "orbit",
      blurb: "Home-world Orbit Rally",
      colour: "#3a74e0",
      playable: true,
      tvPage: "orbit.html",
    },
    {
      id: "mars",
      name: "Mars",
      game: "Orbit Rally",
      gameType: "orbit",
      blurb: "Red-planet Orbit Rally",
      colour: "#e23b32",
      playable: true,
      tvPage: "orbit.html",
    },
    {
      id: "jupiter",
      name: "Jupiter",
      game: "Orbit Rally",
      gameType: "orbit",
      blurb: "Giant-world Orbit Rally",
      colour: "#f07828",
      playable: true,
      tvPage: "orbit.html",
    },
    {
      id: "saturn",
      name: "Saturn",
      game: "Orbit Rally",
      gameType: "orbit",
      blurb: "Ringed Orbit Rally",
      colour: "#e08a3a",
      playable: true,
      rings: true,
      tvPage: "orbit.html",
    },
    {
      id: "uranus",
      name: "Uranus",
      game: "Orbit Rally",
      gameType: "orbit",
      blurb: "Cool Orbit Rally",
      colour: "#5ed6a2",
      playable: true,
      tvPage: "orbit.html",
    },
    {
      id: "neptune",
      name: "Neptune",
      game: "Orbit Rally",
      gameType: "orbit",
      blurb: "Deep-space Orbit Rally finale",
      colour: "#3a62d8",
      playable: true,
      tvPage: "orbit.html",
    },
  ];

  const PRESETS = [
    { shape: "round", antenna: "double", eyes: "big", spots: "few", colour: "#7c6cf0" },
    { shape: "pear", antenna: "single", eyes: "happy", spots: "none", colour: "#3ecf8e" },
    { shape: "tall", antenna: "curly", eyes: "dots", spots: "many", colour: "#ff7a9a" },
    { shape: "round", antenna: "none", eyes: "big", spots: "few", colour: "#ff9a4a" },
  ];

  const OPTION_MAP = {
    shape: [
      { id: "round", label: "Round" },
      { id: "pear", label: "Pear" },
      { id: "tall", label: "Tall" },
    ],
    antenna: [
      { id: "none", label: "None" },
      { id: "single", label: "Single" },
      { id: "double", label: "Double" },
      { id: "curly", label: "Curly" },
    ],
    eyes: [
      { id: "dots", label: "Dots" },
      { id: "big", label: "Big" },
      { id: "happy", label: "Happy" },
    ],
    spots: [
      { id: "none", label: "None" },
      { id: "few", label: "Few" },
      { id: "many", label: "Many" },
    ],
    colour: ReGradeAlien.COLOURS.map((c) => ({ id: c, label: c, swatch: true })),
  };

  const CATALOG = [
    { id: "hat-wizard", name: "Hat", slot: "hat", value: "wizard", price: 600, group: "featured", cat: "hat" },
    { id: "outfit-suit", name: "Outfit", slot: "outfit", value: "suit", price: 1000, group: "featured", cat: "outfit" },
    { id: "antenna-star", name: "Antenna", slot: "antenna", value: "star", price: 300, group: "daily", cat: "antenna" },
    { id: "eyes-big", name: "Eyes", slot: "eyes", value: "big", price: 0, group: "daily", cat: "eyes" },
    { id: "spots-stars", name: "Spots", slot: "spots", value: "stars", price: 400, group: "daily", cat: "spots" },
    { id: "colour-aurora", name: "Colour", slot: "colour", value: "rainbow", price: 500, group: "daily", cat: "colour" },
  ];

  const Auth = window.StellaNovaAuth || window.ReGradeAuth;

  const screens = {};
  document.querySelectorAll(".screen").forEach((el) => {
    screens[el.dataset.screen] = el;
  });

  const bottomNav = document.getElementById("bottom-nav");
  const shell = document.getElementById("tablet-shell");
  const connDot = document.getElementById("conn-dot");
  const connLabel = document.getElementById("conn-label");

  let sync = null;
  let room = "";
  let alienDraft = ReGradeAlien.mergeAlien(null);
  let alienCat = "colour";
  let shopTab = "customise";
  let tryingNote = "";
  let selectedPlanetId = "sun";
  let selectedPlayMode = "solo"; // solo | multi
  let lastAwardedScore = null;
  let lastUnlockMessage = "";
  let awaitingStart = false;
  let howtoPage = 0;

  const roomInputs = Array.from(document.querySelectorAll("#room-inputs input"));

  function showScreen(name) {
    Object.keys(screens).forEach((key) => {
      screens[key].classList.toggle("active", key === name);
    });
    const mainTabs = ["home", "explore", "stats", "settings"];
    const showNav = mainTabs.includes(name);
    bottomNav.hidden = !showNav;
    shell.classList.toggle("nav-visible", showNav);
    document.body.classList.toggle("on-home", name === "home");
    shell.classList.toggle("on-home", name === "home");
    document.body.classList.toggle("on-intro", name === "intro");
    shell.classList.toggle("on-intro", name === "intro");
    paintStars();
    if (name === "settings") renderProfileCard();
    if (showNav) {
      bottomNav.querySelectorAll(".nav-item").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.nav === name);
      });
    }
  }

  function paintStars(amount) {
    const chip = document.getElementById("header-stars");
    const count = document.getElementById("header-star-count");
    const user = Auth.getCurrentUser();
    if (chip) chip.hidden = !user;
    const stars = amount != null ? amount : (user && user.stars) || 0;
    if (count) count.textContent = String(stars);
    const profile = document.getElementById("btn-profile");
    if (profile) profile.hidden = !user;
    if (user) ReGradeAlien.renderInto(document.getElementById("header-alien"), user.alien, 32);
  }

  function renderProfileCard() {
    const user = Auth.getCurrentUser();
    if (!user) return;
    const name = document.getElementById("settings-name");
    if (name) name.textContent = user.name || "Explorer";
    ReGradeAlien.renderInto(document.getElementById("settings-alien"), user.alien, 72);
  }

  function ownsItem(user, item) {
    if (!item || item.price === 0) return true;
    return ((user && user.ownedItems) || []).includes(item.id);
  }

  function catalogItem(slot, value) {
    return CATALOG.find((item) => item.slot === slot && item.value === value) || null;
  }

  function setConnected(ok, label) {
    connDot.classList.toggle("ok", !!ok);
    connLabel.textContent = label;
  }

  function isUnlocked(user, id) {
    const unlocked = new Set((user && user.unlockedPlanets) || ["sun"]);
    return unlocked.has(id);
  }

  function refreshWelcomeMascot() {
    ReGradeAlien.renderInto(
      document.getElementById("welcome-mascot"),
      { shape: "pear", antenna: "double", eyes: "big", spots: "few", colour: "#3ecf8e" },
      150
    );
    ReGradeAlien.renderInto(
      document.getElementById("signup-mascot"),
      { shape: "round", antenna: "double", eyes: "big", spots: "few", colour: "#7c6cf0" },
      72
    );
  }

  function routeFromAuth() {
    const user = Auth.getCurrentUser();
    if (!user) {
      showScreen("welcome");
      return;
    }
    if (!user.name || !user.onboardedProfile) {
      document.getElementById("profile-name").value = user.name || "";
      ReGradeAlien.renderInto(document.getElementById("profile-avatar-preview"), user.alien || alienDraft, 88);
      showScreen("profile");
      return;
    }
    if (!user.alien) {
      alienDraft = ReGradeAlien.mergeAlien(null);
      renderAlienCreator();
      showScreen("alien");
      return;
    }
    if (!user.introSeen) Auth.updateCurrentUser({ introSeen: true });
    renderHome(user);
    showScreen("home");
  }

  function renderHome(user) {
    user = user || Auth.getCurrentUser();
    if (!user) return;
    const unlockedCount = (user.unlockedPlanets || ["sun"]).length;
    const hasProgress = unlockedCount > 1 || (user.stars || 0) > 0;
    document.getElementById("home-caption").textContent = "Tap the Sun to play.";
    document.getElementById("home-tip").textContent = hasProgress
      ? "Score " + Auth.UNLOCK_SCORE + "+ stars in a round to open the next world."
      : "Locked worlds open after a round earns enough stars.";
    renderSolarStage(user);
  }

  function renderSolarStage(user) {
    const stage = document.getElementById("solar-stage");
    const layout = [
      { id: "sun", x: 9, y: 54, r: 100 },
      { id: "mercury", x: 26, y: 62, r: 32 },
      { id: "venus", x: 34, y: 36, r: 52 },
      { id: "earth", x: 43, y: 66, r: 44 },
      { id: "mars", x: 51, y: 26, r: 34 },
      { id: "jupiter", x: 61, y: 38, r: 76 },
      { id: "saturn", x: 73, y: 68, r: 58 },
      { id: "uranus", x: 83, y: 32, r: 50 },
      { id: "neptune", x: 92, y: 58, r: 48 },
    ];
    const order = Auth.WORLD_ORDER || PLANETS.map((p) => p.id);
    const unlocked = order.filter((id) => isUnlocked(user, id));
    const nextId = order.find((id) => !isUnlocked(user, id)) || null;
    const celebrateId = sessionStorage.getItem("stella-nova:celebrate-unlock");
    const linePoints = (pts) => pts.map((p) => p.x + "," + p.y).join(" ");
    const storyPts = linePoints(layout);
    const trailPts = linePoints(layout.filter((p) => unlocked.includes(p.id)));
    const last = layout.find((p) => p.id === unlocked[unlocked.length - 1]) || layout[0];
    const lock = `<span class="sol-lock" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2" fill="#fff"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg></span>`;

    const bodies = layout
      .map((p) => {
        const meta = PLANETS.find((x) => x.id === p.id);
        const open = isUnlocked(user, p.id);
        const rings = meta && meta.rings ? " rings" : "";
        const sunClass = meta && meta.sun ? " sun" : " planet";
        const celebrate = celebrateId === p.id ? " just-unlocked" : "";
        const nextClass = !open && p.id === nextId ? " is-next" : "";
        let label = "";
        if (meta.sun && open) label = `<span class="sol-label play">Play</span>`;
        else if (open) label = `<span class="sol-label">${meta.name}</span>`;
        else if (p.id === nextId) label = `<span class="sol-label next">Next</span>`;
        return `<div class="sol-spot" style="left:${p.x}%;top:${p.y}%">
          <button class="sol-body${sunClass}${rings}${open ? " unlocked" : " locked"}${nextClass}${celebrate}" type="button" data-planet="${p.id}" style="width:${p.r * 2}px;height:${p.r * 2}px;--p:${meta.colour}" title="${meta.name}">${open ? "" : lock}${label}</button>
        </div>`;
      })
      .join("");

    stage.innerHTML =
      `<svg class="sol-trail" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline class="sol-path" points="${storyPts}"/><polyline class="sol-path-done" points="${trailPts}"/></svg>` +
      bodies +
      `<div class="sol-you" style="left:${last.x}%;top:${last.y}%;--lift:${last.r + 6}px">
        <div class="sol-pin" id="map-alien"></div>
        <svg class="sol-ship" viewBox="0 0 48 28" aria-hidden="true"><ellipse cx="24" cy="16" rx="16" ry="6" fill="#e7eeff"/><ellipse cx="24" cy="13" rx="7" ry="6" fill="#8fd0ff"/><circle cx="24" cy="13" r="2.5" fill="#1c2340"/></svg>
      </div>`;
    ReGradeAlien.renderInto(document.getElementById("map-alien"), user.alien, 34);

    stage.querySelectorAll("[data-planet]").forEach((btn) => {
      btn.addEventListener("click", () => openPlanet(btn.dataset.planet));
    });

    if (celebrateId) {
      const toast = document.getElementById("unlock-toast");
      const world = PLANETS.find((p) => p.id === celebrateId);
      if (toast && world) {
        toast.textContent = "New world: " + world.name + " is on your map.";
        toast.hidden = false;
        toast.classList.add("show");
        setTimeout(() => {
          toast.classList.remove("show");
          toast.hidden = true;
        }, 3200);
      }
      sessionStorage.removeItem("stella-nova:celebrate-unlock");
    }
  }

  function renderExplore() {
    const user = Auth.getCurrentUser();
    const cards = document.getElementById("planet-cards");
    cards.innerHTML = PLANETS.map((p) => {
      const open = isUnlocked(user, p.id);
      return `
        <article class="planet-card ${open ? "" : "is-locked"}" data-planet="${p.id}">
          <div class="planet-orb ${p.rings ? "rings" : ""} ${p.sun ? "is-sun" : ""}" style="--p:${p.colour}"></div>
          <div class="planet-card-body">
            <h3>${open ? p.name : "???"}</h3>
            <p class="game-name">${open ? p.game : "A new world awaits"}</p>
            <p>${open ? p.blurb : "Coming soon — tap to learn how to unlock"}</p>
            ${
              open && p.playable
                ? `<button class="btn btn-regrade btn-block planet-play" type="button" data-play="${p.id}">Play</button>`
                : `<button class="btn btn-ghost btn-block planet-locked-info" type="button" data-locked="${p.id}">Why locked?</button>`
            }
          </div>
        </article>`;
    }).join("");

    cards.querySelectorAll("[data-play]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        openPlanet(btn.dataset.play);
      });
    });
    cards.querySelectorAll("[data-locked]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        openPlanet(btn.dataset.locked);
      });
    });
    cards.querySelectorAll(".planet-card").forEach((card) => {
      card.addEventListener("click", () => openPlanet(card.dataset.planet));
    });
  }

  function openPlanet(id) {
    const user = Auth.getCurrentUser();
    const p = PLANETS.find((x) => x.id === id);
    if (!p) return;
    if (!isUnlocked(user, id)) {
      const order = Auth.WORLD_ORDER || PLANETS.map((x) => x.id);
      const idx = order.indexOf(id);
      const prevId = idx > 0 ? order[idx - 1] : null;
      const prev = PLANETS.find((x) => x.id === prevId);
      showPlanetModal({
        planet: p,
        locked: true,
        title: p.name + " is locked",
        body: prev
          ? "Score ✦ " +
            Auth.UNLOCK_SCORE +
            "+ stars in one round on " +
            prev.name +
            " to unlock " +
            p.name +
            "."
          : "Score ✦ " + Auth.UNLOCK_SCORE + "+ stars in a round to unlock new worlds.",
        primaryLabel: "Got it",
        onPrimary: hidePlanetModal,
      });
      return;
    }
    showPlanetModal({
      planet: p,
      locked: false,
      title: "Play " + p.name + "?",
      body:
        p.gameType === "stars"
          ? "Slash rising stars for 20 seconds. Your hands in front of the TV do the slashing."
          : p.blurb + " Your hands in front of the TV move your alien.",
      primaryLabel: "Play " + p.game,
      secondaryLabel: "Not now",
      onPrimary: () => {
        hidePlanetModal();
        startPlanetPlay(id);
      },
      onSecondary: hidePlanetModal,
    });
  }

  let modalAction = null;
  let modalSecondaryAction = null;

  function showPlanetModal({ planet, locked, title, body, primaryLabel, secondaryLabel, onPrimary, onSecondary }) {
    const modal = document.getElementById("planet-modal");
    const orb = document.getElementById("modal-orb");
    const primary = document.getElementById("modal-primary");
    const secondary = document.getElementById("modal-secondary");
    document.getElementById("modal-title").textContent = title;
    document.getElementById("modal-body").textContent = body;
    orb.style.setProperty("--p", planet.colour);
    orb.classList.toggle("locked", !!locked);
    primary.textContent = primaryLabel || "Got it";
    modalAction = onPrimary || hidePlanetModal;
    if (secondaryLabel) {
      secondary.hidden = false;
      secondary.textContent = secondaryLabel;
      modalSecondaryAction = onSecondary || hidePlanetModal;
    } else {
      secondary.hidden = true;
      modalSecondaryAction = null;
    }
    modal.hidden = false;
  }

  function hidePlanetModal() {
    document.getElementById("planet-modal").hidden = true;
    modalAction = null;
    modalSecondaryAction = null;
  }

  function startPlanetPlay(id) {
    selectedPlanetId = id;
    const user = Auth.getCurrentUser();
    const world = PLANETS.find((p) => p.id === id);
    document.getElementById("player-name").value = (user && user.name) || "Player";
    document.getElementById("mode-game-label").textContent = world ? world.game : "Pick a mode";

    const multiCard = document.querySelector(".mode-card.mode-multi");
    const multiBtn = document.getElementById("btn-mode-multi");
    const soloOnly = world && world.gameType === "stars";
    if (soloOnly) selectedPlayMode = "solo";
    if (multiCard) multiCard.classList.toggle("is-disabled", !!soloOnly);
    if (multiBtn) {
      multiBtn.disabled = !!soloOnly;
      multiBtn.textContent = soloOnly ? "Multiplayer locked" : "Play with others";
    }
    const modeNote = document.getElementById("mode-lock-note");
    if (modeNote) modeNote.hidden = true;
    showScreen("mode");
  }

  function goToConnect() {
    const hint = document.getElementById("connect-hint");
    hint.textContent =
      "The code is on the TV. Your hands in front of that camera play — tapping here does not.";
    showScreen("connect");
  }

  const RANKS = [
    { level: 1, name: "Explorer", nextAt: 100, nextName: "Commander", look: "explorer" },
    { level: 2, name: "Commander", nextAt: 400, nextName: "Ruler", look: "commander" },
    { level: 3, name: "Ruler", nextAt: null, nextName: "", look: "ruler" },
  ];

  function rankForStars(stars) {
    if (stars >= 400) return RANKS[2];
    if (stars >= 100) return RANKS[1];
    return RANKS[0];
  }

  function rankPortrait(look) {
    const extra =
      look === "commander"
        ? `<path d="M38 34 h44 l-6 14 h-32z" fill="#f0c14a"/><circle cx="60" cy="30" r="6" fill="#f0c14a"/>`
        : look === "ruler"
          ? `<path d="M34 28 l8 16 h36 l8-16 -12 8 -14-16 -14 16z" fill="#f0c14a"/><path d="M28 78 h64 v18 h-64z" fill="#e23b4a"/>`
          : `<rect x="34" y="40" width="52" height="14" rx="7" fill="#16324f"/><circle cx="46" cy="47" r="6" fill="#7ec8ff"/><circle cx="74" cy="47" r="6" fill="#7ec8ff"/><path d="M40 92 h40 l6 16 h-52z" fill="#e07040"/>`;
    return `<svg viewBox="0 0 120 140" aria-hidden="true"><ellipse cx="60" cy="78" rx="36" ry="34" fill="#7c6cf0"/><circle cx="48" cy="74" r="6" fill="#fff"/><circle cx="72" cy="74" r="6" fill="#fff"/><circle cx="48" cy="75" r="3" fill="#16324f"/><circle cx="72" cy="75" r="3" fill="#16324f"/><path d="M50 90 Q60 98 70 90" stroke="#16324f" stroke-width="3" fill="none" stroke-linecap="round"/>${extra}</svg>`;
  }

  function renderStats() {
    const user = Auth.getCurrentUser();
    if (!user) return;
    const stars = user.stars || 0;
    const rank = rankForStars(stars);
    const next = RANKS.find((item) => item.level === rank.level + 1);
    document.getElementById("stats-level").textContent = String(rank.level);
    document.getElementById("rank-kicker").textContent = "Level " + rank.level;
    document.getElementById("rank-name").textContent = rank.name;
    document.getElementById("stat-stars").textContent = String(stars);
    const progress = document.getElementById("rank-progress");
    const fill = document.getElementById("rank-bar-fill");
    if (next) {
      progress.textContent = stars + "/" + rank.nextAt + " ★ to " + rank.nextName;
      fill.style.width = Math.min(100, Math.round((stars / rank.nextAt) * 100)) + "%";
    } else {
      progress.textContent = "Max level";
      fill.style.width = "100%";
    }
    ReGradeAlien.renderInto(document.getElementById("stats-alien"), user.alien, 120);
    const nextArt = document.getElementById("stats-next-art");
    nextArt.innerHTML = next
      ? rankPortrait(next.look)
      : `<p class="rank-max">Max level</p>`;
    document.getElementById("rank-row").innerHTML = RANKS.map((item) => {
      const open = stars >= (item.level === 1 ? 0 : item.level === 2 ? 100 : 400);
      const current = item.level === rank.level;
      const line = item.nextAt
        ? stars + "/" + item.nextAt + " ★ to " + item.nextName
        : "Max level";
      return `<article class="rank-card${current ? " is-current" : ""}${open ? "" : " is-locked"}">
        ${rankPortrait(item.look)}
        <p class="rank-kicker">Level ${item.level}</p>
        <h3>${item.name}</h3>
        <p class="rank-progress">${open ? line : "Locked"}</p>
        <div class="rank-bar" aria-hidden="true"><span style="width:${open && item.nextAt ? Math.min(100, Math.round((stars / item.nextAt) * 100)) : open ? 100 : 0}%"></span></div>
      </article>`;
    }).join("");
  }

  function renderStarsChart(history) {
    const svg = document.getElementById("stars-chart");
    const subtitle = document.getElementById("chart-subtitle");
    const delta = document.getElementById("chart-delta");
    if (!svg) return;

    const sessions = history
      .filter((h) => (h.game || "").toLowerCase().includes("star") || !h.gameType || h.gameType === "stars")
      .slice(0, 7)
      .reverse();

    // If no star-specific filter matches, fall back to last 7 sessions
    const points = (sessions.length ? sessions : history.slice(0, 7).reverse()).map((h) => h.stars || 0);

    if (!points.length) {
      svg.innerHTML =
        '<text x="160" y="60" text-anchor="middle" fill="#8a93b5" font-size="13">No Star Slash rounds yet</text>';
      subtitle.textContent = "Play the Sun to start your trail";
      delta.textContent = "✦ 0";
      return;
    }

    const w = 320;
    const h = 120;
    const padL = 18;
    const padR = 18;
    const padT = 18;
    const padB = 28;
    const maxV = Math.max(10, ...points);
    const stepX = points.length === 1 ? 0 : (w - padL - padR) / (points.length - 1);
    const coords = points.map((v, i) => {
      const x = padL + i * stepX;
      const y = padT + (1 - v / maxV) * (h - padT - padB);
      return { x, y, v };
    });

    const polyline = coords.map((c) => c.x + "," + c.y).join(" ");
    const dots = coords
      .map((c, i) => {
        const big = i === coords.length - 1;
        return `<circle cx="${c.x}" cy="${c.y}" r="${big ? 7 : 4}" fill="#5b8cff"/>`;
      })
      .join("");
    const labels = coords
      .map((c, i) => {
        const label = i === coords.length - 1 ? "Today" : "R" + (i + 1);
        return `<text x="${c.x}" y="${h - 8}" text-anchor="middle" fill="#8a93b5" font-size="11">${label}</text>`;
      })
      .join("");

    svg.innerHTML =
      `<polyline fill="none" stroke="#5b8cff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" points="${polyline}"/>` +
      dots +
      labels;

    const last = points[points.length - 1];
    const prev = points.length > 1 ? points[points.length - 2] : 0;
    const diff = last - prev;
    delta.textContent = "✦ " + last;
    subtitle.textContent =
      points.length > 1
        ? (diff >= 0 ? "+" : "") + diff + " vs previous round"
        : "First recorded round";
  }

  function renderAlienCreator() {
    const user = Auth.getCurrentUser();
    ReGradeAlien.renderInto(document.getElementById("alien-preview"), alienDraft, 220);
    paintStars();
    const note = document.getElementById("shop-note");
    if (note) note.textContent = tryingNote;

    document.querySelectorAll("#shop-tabs button").forEach((btn) => {
      btn.classList.toggle("on", btn.dataset.shop === shopTab);
    });
    document.querySelectorAll("#alien-cats .cat").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.cat === alienCat);
    });
    const cats = document.getElementById("alien-cats");
    if (cats) cats.hidden = shopTab === "wardrobe";

    const saveBtn = document.getElementById("btn-alien-save");
    if (saveBtn) saveBtn.textContent = user && user.introSeen ? "Save" : "Start Exploring";

    const presets = document.getElementById("alien-presets");
    presets.hidden = shopTab !== "customise";
    presets.innerHTML = PRESETS.map((p, i) => {
      return `<button class="preset-btn" type="button" data-preset="${i}" aria-label="Alien look ${i + 1}">${ReGradeAlien.toSvg(Object.assign({}, alienDraft, p), 42)}</button>`;
    }).join("");
    presets.querySelectorAll("[data-preset]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const look = PRESETS[Number(btn.dataset.preset)];
        alienDraft = ReGradeAlien.mergeAlien(Object.assign({}, alienDraft, look));
        tryingNote = "Trying this look. Save to keep the free parts.";
        renderAlienCreator();
      });
    });

    const options = document.getElementById("alien-options");
    if (shopTab === "shop") {
      options.innerHTML = renderShopRails(user);
    } else if (shopTab === "wardrobe") {
      options.innerHTML = renderWardrobe(user);
    } else {
      options.innerHTML = renderCustomise(user);
    }
    options.querySelectorAll("[data-val]").forEach((btn) => {
      btn.addEventListener("click", () => {
        alienDraft[alienCat] = btn.dataset.val;
        tryingNote = "";
        renderAlienCreator();
      });
    });
    options.querySelectorAll("[data-try]").forEach((btn) => {
      btn.addEventListener("click", () => previewItem(btn.dataset.try));
    });
    options.querySelectorAll("[data-buy]").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.stopPropagation();
        buyItem(btn.dataset.buy);
      });
    });
  }

  function renderCustomise(user) {
    const ownedExtras = CATALOG.filter((item) => item.cat === alienCat && ownsItem(user, item));
    const free = (OPTION_MAP[alienCat] || []).map((o) => ({ id: o.id, label: o.label, swatch: o.swatch, slot: alienCat }));
    if (alienCat === "hat" || alienCat === "outfit") {
      free.unshift({ id: "none", label: "None", slot: alienCat });
    }
    const buttons = free
      .map((o) => {
        const active = alienDraft[alienCat] === o.id;
        if (o.swatch) {
          return `<button class="opt swatch ${active ? "active" : ""}" type="button" data-val="${o.id}" style="--sw:${o.id}" aria-label="${o.id}"></button>`;
        }
        return `<button class="opt ${active ? "active" : ""}" type="button" data-val="${o.id}">${o.label}</button>`;
      })
      .join("");
    const extras = ownedExtras
      .map((item) => {
        const active = alienDraft[item.slot] === item.value;
        return `<button class="opt ${active ? "active" : ""}" type="button" data-val="${item.value}">${item.name}</button>`;
      })
      .join("");
    const shopHint =
      alienCat === "hat" || alienCat === "outfit" || alienCat === "colour"
        ? `<p class="muted shop-hint">Stars to spend come from playing.</p>`
        : "";
    return `<div class="customise-row">${buttons}${extras}</div>${shopHint}`;
  }

  function gearCard(item, user) {
    const owned = ownsItem(user, item);
    const wearing = alienDraft[item.slot] === item.value;
    const look = Object.assign({}, ReGradeAlien.DEFAULT_ALIEN, { [item.slot]: item.value });
    const price = item.price === 0 ? "Owned" : "★ " + item.price;
    const action = wearing && owned ? "Wearing" : wearing ? "Trying" : owned ? "Equip" : "Purchase";
    return `<article class="gear-card" data-try="${item.id}">
      <span class="gear-kicker">${item.name}</span>
      <div class="gear-art">${ReGradeAlien.toSvg(look, 78)}</div>
      <div class="gear-price">${price}</div>
      <button class="btn btn-buy" type="button" data-buy="${item.id}" ${wearing && owned ? "disabled" : ""}>${action}</button>
    </article>`;
  }

  function renderShopRails(user) {
    return `<div class="gear-row">${CATALOG.map((item) => gearCard(item, user)).join("")}</div>`;
  }

  function renderWardrobe(user) {
    const owned = CATALOG.filter((item) => ownsItem(user, item));
    if (!owned.length) {
      return `<p class="muted">Nothing saved yet. Buy a look in the shop, or customise the free parts.</p>`;
    }
    return `<div class="gear-row">${owned.map((item) => gearCard(item, user)).join("")}</div>`;
  }

  function previewItem(id) {
    const item = CATALOG.find((entry) => entry.id === id);
    if (!item) return;
    alienDraft[item.slot] = item.value;
    tryingNote = "Trying on " + item.name + ". Purchase to keep it.";
    renderAlienCreator();
  }

  function buyItem(id) {
    const user = Auth.getCurrentUser();
    const item = CATALOG.find((entry) => entry.id === id);
    if (!user || !item) return;
    alienDraft[item.slot] = item.value;
    if (ownsItem(user, item)) {
      tryingNote = item.name + " equipped.";
      Auth.updateCurrentUser({ alien: ReGradeAlien.mergeAlien(alienDraft) });
      renderAlienCreator();
      return;
    }
    if ((user.stars || 0) < item.price) {
      tryingNote = "You need " + item.price + " stars. Play Star Slash to earn more — you have " + (user.stars || 0) + ".";
      renderAlienCreator();
      return;
    }
    const next = Auth.spendStars(item.price);
    if (!next) {
      tryingNote = "Not enough stars yet.";
      renderAlienCreator();
      return;
    }
    const ownedItems = (user.ownedItems || []).concat(item.id);
    Auth.updateCurrentUser({ alien: ReGradeAlien.mergeAlien(alienDraft), ownedItems });
    tryingNote = "Bought " + item.name + ".";
    renderAlienCreator();
  }

  function keptAlien(user) {
    const clean = ReGradeAlien.mergeAlien(alienDraft);
    CATALOG.forEach((item) => {
      if (item.price > 0 && clean[item.slot] === item.value && !ownsItem(user, item)) {
        clean[item.slot] = ReGradeAlien.DEFAULT_ALIEN[item.slot];
      }
    });
    return clean;
  }

  function goNextTester() {
    if (sync) {
      sync.destroy();
      sync = null;
    }
    Auth.resetForNextTester();
    setConnected(false, "Not connected");
    lastAwardedScore = null;
    lastUnlockMessage = "";
    showScreen("welcome");
    refreshWelcomeMascot();
  }

  // ---- auth buttons ----
  document.getElementById("btn-goto-login").addEventListener("click", () => showScreen("login"));
  document.getElementById("btn-goto-signup").addEventListener("click", () => showScreen("signup"));
  document.getElementById("btn-login-back").addEventListener("click", () => showScreen("welcome"));
  document.getElementById("btn-signup-back").addEventListener("click", () => showScreen("welcome"));
  document.getElementById("btn-login-to-signup").addEventListener("click", () => showScreen("signup"));
  document.getElementById("btn-signup-to-login").addEventListener("click", () => showScreen("login"));

  document.getElementById("btn-login").addEventListener("click", () => {
    const err = document.getElementById("login-error");
    err.textContent = "";
    try {
      Auth.login({
        emailOrPhone: document.getElementById("login-id").value,
        password: document.getElementById("login-pass").value,
      });
      routeFromAuth();
    } catch (e) {
      err.textContent = e.message;
    }
  });

  document.getElementById("btn-signup").addEventListener("click", () => {
    const err = document.getElementById("signup-error");
    err.textContent = "";
    try {
      Auth.signup({
        emailOrPhone: document.getElementById("signup-id").value,
        password: document.getElementById("signup-pass").value,
      });
      showScreen("profile");
      ReGradeAlien.renderInto(document.getElementById("profile-avatar-preview"), alienDraft, 88);
    } catch (e) {
      err.textContent = e.message;
    }
  });

  document.getElementById("btn-profile-continue").addEventListener("click", () => {
    const err = document.getElementById("profile-error");
    err.textContent = "";
    const name = document.getElementById("profile-name").value.trim();
    if (!name) {
      err.textContent = "Tell us what to call you.";
      return;
    }
    Auth.updateCurrentUser({
      name,
      onboardedProfile: true,
    });
    alienDraft = ReGradeAlien.mergeAlien(Auth.getCurrentUser().alien);
    renderAlienCreator();
    showScreen("alien");
  });

  document.querySelectorAll("#alien-cats .cat").forEach((btn) => {
    btn.addEventListener("click", () => {
      alienCat = btn.dataset.cat;
      renderAlienCreator();
    });
  });

  const INTRO_LINES = [
    "You are an alien on your planet. You leave home to explore the galaxy.",
    "Each planet has a game.",
    "Each game lets you collect stars.",
    "Use the stars to unlock planets.",
    "Keep exploring to level up.",
  ];
  let introTimer = null;

  function playIntro(alien) {
    if (introTimer) clearInterval(introTimer);
    ReGradeAlien.renderInto(document.getElementById("intro-alien"), alien, 72);
    const caption = document.getElementById("intro-caption");
    const traveler = document.getElementById("intro-traveler");
    let step = 0;
    caption.textContent = INTRO_LINES[0];
    traveler.classList.remove("go");
    showScreen("intro");
    requestAnimationFrame(() => {
      void traveler.offsetWidth;
      traveler.classList.add("go");
    });
    introTimer = setInterval(() => {
      step += 1;
      if (step >= INTRO_LINES.length) {
        clearInterval(introTimer);
        introTimer = null;
        renderHome();
        showScreen("home");
        return;
      }
      caption.textContent = INTRO_LINES[step];
    }, 3000);
  }

  document.getElementById("btn-alien-save").addEventListener("click", () => {
    const clean = keptAlien(Auth.getCurrentUser());
    const firstTime = !Auth.getCurrentUser().introSeen;
    alienDraft = clean;
    tryingNote = "";
    Auth.updateCurrentUser({ alien: clean, onboarded: true, introSeen: true });
    if (firstTime) {
      playIntro(clean);
      return;
    }
    renderHome();
    showScreen("home");
  });

  document.querySelectorAll("#shop-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      shopTab = btn.dataset.shop;
      tryingNote = "";
      renderAlienCreator();
    });
  });

  document.getElementById("btn-try-on").addEventListener("click", () => {
    tryingNote = "Preview only. Purchase a paid look to keep it, then save.";
    const stage = document.querySelector(".alien-pedestal");
    if (stage) stage.classList.add("trying");
    renderAlienCreator();
  });

  function openShop() {
    const user = Auth.getCurrentUser();
    if (!user || !user.onboardedProfile) return;
    alienDraft = ReGradeAlien.mergeAlien(user.alien);
    shopTab = user.alien ? "shop" : "customise";
    tryingNote = "";
    renderAlienCreator();
    showScreen("alien");
  }

  document.getElementById("header-stars").addEventListener("click", openShop);
  document.getElementById("btn-profile").addEventListener("click", () => {
    if (!Auth.getCurrentUser()) return;
    showScreen("settings");
  });

  bottomNav.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.nav;
      if (tab === "home") renderHome();
      if (tab === "explore") renderExplore();
      if (tab === "stats") renderStats();
      showScreen(tab);
    });
  });

  document.getElementById("btn-explore").addEventListener("click", () => {
    renderExplore();
    showScreen("explore");
  });

  document.getElementById("btn-edit-alien").addEventListener("click", () => {
    const user = Auth.getCurrentUser();
    alienDraft = ReGradeAlien.mergeAlien(user && user.alien);
    renderAlienCreator();
    showScreen("alien");
  });

  document.getElementById("btn-stats-customise").addEventListener("click", () => {
    const user = Auth.getCurrentUser();
    if (!user) return;
    alienDraft = ReGradeAlien.mergeAlien(user.alien);
    shopTab = "customise";
    renderAlienCreator();
    showScreen("alien");
  });

  document.getElementById("btn-edit-profile").addEventListener("click", () => {
    const user = Auth.getCurrentUser();
    document.getElementById("profile-name").value = (user && user.name) || "";
    ReGradeAlien.renderInto(document.getElementById("profile-avatar-preview"), (user && user.alien) || alienDraft, 88);
    showScreen("profile");
  });

  document.getElementById("btn-logout").addEventListener("click", () => {
    Auth.logout();
    if (sync) {
      sync.destroy();
      sync = null;
    }
    setConnected(false, "Not connected");
    showScreen("welcome");
  });

  document.getElementById("btn-next-tester").addEventListener("click", goNextTester);
  document.getElementById("btn-reset-all").addEventListener("click", () => {
    if (!confirm("Clear all Stella Nova demo accounts on this device?")) return;
    if (sync) {
      sync.destroy();
      sync = null;
    }
    Auth.resetAllDemoData();
    setConnected(false, "Not connected");
    showScreen("welcome");
    refreshWelcomeMascot();
  });

  document.getElementById("btn-connect-back").addEventListener("click", () => {
    showScreen("mode");
  });

  document.getElementById("btn-mode-back").addEventListener("click", () => {
    renderExplore();
    showScreen("explore");
  });

  document.getElementById("btn-mode-solo").addEventListener("click", () => {
    selectedPlayMode = "solo";
    goToConnect();
  });

  document.getElementById("btn-mode-multi").addEventListener("click", () => {
    const world = PLANETS.find((p) => p.id === selectedPlanetId);
    if (world && world.gameType === "stars") return;
    selectedPlayMode = "multi";
    goToConnect();
  });

  function getRoomFromInputs() {
    return roomInputs.map((el) => el.value.trim().toUpperCase()).join("");
  }

  function wireRoomInputs() {
    roomInputs.forEach((input, index) => {
      input.addEventListener("input", () => {
        input.value = input.value.replace(/\D/g, "").slice(0, 1);
        document.getElementById("connect-error").textContent = "";
        if (input.value && index < roomInputs.length - 1) roomInputs[index + 1].focus();
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !input.value && index > 0) roomInputs[index - 1].focus();
      });
      input.addEventListener("paste", (e) => {
        const text = (e.clipboardData || window.clipboardData).getData("text") || "";
        const cleaned = text.replace(/\D/g, "").slice(0, 4);
        if (!cleaned) return;
        e.preventDefault();
        cleaned.split("").forEach((ch, i) => {
          if (roomInputs[i]) roomInputs[i].value = ch;
        });
        roomInputs[Math.min(cleaned.length, 3)].focus();
      });
    });
  }

  function currentGameType() {
    const world = PLANETS.find((p) => p.id === selectedPlanetId);
    return world && world.gameType === "orbit" ? "orbit" : "stars";
  }

  function renderHowTo() {
    const orbit = currentGameType() === "orbit";
    const world = PLANETS.find((p) => p.id === selectedPlanetId);
    document.getElementById("howto-title").textContent = world ? world.game : orbit ? "Orbit Rally" : "Star Slash";
    document.getElementById("howto-stars").hidden = orbit;
    document.getElementById("howto-orbit").hidden = !orbit;
    document.querySelectorAll("#howto-orbit .howto-page").forEach((el, index) => {
      el.hidden = !orbit || index !== howtoPage;
    });
    const dots = document.getElementById("howto-dots");
    dots.hidden = !orbit;
    dots.querySelectorAll("button").forEach((dot, index) => {
      dot.classList.toggle("on", index === howtoPage);
    });
    const note = document.getElementById("howto-orbit-note");
    if (note) {
      note.textContent = selectedPlayMode === "multi"
        ? "You are the blue alien on the left. The person on the right controls the pink alien."
        : "You are the blue alien on the left. The pink alien is the computer.";
    }
    const last = !orbit || howtoPage >= 1;
    document.getElementById("btn-howto-next").textContent = last
      ? orbit ? "Tap to start" : "Tap to begin"
      : "Next";
  }

  function showHowTo() {
    awaitingStart = true;
    howtoPage = 0;
    renderHowTo();
    showScreen("howto");
  }

  function applyState(state) {
    if (!state) return;
    if (awaitingStart) {
      if (!state.phase || state.phase === "lobby") {
        setConnected(!!state.hostReady, state.hostReady ? "TV ready · " + room : "Waiting for TV…");
      } else {
        setConnected(true, "TV ready · " + room);
      }
      return;
    }
    const world = PLANETS.find((p) => p.id === selectedPlanetId);
    const isOrbit = currentGameType() === "orbit";
    const score = typeof state.score === "number" ? state.score : 0;
    const timeLeft = typeof state.timeLeft === "number" ? state.timeLeft : 20;
    const liveTitle = document.getElementById("live-title");

    if (isOrbit && typeof state.scoreA === "number") {
      document.getElementById("live-score").textContent = state.scoreA + " — " + (state.scoreB || 0);
    } else {
      document.getElementById("live-score").textContent = "✦ " + String(score);
    }

    document.getElementById("live-timer").textContent = timeLeft + "s left";
    document.getElementById("results-score").textContent = isOrbit
      ? (state.scoreA || 0) + " — " + (state.scoreB || 0)
      : "✦ " + String(score);

    if (state.phase === "countdown") {
      showScreen("live");
      liveTitle.textContent = isOrbit
        ? "Orbit Rally get ready…"
        : "Get ready… " + (state.countdown || 3);
      setConnected(true, "Room " + room);
    } else if (state.phase === "playing") {
      showScreen("live");
      liveTitle.textContent = isOrbit
        ? "Orbit Rally on TV — move your arms!"
        : "You’re playing on TV. Look up and slash stars!";
      setConnected(true, "Live · " + room);
    } else if (state.phase === "paused") {
      showScreen("paused");
      setConnected(true, "Paused · " + room);
    } else if (state.phase === "over") {
      if (lastAwardedScore !== score) {
        lastAwardedScore = score;
        const starsEarned = isOrbit ? Math.max(0, state.scoreA || score) : score;
        Auth.addStars(starsEarned, {
          game: world ? world.game : isOrbit ? "Orbit Rally" : "Star Slash",
          gameType: world ? world.gameType : isOrbit ? "orbit" : "stars",
        });
        const progress = Auth.applyRoundProgress(selectedPlanetId, starsEarned);
        document.getElementById("results-blurb").textContent = isOrbit
          ? "Orbit Rally finished — ✦ " + starsEarned + " credited" + (world ? " on " + world.name : "") + "!"
          : "You collected " + score + " stars" + (world ? " on " + world.name : "") + "!";

        const unlockEl = document.getElementById("results-unlock");
        const homeBtn = document.getElementById("btn-results-home");
        if (progress && progress.unlockedId) {
          const next = PLANETS.find((p) => p.id === progress.unlockedId);
          lastUnlockMessage = next ? "New world unlocked: " + next.name : "";
          unlockEl.textContent = lastUnlockMessage;
          unlockEl.hidden = false;
          if (homeBtn && next) homeBtn.textContent = "Fly to " + next.name;
          sessionStorage.setItem("stella-nova:celebrate-unlock", progress.unlockedId);
        } else if (starsEarned < Auth.UNLOCK_SCORE) {
          unlockEl.textContent =
            "Score ★ " + Auth.UNLOCK_SCORE + "+ in one round to unlock the next world.";
          unlockEl.hidden = false;
          if (homeBtn) homeBtn.textContent = "Back to your universe";
        } else {
          unlockEl.hidden = true;
          if (homeBtn) homeBtn.textContent = "Back to your universe";
        }
        document.getElementById("results-meta").textContent =
          "Need ✦ " + Auth.UNLOCK_SCORE + "+ in a round to unlock the next planet.";
      }
      showScreen("results");
      setConnected(true, "Done · " + room);
    } else if (state.phase === "lobby") {
      setConnected(!!state.hostReady, state.hostReady ? "TV ready · " + room : "Waiting for TV…");
    }
  }

  function connectAndPlay() {
    const code = getRoomFromInputs();
    const name = (document.getElementById("player-name").value || "Player").trim().slice(0, 16) || "Player";
    const connectError = document.getElementById("connect-error");
    connectError.textContent = "";
    if (code.length !== 4) {
      connectError.textContent = "Enter the full 4-character room code from the TV tab.";
      return;
    }
    Auth.updateCurrentUser({ name });
    localStorage.setItem("ph-player-name", name);

    if (sync) {
      sync.destroy();
      sync = null;
    }
    room = code;
    lastAwardedScore = null;
    try {
      sync = PlanetHockeySync.createSync(room, "tablet");
    } catch (err) {
      connectError.textContent = err.message;
      return;
    }

    const existing = sync.getState();
    setConnected(!!(existing && existing.hostReady), existing && existing.hostReady ? "Connected · " + room : "Looking for TV…");
    sync.publish({
      tabletReady: true,
      playerName: name,
      playMode: selectedPlayMode,
      gameType: (PLANETS.find((p) => p.id === selectedPlanetId) || {}).gameType || "stars",
      worldId: selectedPlanetId,
    });
    sync.on((msg) => {
      if (msg.type === "state" && msg.state) applyState(msg.state);
      if (msg.type === "hello" && msg.role === "game") setConnected(true, "TV ready · " + room);
    });
    showHowTo();
    applyState(sync.getState());
  }

  function beginPlay() {
    if (!sync) {
      showScreen("connect");
      document.getElementById("connect-error").textContent = "Connect to the TV again, then start.";
      return;
    }
    awaitingStart = false;
    sync.publish({
      tabletReady: true,
      playMode: selectedPlayMode,
      gameType: currentGameType(),
      worldId: selectedPlanetId,
    });
    sync.send({ type: "command", action: "play" });
    // Resend play a couple times in case the TV is mid-switch between games
    setTimeout(() => sync && sync.send({ type: "command", action: "play" }), 900);
    setTimeout(() => sync && sync.send({ type: "command", action: "play" }), 1800);
    document.getElementById("live-title").textContent =
      currentGameType() === "orbit" ? "Orbit Rally get ready…" : "Get ready…";
    showScreen("live");
    applyState(sync.getState());
  }

  function sendCommand(action) {
    if (!sync) return;
    sync.send({ type: "command", action });
  }

  document.getElementById("btn-connect").addEventListener("click", connectAndPlay);
  document.getElementById("btn-howto-back").addEventListener("click", () => {
    if (currentGameType() === "orbit" && howtoPage > 0) {
      howtoPage -= 1;
      renderHowTo();
      return;
    }
    awaitingStart = false;
    showScreen("connect");
  });
  document.getElementById("btn-howto-next").addEventListener("click", () => {
    if (currentGameType() === "orbit" && howtoPage < 1) {
      howtoPage += 1;
      renderHowTo();
      return;
    }
    beginPlay();
  });
  document.getElementById("howto-dots").addEventListener("click", (event) => {
    const dot = event.target.closest("button");
    if (!dot) return;
    howtoPage = Number(dot.dataset.dot) || 0;
    renderHowTo();
  });
  document.getElementById("btn-pause").addEventListener("click", () => {
    sendCommand("pause");
    showScreen("paused");
  });
  document.getElementById("btn-resume").addEventListener("click", () => {
    sendCommand("resume");
    showScreen("live");
  });
  document.getElementById("btn-play-again").addEventListener("click", () => {
    lastAwardedScore = null;
    sendCommand("restart");
    showScreen("live");
    document.getElementById("live-title").textContent = "Starting…";
  });
  document.getElementById("btn-results-home").addEventListener("click", () => {
    sendCommand("home");
    renderHome();
    showScreen("home");
    setConnected(!!sync, sync ? "Connected · " + room : "Not connected");
  });
  document.getElementById("btn-results-next-tester").addEventListener("click", () => {
    sendCommand("home");
    goNextTester();
  });

  wireRoomInputs();
  refreshWelcomeMascot();

  document.getElementById("modal-primary").addEventListener("click", () => {
    if (typeof modalAction === "function") modalAction();
    else hidePlanetModal();
  });
  document.getElementById("modal-secondary").addEventListener("click", () => {
    if (typeof modalSecondaryAction === "function") modalSecondaryAction();
    else hidePlanetModal();
  });
  document.getElementById("planet-modal-backdrop").addEventListener("click", hidePlanetModal);

  routeFromAuth();
})();
