import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

// connection base
const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});


// tokens
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      const refresh = localStorage.getItem("refreshToken");

      if (refresh) {
        try {
          const { data } = await axios.post(
            `${BASE_URL}/auth/refresh`,
            { refreshToken: refresh },
          );
          localStorage.setItem("accessToken", data.data.accessToken);
          localStorage.setItem("refreshToken", data.data.refreshToken);

          error.config.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return api(error.config);
        } catch (refreshError) {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("currentUser");
          window.location.href = "/login";
        }
      }
      return Promise.reject(error);
    }
    return Promise.reject(error);
  },
);


// login and logout
export const studentLogin = async (email, universityId) => {
  const { data } = await api.post("/auth/student/login", {
    email,
    universityId,
  });
  localStorage.setItem("accessToken", data.data.accessToken);
  localStorage.setItem("refreshToken", data.data.refreshToken);
  localStorage.setItem("currentUser",  JSON.stringify({ ...data.data.student, role: "student" }))
  return data.data.student;
};

export const adminLogin = async (username, password) => {
  const { data } = await api.post("/auth/admin/login", { username, password });
  localStorage.setItem("accessToken", data.data.accessToken);
  localStorage.setItem("refreshToken", data.data.refreshToken);
  localStorage.setItem("currentUser",  JSON.stringify({ ...data.data.admin, role: "admin" }))
  return data.data.admin;
};

export const logout = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("currentUser");
  window.location.href = "/login";
};



export default api;
