import { Configuration, PublicClientApplication } from "@azure/msal-browser";

const clientId = import.meta.env.VITE_MS_CLIENT_ID ?? "";
const tenantId = (import.meta.env.VITE_MS_TENANT_ID as string | undefined) ?? 'common';
const redirectUri = (import.meta.env.VITE_MS_REDIRECT_URI as string | undefined) ?? window.location.origin;

if (!clientId) {
  console.warn("[msalConfig] VITE_MS_CLIENT_ID is not set — Microsoft login is disabled.");
}

export const isMsConfigured = !!(
  import.meta.env.VITE_MS_CLIENT_ID &&
  import.meta.env.VITE_MS_TENANT_ID
);

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
