/* Stella Nova tablet — onboarding + solar home + star-slash sync */

(function () {
  const PLANETS = [
    {
      id: "sun",
      name: "Sun",
      game: "Star Slash",
      gameType: "stars",
      blurb: "Slash rising stars for 30 seconds — first world",
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
      colour: "#d4a35a",
      playable: true,
      tvPage: "orbit.html",
    },
    {
      id: "venus",
      name: "Venus",
      game: "Orbit Rally",
      gameType: "orbit",
      blurb: "Orbit Rally in a brighter arena",
      colour: "#e8c07a",
      playable: true,
      tvPage: "orbit.html",
    },
    {
      id: "earth",
      name: "Earth",
      game: "Orbit Rally",
      gameType: "orbit",
      blurb: "Home-world Orbit Rally",
      colour: "#3d8bfd",
      playable: true,
      tvPage: "orbit.html",
    },
    {
      id: "mars",
      name: "Mars",
      game: "Orbit Rally",
      gameType: "orbit",
      blurb: "Red-planet Orbit Rally",
      colour: "#e07040",
      playable: true,
      tvPage: "orbit.html",
    },
    {
      id: "jupiter",
      name: "Jupiter",
      game: "Orbit Rally",
      gameType: "orbit",
      blurb: "Giant-world Orbit Rally",
      colour: "#d4a574",
      playable: true,
      tvPage: "orbit.html",
    },
    {
      id: "saturn",
      name: "Saturn",
      game: "Orbit Rally",
      gameType: "orbit",
      blurb: "Ringed Orbit Rally",
      colour: "#f0d590",
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
      colour: "#7ec8e3",
      playable: true,
      tvPage: "orbit.html",
    },
    {
      id: "neptune",
      name: "Neptune",
      game: "Orbit Rally",
      gameType: "orbit",
      blurb: "Deep-space Orbit Rally finale",
      colour: "#4169e1",
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
  let armPreference = null;
  let alienDraft = ReGradeAlien.mergeAlien(null);
  let alienCat = "shape";
  let selectedPlanetId = "sun";
  let selectedPlayMode = "solo"; // solo | multi
  let armPain = 3;
  let lastAwardedScore = null;
  let lastUnlockMessage = "";

  const roomInputs = Array.from(document.querySelectorAll("#room-inputs input"));

  function showScreen(name) {
    Object.keys(screens).forEach((key) => {
      screens[key].classList.toggle("active", key === name);
    });
    const mainTabs = ["home", "explore", "stats", "settings"];
    const showNav = mainTabs.includes(name);
    bottomNav.hidden = !showNav;
    shell.classList.toggle("nav-visible", showNav);
    if (showNav) {
      bottomNav.querySelectorAll(".nav-item").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.nav === name);
      });
    }
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
    renderHome(user);
    showScreen("home");
  }

  function renderHome(user) {
    user = user || Auth.getCurrentUser();
    if (!user) return;
    document.getElementById("home-greeting").textContent = "Hey " + (user.name || "explorer");
    document.getElementById("star-count").textContent = String(user.stars || 0);
    const unlockedCount = (user.unlockedPlanets || ["sun"]).length;
    const hasProgress = unlockedCount > 1 || (user.stars || 0) > 0;
    document.getElementById("home-title").textContent = hasProgress
      ? "Your little universe is growing"
      : "Your universe is waiting…";
    document.getElementById("home-caption").textContent = hasProgress
      ? "Collect " + Auth.UNLOCK_SCORE + "+ stars in a round to unlock the next world."
      : "Start at the Sun — slash stars, then unlock more worlds.";
    ReGradeAlien.renderInto(document.getElementById("home-alien"), user.alien, 100);
    renderSolarStage(user);
  }

  function renderSolarStage(user) {
    const stage = document.getElementById("solar-stage");
    const layout = [
      { id: "sun", x: 12, y: 42, r: 44 },
      { id: "mercury", x: 30, y: 22, r: 14 },
      { id: "venus", x: 40, y: 50, r: 18 },
      { id: "earth", x: 54, y: 28, r: 20 },
      { id: "mars", x: 66, y: 54, r: 16 },
      { id: "jupiter", x: 76, y: 24, r: 28 },
      { id: "saturn", x: 86, y: 56, r: 22 },
      { id: "uranus", x: 70, y: 12, r: 16 },
      { id: "neptune", x: 92, y: 18, r: 15 },
    ];

    const celebrateId = sessionStorage.getItem("stella-nova:celebrate-unlock");

    stage.innerHTML = layout
      .map((p) => {
        const meta = PLANETS.find((x) => x.id === p.id);
        const open = isUnlocked(user, p.id);
        const rings = meta && meta.rings ? " rings" : "";
        const sunClass = meta && meta.sun ? " sun" : " planet";
        const celebrate = celebrateId === p.id ? " just-unlocked" : "";
        return `<button class="sol-body${sunClass}${rings}${open ? " unlocked" : " locked"}${celebrate}" type="button" data-planet="${p.id}" style="left:${p.x}%;top:${p.y}%;width:${p.r * 2}px;height:${p.r * 2}px;--p:${meta.colour}" title="${meta.name}"></button>`;
      })
      .join("");

    stage.querySelectorAll("[data-planet]").forEach((btn) => {
      btn.addEventListener("click", () => openPlanet(btn.dataset.planet));
    });

    if (celebrateId) {
      const toast = document.getElementById("unlock-toast");
      const world = PLANETS.find((p) => p.id === celebrateId);
      if (toast && world) {
        toast.textContent = "Unlocked: " + world.name + " · " + world.game + "!";
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
        p.blurb +
        " You’ll pick Solo" +
        (p.gameType === "orbit" ? " or Play with others" : "") +
        ", then connect to the TV with one room code.",
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
    document.getElementById("mode-game-label").textContent = world
      ? world.game + " on " + world.name + " — pick a mode, then connect to the TV."
      : "Pick a mode, then connect to the TV.";

    const multiCard = document.querySelector(".mode-card.mode-multi");
    const multiBtn = document.getElementById("btn-mode-multi");
    const soloOnly = world && world.gameType === "stars";
    if (multiCard) multiCard.classList.toggle("is-disabled", !!soloOnly);
    if (multiBtn) {
      multiBtn.disabled = !!soloOnly;
      multiBtn.textContent = soloOnly ? "Multiplayer locked" : "Play with others";
    }
    const modeNote = document.getElementById("mode-lock-note");
    if (modeNote) {
      modeNote.hidden = !soloOnly;
    }
    showScreen("mode");
  }

  function goToConnect() {
    const world = PLANETS.find((p) => p.id === selectedPlanetId);
    const hint = document.getElementById("connect-hint");
    hint.textContent =
      "Open the TV tab (game.html) — it switches games automatically. Enter its room code. Mode: " +
      (selectedPlayMode === "multi" ? "Play with others" : "Solo") +
      (world ? " · " + world.game : "");
    showScreen("connect");
  }

  function renderStats() {
    const user = Auth.getCurrentUser();
    if (!user) return;
    const unlocked = user.unlockedPlanets || ["sun"];
    document.getElementById("stat-stars").textContent = "✦ " + String(user.stars || 0);
    document.getElementById("stat-planets").textContent = String(unlocked.length);

    const worldsRow = document.getElementById("worlds-row");
    worldsRow.innerHTML = PLANETS.map((p) => {
      const open = unlocked.includes(p.id);
      return `<div class="world-chip ${open ? "" : "locked-chip"}" title="${p.name}">
        <span class="mini-orb" style="--p:${p.colour}"></span>
        <span>${open ? p.name : "Locked"}</span>
      </div>`;
    }).join("");

    renderStarsChart(user.history || []);

    const list = document.getElementById("history-list");
    const history = user.history || [];
    if (!history.length) {
      list.innerHTML = `<p class="muted">No sessions yet — play Star Slash on the Sun to begin.</p>`;
      return;
    }
    list.innerHTML = history
      .map((h) => {
        const days = Math.max(0, Math.floor((Date.now() - h.at) / 86400000));
        const when = days === 0 ? "Today" : days === 1 ? "1 day ago" : days + " days ago";
        return `<div class="history-row"><div><strong>${h.game}</strong><div class="muted">${when}</div></div><div class="star-chip compact">✦ ${h.stars}</div></div>`;
      })
      .join("");
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
    ReGradeAlien.renderInto(document.getElementById("alien-preview"), alienDraft, 160);
    const presets = document.getElementById("alien-presets");
    presets.innerHTML = PRESETS.map((p, i) => {
      return `<button class="preset-btn" type="button" data-preset="${i}">${ReGradeAlien.toSvg(p, 44)}</button>`;
    }).join("");
    presets.querySelectorAll("[data-preset]").forEach((btn) => {
      btn.addEventListener("click", () => {
        alienDraft = ReGradeAlien.mergeAlien(PRESETS[Number(btn.dataset.preset)]);
        renderAlienCreator();
      });
    });

    document.querySelectorAll("#alien-cats .cat").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.cat === alienCat);
    });

    const options = document.getElementById("alien-options");
    const opts = OPTION_MAP[alienCat] || [];
    options.innerHTML = opts
      .map((o) => {
        const active = alienDraft[alienCat] === o.id;
        if (o.swatch) {
          return `<button class="opt swatch ${active ? "active" : ""}" type="button" data-val="${o.id}" style="--sw:${o.id}" aria-label="${o.id}"></button>`;
        }
        return `<button class="opt ${active ? "active" : ""}" type="button" data-val="${o.id}">${o.label}</button>`;
      })
      .join("");
    options.querySelectorAll("[data-val]").forEach((btn) => {
      btn.addEventListener("click", () => {
        alienDraft[alienCat] = btn.dataset.val;
        renderAlienCreator();
      });
    });
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

  document.querySelectorAll("#arm-chips .chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.querySelectorAll("#arm-chips .chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      armPreference = chip.dataset.arm;
      const pain = document.getElementById("pain-scale");
      if (armPreference === "left" || armPreference === "right") {
        pain.hidden = false;
      } else {
        pain.hidden = true;
      }
    });
  });

  const painRange = document.getElementById("pain-range");
  if (painRange) {
    painRange.addEventListener("input", () => {
      armPain = Number(painRange.value);
      document.getElementById("pain-value").textContent = String(armPain);
    });
  }

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
      armPreference,
      armPain: armPreference === "left" || armPreference === "right" ? armPain : null,
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

  document.getElementById("btn-alien-save").addEventListener("click", () => {
    Auth.updateCurrentUser({ alien: alienDraft, onboarded: true });
    renderHome();
    showScreen("home");
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
        input.value = input.value.replace(/[^a-z0-9]/gi, "").slice(0, 1).toUpperCase();
        document.getElementById("connect-error").textContent = "";
        if (input.value && index < roomInputs.length - 1) roomInputs[index + 1].focus();
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !input.value && index > 0) roomInputs[index - 1].focus();
      });
      input.addEventListener("paste", (e) => {
        const text = (e.clipboardData || window.clipboardData).getData("text") || "";
        const cleaned = text.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 4);
        if (!cleaned) return;
        e.preventDefault();
        cleaned.split("").forEach((ch, i) => {
          if (roomInputs[i]) roomInputs[i].value = ch;
        });
        roomInputs[Math.min(cleaned.length, 3)].focus();
      });
    });
  }

  function applyState(state) {
    if (!state) return;
    const world = PLANETS.find((p) => p.id === selectedPlanetId);
    const isOrbit = (state.gameType || (world && world.gameType)) === "orbit";
    const score = typeof state.score === "number" ? state.score : 0;
    const timeLeft = typeof state.timeLeft === "number" ? state.timeLeft : isOrbit ? 60 : 30;
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
        if (progress && progress.unlockedId) {
          const next = PLANETS.find((p) => p.id === progress.unlockedId);
          lastUnlockMessage = next
            ? "New world unlocked: " + next.name + " (" + next.game + ")!"
            : "";
          unlockEl.textContent = lastUnlockMessage;
          unlockEl.hidden = false;
          sessionStorage.setItem("stella-nova:celebrate-unlock", progress.unlockedId);
        } else if (starsEarned < Auth.UNLOCK_SCORE) {
          unlockEl.textContent =
            "Score ✦ " + Auth.UNLOCK_SCORE + "+ in one round to unlock the next world.";
          unlockEl.hidden = false;
        } else {
          unlockEl.hidden = true;
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
    sync.send({ type: "command", action: "play" });
    showScreen("live");
    document.getElementById("live-title").textContent = "Starting…";
    applyState(sync.getState());
  }

  function sendCommand(action) {
    if (!sync) return;
    sync.send({ type: "command", action });
  }

  document.getElementById("btn-connect").addEventListener("click", connectAndPlay);
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
