import { Configuration, PublicClientApplication } from "@azure/msal-browser";

// Read env vars — Vite replaces these at build time
const clientId = import.meta.env.VITE_MS_CLIENT_ID as string | undefined;
const tenantId = import.meta.env.VITE_MS_TENANT_ID as string | undefined;
const redirectUri = import.meta.env.VITE_MS_REDIRECT_URI as string | undefined;

export const isMsConfigured =
  typeof clientId === "string" &&
  clientId.length > 10 &&
  clientId !== "undefined" &&
  clientId !== "00000000-0000-0000-0000-000000000000";

console.log("[msalConfig] isMsConfigured:", isMsConfigured);
console.log("[msalConfig] clientId:", clientId);

export const msalConfig: Configuration = {
  auth: {
    clientId: isMsConfigured ? clientId! : "00000000-0000-0000-0000-000000000001",
    authority: `https://login.microsoftonline.com/${tenantId ?? "common"}`,
    redirectUri: redirectUri ?? window.location.origin,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ["Calendars.Read", "User.Read"],
};

export const msalInstance = new PublicClientApplication(msalConfig);
