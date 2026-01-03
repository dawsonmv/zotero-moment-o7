/**
 * Arquivo.pt Archive Service Configuration
 *
 * Portuguese web archive - supports checking for existing archives
 * and submitting new URLs for archiving.
 * Region-restricted to Portuguese domains.
 */

import { ServiceConfig } from "../../modules/archive/types";

export const arquivoPtConfig: ServiceConfig = {
  id: "arquivopt",
  name: "Arquivo.pt",
  homepage: "https://arquivo.pt",

  capabilities: {
    acceptsUrl: true,
    returnsUrl: true,
    preservesJavaScript: false,
    preservesInteractiveElements: false,
    requiresAuthentication: false,
    hasQuota: false,
    regionRestricted: true,
  },

  runtime: {
    // Check for existing archives first
    // Query wayback machine: GET /wayback/*/url
    // Response contains redirect with timestamp if exists
    checkEndpoint: {
      url: "https://arquivo.pt/wayback/*/{{url}}",
      method: "GET",
      parser: {
        type: "regex",
        pattern: "/wayback/(\\d{14})/",
        captureGroup: 1,
        urlPrefix: "https://arquivo.pt/wayback/",
      },
    },

    // Submit URL for archiving
    archiveEndpoint: {
      url: "https://arquivo.pt/save",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      bodyTemplate: "url={{url}}",
      timeout: 120000,
    },

    // Extract archive URL from HTML response using regex
    // Response contains: <a href="https://arquivo.pt/wayback/20231201120000/example.com">
    responseParser: {
      type: "regex",
      pattern:
        "https?://arquivo\\.pt/wayback/\\d{14}/[^\\s\"'<>]+",
      captureGroup: 0,
    },
  },
};
