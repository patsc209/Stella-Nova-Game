/**
 * ReGrade — local prototype auth (localStorage only).
 */
(function (global) {
  const USERS_KEY = "regrade:users";
  const SESSION_KEY = "regrade:session";

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
      unlockedPlanets: ["earth"],
      history: [],
      onboarded: false,
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
    setSession(id);
    return user;
  }

  function logout() {
    clearSession();
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

  global.ReGradeAuth = {
    signup,
    login,
    logout,
    getCurrentUser,
    updateCurrentUser,
    addStars,
    getSession,
  };
})(window);
