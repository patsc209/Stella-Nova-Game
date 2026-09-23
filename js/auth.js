/**
 * Stella Nova — local prototype auth (localStorage only).
 * Built for a user-testing fair: reset / next visitor supported.
 */
(function (global) {
  const USERS_KEY = "stella-nova:users";
  const SESSION_KEY = "stella-nova:session";
  const LEGACY_KEYS = ["regrade:users", "regrade:session"];

  // Clear old ReGrade keys once so fair demos start clean under the new name
  LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));

  const WORLD_ORDER = [
    "sun",
    "mercury",
    "venus",
    "earth",
    "mars",
    "jupiter",
    "saturn",
    "uranus",
    "neptune",
  ];

  /** Stars needed in a finished round to unlock the next world */
  const UNLOCK_SCORE = 12;

  function loadUsers() {
    try {
      return JSON.parse(localStorage.getItem(USERS_KEY) || "{}");
    } catch (_) {
      return {};
    }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function normalizeId(emailOrPhone) {
    return String(emailOrPhone || "")
      .trim()
      .toLowerCase();
  }

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    } catch (_) {
      return null;
    }
  }

  function setSession(userId) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId, at: Date.now() }));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function getCurrentUser() {
    const session = getSession();
    if (!session || !session.userId) return null;
    const users = loadUsers();
    return users[session.userId] || null;
  }

  function updateCurrentUser(partial) {
    const session = getSession();
    if (!session || !session.userId) return null;
    const users = loadUsers();
    if (!users[session.userId]) return null;
    users[session.userId] = Object.assign({}, users[session.userId], partial, {
      updatedAt: Date.now(),
    });
    saveUsers(users);
    return users[session.userId];
  }

  function signup({ emailOrPhone, password, name }) {
    const id = normalizeId(emailOrPhone);
    if (!id) throw new Error("Enter an email or phone number.");
    if (!password || password.length < 4) throw new Error("Password must be at least 4 characters.");
    const users = loadUsers();
    if (users[id]) throw new Error("That account already exists. Try logging in.");
    users[id] = {
      id,
      emailOrPhone: String(emailOrPhone).trim(),
      password: String(password),
      name: (name || "").trim() || "Explorer",
      armPreference: null,
      alien: null,
      stars: 0,
      streak: 1,
      unlockedPlanets: ["sun"],
      history: [],
      onboarded: false,
      onboardedProfile: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    saveUsers(users);
    setSession(id);
    return users[id];
  }

  function login({ emailOrPhone, password }) {
    const id = normalizeId(emailOrPhone);
    const users = loadUsers();
    const user = users[id];
    if (!user) throw new Error("No account found. Create one first.");
    if (user.password !== String(password || "")) throw new Error("Incorrect password.");
    // Migrate older profiles that still have earth unlocked by default
    if (!user.unlockedPlanets || !user.unlockedPlanets.length) {
      user.unlockedPlanets = ["sun"];
      saveUsers(users);
    }
    setSession(id);
    return user;
  }

  function logout() {
    clearSession();
  }

  /** End this tester's session and remove their local account (fair reset). */
  function resetForNextTester() {
    const session = getSession();
    if (session && session.userId) {
      const users = loadUsers();
      delete users[session.userId];
      saveUsers(users);
    }
    clearSession();
    localStorage.removeItem("ph-player-name");
  }

  /** Wipe all local Stella Nova demo data on this browser. */
  function resetAllDemoData() {
    localStorage.removeItem(USERS_KEY);
    clearSession();
    localStorage.removeItem("ph-player-name");
  }

  function addStars(amount) {
    const user = getCurrentUser();
    if (!user) return null;
    const stars = (user.stars || 0) + amount;
    const history = (user.history || []).slice();
    history.unshift({
      game: "Star Slash",
      stars: amount,
      at: Date.now(),
    });
    return updateCurrentUser({ stars, history: history.slice(0, 20) });
  }

  /**
   * After a round on `playedWorldId`, unlock the next world if score >= threshold.
   * Returns { unlockedId, unlockedName } or null.
   */
  function applyRoundProgress(playedWorldId, score) {
    const user = getCurrentUser();
    if (!user) return null;

    const unlocked = Array.from(new Set(user.unlockedPlanets || ["sun"]));
    let newlyUnlocked = null;

    if (score >= UNLOCK_SCORE) {
      const idx = WORLD_ORDER.indexOf(playedWorldId);
      if (idx >= 0 && idx < WORLD_ORDER.length - 1) {
        const next = WORLD_ORDER[idx + 1];
        if (!unlocked.includes(next)) {
          unlocked.push(next);
          newlyUnlocked = next;
        }
      }
    }

    updateCurrentUser({ unlockedPlanets: unlocked });
    return newlyUnlocked
      ? { unlockedId: newlyUnlocked, threshold: UNLOCK_SCORE, score }
      : { unlockedId: null, threshold: UNLOCK_SCORE, score };
  }

  global.StellaNovaAuth = {
    signup,
    login,
    logout,
    resetForNextTester,
    resetAllDemoData,
    getCurrentUser,
    updateCurrentUser,
    addStars,
    applyRoundProgress,
    getSession,
    WORLD_ORDER,
    UNLOCK_SCORE,
  };

  // Back-compat alias while files migrate
  global.ReGradeAuth = global.StellaNovaAuth;
})(window);
