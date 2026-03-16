import { Configuration, PublicClientApplication } from "@azure/msal-browser";

const clientId = (import.meta.env.VITE_MS_CLIENT_ID as string | undefined) ?? '';
const tenantId = (import.meta.env.VITE_MS_TENANT_ID as string | undefined) ?? 'common';
const redirectUri = (import.meta.env.VITE_MS_REDIRECT_URI as string | undefined) ?? window.location.origin;

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
