import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

export const authApi = {
  login: (email, password) => api.post("/auth/login", { email, password }),
  register: (name, email, password) =>
    api.post("/auth/register", { name, email, password }),
};

export const groupApi = {
  create: (name, ownerId) => api.post("/groups", { name, owner_id: ownerId }),
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
