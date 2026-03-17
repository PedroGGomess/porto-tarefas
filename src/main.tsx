import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { msalInstance } from "@/lib/msalConfig";

msalInstance.initialize().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
}).catch((error) => {
  console.error("[MSAL] Initialization failed:", error);
});
