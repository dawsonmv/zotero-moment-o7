/**
 * UK Web Archive Service Configuration
 *
 * Archives primarily accept UK domains (.uk, .co.uk, .org.uk, .ac.uk, .gov.uk)
 * Service nominates URLs for crawling rather than immediate archiving.
 * Does not return immediate archive URL.
 */

import { ServiceConfig } from "../../modules/archive/types";

export const ukWebArchiveConfig: ServiceConfig = {
  id: "ukwebarchive",
  name: "UK Web Archive",
  homepage: "https://www.webarchive.org.uk",

  capabilities: {
    acceptsUrl: true,
    returnsUrl: false,
    preservesJavaScript: true,
    preservesInteractiveElements: true,
    requiresAuthentication: false,
    hasQuota: false,
    regionRestricted: true,
  },

  runtime: {
    // Validate UK domain
    urlValidator: {
      type: "regex",
      pattern: "\\.uk$|\\.co\\.uk$|\\.org\\.uk$|\\.ac\\.uk$|\\.gov\\.uk$",
      errorMessage:
        "UK Web Archive primarily accepts UK domains (.uk, .co.uk, .org.uk, etc.)",
    },

    // Check for existing archives
    checkEndpoint: {
      url: "https://www.webarchive.org.uk/en/ukwa/search?q={{url}}",
      method: "GET",
      parser: {
        type: "regex",
        pattern:
          "https://www\\.webarchive\\.org\\.uk/[^/]+/\\d{14}/[^\\s\"'<>]+",
        captureGroup: 0,
      },
    },

    // Submit nomination for archiving
    archiveEndpoint: {
      url: "https://www.webarchive.org.uk/en/ukwa/nominate",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      bodyTemplate:
        "url={{url}}&nomination_reason=Academic research resource&your_name=Zotero User",
      timeout: 60000,
    },

    // Parse confirmation from response
    responseParser: {
      type: "regex",
      pattern:
        "Thank you for your nomination|successfully nominated|We will consider your nomination",
      captureGroup: 0,
      urlPrefix: "https://www.webarchive.org.uk/en/ukwa/nominate",
    },
  },
};
