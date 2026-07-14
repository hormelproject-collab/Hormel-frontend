import { PublicClientApplication } from "@azure/msal-browser";

export const msalConfig = {
     auth: {
    clientId: "08311f85-fd3f-46f2-b194-823339294476",
    authority:
      "https://login.microsoftonline.com/9ecd565a-141c-4d9e-820d-886b40282cf2",
    redirectUri: "https://planning-bom-dev.myhormel.com/oauth2callback",
  },
    cache: {
        cacheLocation: "localStorage",
        storeAuthStateInCookie: false,
    },
};

export const loginRequest = {
    scopes: ["openid", "profile", "email", "User.Read"],
};

export const msalInstance = new PublicClientApplication(msalConfig);