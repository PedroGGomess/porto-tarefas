import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { msalInstance } from "@/lib/msalConfig";

async function bootstrap() {
  try {
    await msalInstance.initialize();
    console.log("[MSAL] ✅ Initialized successfully");
  } catch (e) {
    console.warn("[MSAL] Init failed (non-fatal):", e);
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrap();
