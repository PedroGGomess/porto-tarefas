import { Configuration, PublicClientApplication } from "@azure/msal-browser";

const clientId = import.meta.env.VITE_MS_CLIENT_ID ?? "1c858b4b-bf2e-4609-b1d1-c28c07c762ae";
const tenantId = import.meta.env.VITE_MS_TENANT_ID ?? "6c014fdb-e77b-40f8-b9dc-ad34285df24b";
const redirectUri = import.meta.env.VITE_MS_REDIRECT_URI ?? "https://the100s-tasks.lovable.app/auth/callback";

export const isMsConfigured = true;

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri,
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: true,
  },
  system: {
    allowNativeBroker: false,
    windowHashTimeout: 9000,
    iframeHashTimeout: 9000,
    loadFrameTimeout: 9000,
  },
};

export const loginRequest = {
  scopes: ["Calendars.Read", "User.Read"],
};

export const msalInstance = new PublicClientApplication(msalConfig);
