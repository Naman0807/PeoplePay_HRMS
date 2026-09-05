import api from "./api";

export async function login(loginId, password) {
  const res = await api.post("/api/auth/login", { login: loginId, password });
  const { token, user } = res.data.data;
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
  return user;
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function getUser() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

export async function fetchMe() {
  const res = await api.get("/api/auth/me");
  return res.data.data;
}
