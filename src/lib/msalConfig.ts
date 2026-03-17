import { Configuration, PublicClientApplication } from "@azure/msal-browser";

const isValidValue = (v: string | undefined): boolean =>
  !!v && v !== "undefined" && v !== "null" && v.trim() !== "";

const clientId = isValidValue(import.meta.env.VITE_MS_CLIENT_ID)
  ? (import.meta.env.VITE_MS_CLIENT_ID as string)
  : "00000000-0000-0000-0000-000000000000";

const tenantId = isValidValue(import.meta.env.VITE_MS_TENANT_ID)
  ? (import.meta.env.VITE_MS_TENANT_ID as string)
  : "common";

const redirectUri = isValidValue(import.meta.env.VITE_MS_REDIRECT_URI)
  ? (import.meta.env.VITE_MS_REDIRECT_URI as string)
  : window.location.origin;

export const isMsConfigured =
  isValidValue(import.meta.env.VITE_MS_CLIENT_ID) &&
  isValidValue(import.meta.env.VITE_MS_TENANT_ID);

if (isMsConfigured) {
  console.log("[msalConfig] ✅ Microsoft configurado. ClientID:", clientId.slice(0, 8) + "...");
} else {
  console.warn("[msalConfig] ⚠️ Microsoft não configurado — login desativado.");
}

export const msalConfig: Configuration = {
  auth: {
    clientId,
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

// Sempre instancia — nunca null — evita crash no MsalProvider
export const msalInstance = new PublicClientApplication(msalConfig);
