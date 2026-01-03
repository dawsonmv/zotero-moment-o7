/**
 * Perma.cc Archive Service Configuration
 *
 * API-based archiving service with authentication required
 * Requires API key stored in CredentialManager as "permaCCApiKey"
 */

import { ServiceConfig } from "../../../src/modules/archive/types";

export const permaCCConfig: ServiceConfig = {
  id: "permacc",
  name: "Perma.cc",
  homepage: "https://perma.cc",

  capabilities: {
    acceptsUrl: true,
    returnsUrl: true,
    preservesJavaScript: true,
    preservesInteractiveElements: true,
    requiresAuthentication: true,
    hasQuota: true,
    regionRestricted: false,
  },

  runtime: {
    // Archive submission endpoint
    archiveEndpoint: {
      url: "https://api.perma.cc/v1/archives/",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      bodyTemplate: '{"url":"{{url}}"}',
      timeout: 120000,
    },

    // Extract archive URL from response
    // Response format: {"guid":"XXXXX-XXXXX","url":"https://perma.cc/XXXXX-XXXXX", ...}
    responseParser: {
      type: "json",
      path: "guid",
      urlPrefix: "https://perma.cc/",
    },

    // Authenticate with API key
    auth: {
      type: "header",
      credentialKey: "permaCCApiKey",
      headerName: "Authorization",
      template: "ApiKey {{credential}}",
    },
  },
};
