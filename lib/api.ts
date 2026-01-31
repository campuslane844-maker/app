import axios from "axios";
import { useAuthStore } from "@/lib/store/auth";

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * REQUEST INTERCEPTOR
 */
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // LOG REQUEST
    console.log("[API REQUEST]", {
      method: config.method?.toUpperCase(),
      url: `${config.baseURL}${config.url}`,
      headers: config.headers,
      data: config.data,
    });

    return config;
  },
  (error) => {
    console.error("[API REQUEST ERROR]", error);
    return Promise.reject(error);
  }
);

/**
 * RESPONSE INTERCEPTOR
 */
api.interceptors.response.use(
  (response) => {
    // LOG RESPONSE
    // console.log("[API RESPONSE]", {
    //   url: response.config.url,
    //   status: response.status,
    //   data: response.data,
    // });

    return response;
  },
  (error) => {
    // LOG RESPONSE ERROR
    // console.error("[API RESPONSE ERROR]", {
    //   url: error.config?.url,
    //   status: error.response?.status,
    //   data: error.response?.data,
    //   message: error.message,
    // });

    return Promise.reject(error);
  }
);

export default api;
