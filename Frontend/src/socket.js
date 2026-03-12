import { io } from "socket.io-client";

function getSocketBaseUrl() {
  const configured = import.meta.env.VITE_API_URL || window.location.origin;
  if (configured.startsWith("/")) {
    return window.location.origin;
  }
  const normalized = configured.replace(/\/+$/, "");
  return normalized.endsWith("/api")
    ? normalized.slice(0, -4)
    : normalized;
}

export function connectSocket(token) {
  return io(getSocketBaseUrl(), {
    auth: { token },
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
  });
}
