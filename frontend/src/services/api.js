import axios from "axios";

export const AUTH_TOKEN_KEY = "iges_token";
export const AUTH_USER_KEY = "iges_user";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: (email, password) => api.post("/auth/login", { email, password }),
  register: (name, email, password) =>
    api.post("/auth/register", { name, email, password }),
};

export const groupApi = {
  list: () => api.get("/groups"),
  create: (name) => api.post("/groups", { name }),
  get: (id) => api.get(`/groups/${id}`),
  addMember: (groupId, userId) =>
    api.post(`/groups/${groupId}/members`, { user_id: userId }),
};

export const expenseApi = {
  add: (payload) => api.post("/expenses", payload),
  listForGroup: (groupId) => api.get(`/expenses/group/${groupId}`),
  scanReceipt: (file) => {
    const form = new FormData();
    form.append("image", file);
    return api.post("/expenses/scan", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

export default api;
