import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Em desenvolvimento, /api e /ws são encaminhados para a API FastAPI (porta 8000).
const API = process.env.VITE_API_PROXY ?? "http://localhost:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": API,
      "/ws": { target: API.replace("http", "ws"), ws: true },
    },
  },
});
