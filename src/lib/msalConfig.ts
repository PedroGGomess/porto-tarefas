import { Configuration, PublicClientApplication } from "@azure/msal-browser";

// Fallback hardcoded para garantir que o Vite sempre tem o valor
const clientId = import.meta.env.VITE_MS_CLIENT_ID ?? "1c858b4b-bf2e-4609-b1d1-c28c07c762ae";
const tenantId = import.meta.env.VITE_MS_TENANT_ID ?? "6c014fdb-e77b-40f8-b9dc-ad34285df24b";
const redirectUri = import.meta.env.VITE_MS_REDIRECT_URI ?? "https://the100s-tasks.lovable.app/auth/callback";

// Sempre configurado — fallback garante valores válidos
export const isMsConfigured = true;

console.log("[msalConfig] ✅ clientId:", clientId.slice(0, 8) + "...");

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

export const msalInstance = new PublicClientApplication(msalConfig);
