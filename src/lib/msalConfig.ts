import { Configuration, PublicClientApplication } from "@azure/msal-browser";

const clientId = import.meta.env.VITE_MS_CLIENT_ID ?? "";
const tenantId = import.meta.env.VITE_MS_TENANT_ID ?? "common";
const redirectUri = import.meta.env.VITE_MS_REDIRECT_URI ?? window.location.origin;

const isValidValue = (v: string | undefined) =>
  !!v && v !== "undefined" && v !== "null" && v.trim() !== "";

export const isMsConfigured =
  isValidValue(import.meta.env.VITE_MS_CLIENT_ID) &&
  isValidValue(import.meta.env.VITE_MS_TENANT_ID);

if (!isMsConfigured) {
  console.warn("[msalConfig] Microsoft login disabled — vars missing or invalid.");
} else {
  console.log("[msalConfig] ✅ Configured. ClientID:", clientId.slice(0, 8) + "...");
}

export const msalConfig: Configuration = {
  auth: {
    clientId: isValidValue(clientId) ? clientId : "placeholder",
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ["Calendars.Read", "User.Read"],
};

export const msalInstance = isMsConfigured
  ? new PublicClientApplication(msalConfig)
  : null;
