import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { msalInstance } from "@/lib/msalConfig";

async function bootstrap() {
  await msalInstance.initialize();

  // Handle redirect callback
  try {
    const result = await msalInstance.handleRedirectPromise();
    if (result?.account) {
      msalInstance.setActiveAccount(result.account);
      console.log('[MSAL] Redirect login successful:', result.account.username);
    }
  } catch (e) {
    console.error('[MSAL] Redirect error:', e);
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrap();
