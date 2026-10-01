window.Api = (function () {
  const BASE_URL = window.API_BASE_URL || "http://localhost:8000/api";
  let accessToken = null;

  function setAccessToken(token) {
    accessToken = token || null;
  }

  function getAccessToken() {
    return accessToken;
  }

  function firstFieldError(data) {
    if (!data || typeof data !== "object") return null;
    for (const key of Object.keys(data)) {
      const value = data[key];
      if (Array.isArray(value) && value.length) return value[0];
      if (typeof value === "string") return value;
    }
    return null;
  }

  async function request(path, { method = "GET", body, auth = true, retry = true } = {}) {
    const headers = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (auth && accessToken) headers["Authorization"] = "Bearer " + accessToken;

    const res = await fetch(BASE_URL + path, {
      method,
      headers,
      credentials: "include",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401 && auth && retry) {
      const refreshed = await refresh();
      if (refreshed) return request(path, { method, body, auth, retry: false });
    }

    let data = null;
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (e) {
        data = text;
      }
    }

    if (!res.ok) {
      const message = (data && (data.detail || firstFieldError(data))) || "Something went wrong. Please try again.";
      const err = new Error(message);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  async function refresh() {
    try {
      const data = await request("/auth/refresh", { method: "POST", auth: false, retry: false });
      if (data && data.accessToken) {
        setAccessToken(data.accessToken);
        return true;
      }
    } catch (e) {
      // No valid refresh cookie — treat as signed out.
    }
    setAccessToken(null);
    return false;
  }

  function register({ name, email, password }) {
    return request("/auth/register", { method: "POST", auth: false, body: { name, email, password } }).then(
      applyAuthPayload
    );
  }

  function login({ email, password }) {
    return request("/auth/login", { method: "POST", auth: false, body: { email, password } }).then(applyAuthPayload);
  }

  function applyAuthPayload(data) {
    if (data && data.accessToken) setAccessToken(data.accessToken);
    return data;
  }

  async function logout() {
    try {
      await request("/auth/logout", { method: "POST" });
    } catch (e) {
      // Already signed out server-side — still clear local state below.
    }
    setAccessToken(null);
  }

  function me() {
    return request("/auth/me");
  }

  function updateMe(patch) {
    return request("/auth/me", { method: "PATCH", body: patch });
  }

  function changePassword(oldPassword, newPassword) {
    return request("/auth/change-password", { method: "POST", body: { old: oldPassword, new: newPassword } });
  }

  function forgotPassword(email) {
    return request("/auth/forgot", { method: "POST", auth: false, body: { email } });
  }

  function resetPassword(token, newPassword) {
    return request("/auth/reset", { method: "POST", auth: false, body: { token, newPassword } });
  }

  function verifyEmail(token) {
    return request("/auth/verify-email?token=" + encodeURIComponent(token), { auth: false });
  }

  function resendVerification() {
    return request("/auth/resend-verification", { method: "POST" });
  }

  function listGrowthLogEntries() {
    return request("/growth-log/entries");
  }

  function createGrowthLogEntry(payload) {
    return request("/growth-log/entries", { method: "POST", body: payload });
  }

  function deleteGrowthLogEntry(entryId) {
    return request("/growth-log/entries/" + encodeURIComponent(entryId), { method: "DELETE" });
  }

  function verifyCredential(entryId, verificationUrl, issuer) {
    return request("/growth-log/entries/" + encodeURIComponent(entryId) + "/verify-credential", {
      method: "POST",
      body: { verificationUrl, issuer: issuer || "" },
    });
  }

  function githubImport() {
    return request("/growth-log/github-import", { method: "POST" });
  }

  function githubContributions() {
    return request("/growth-log/github-contributions");
  }

  function growthLogStats() {
    return request("/growth-log/stats");
  }

  async function bootstrap() {
    const ok = await refresh();
    if (!ok) return null;
    try {
      const data = await me();
      return data.user;
    } catch (e) {
      return null;
    }
  }

  return {
    setAccessToken,
    getAccessToken,
    register,
    login,
    logout,
    me,
    updateMe,
    changePassword,
    forgotPassword,
    resetPassword,
    verifyEmail,
    resendVerification,
    bootstrap,
    listGrowthLogEntries,
    createGrowthLogEntry,
    deleteGrowthLogEntry,
    verifyCredential,
    githubImport,
    githubContributions,
    growthLogStats,
  };
})();
