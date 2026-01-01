/**
 * Tests for PreferencesPanel
 */

import {
  PreferencesPanel,
  ServiceConfigSection,
  CredentialsSection,
  PreferencesSection,
} from "../../src/modules/preferences/ui/PreferencesPanel";
import { PreferencesManager } from "../../src/modules/preferences/PreferencesManager";
import { HealthChecker } from "../../src/modules/monitoring/HealthChecker";

describe("PreferencesPanel", function () {
  let panel: PreferencesPanel;
  let container: HTMLElement;

  beforeEach(function () {
    // Reset singletons
    (PreferencesManager as any).instance = undefined;
    (HealthChecker as any).instance = undefined;

    // Create container
    container = document.createElement("div");
    container.id = "momento7-preferences";
    document.body.appendChild(container);

    panel = new PreferencesPanel();
  });

  afterEach(function () {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  });

  describe("initialization", function () {
    it("should initialize without errors", async function () {
      await panel.initialize();
      expect(container.innerHTML).not.toBe("");
    });

    it("should throw error if container not found", async function () {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }

      await expect(panel.initialize()).rejects.toThrow("Preferences container not found");
    });
  });

  describe("render", function () {
    it("should render all preference sections", async function () {
      await panel.initialize();

      expect(container.querySelector(".momento7-services-section")).toBeTruthy();
      expect(container.querySelector(".momento7-credentials-section")).toBeTruthy();
      expect(container.querySelector(".momento7-preferences-section")).toBeTruthy();
    });

    it("should render save and cancel buttons", async function () {
      await panel.initialize();

      const buttons = container.querySelectorAll(".momento7-action-buttons button");
      expect(buttons.length).toBe(2);
    });
  });

  describe("event handling", function () {
    it("should handle service toggle", async function () {
      await panel.initialize();
      // Test implementation will be added
    });

    it("should handle service reordering", async function () {
      await panel.initialize();
      // Test implementation will be added
    });

    it("should handle credential updates", async function () {
      await panel.initialize();
      // Test implementation will be added
    });
  });

  describe("persistence", function () {
    it("should save preferences on save action", async function () {
      await panel.initialize();
      // Test implementation will be added
    });

    it("should cancel without saving", async function () {
      await panel.initialize();
      // Test implementation will be added
    });
  });
});

describe("ServiceConfigSection", function () {
  let section: ServiceConfigSection;
  let container: HTMLElement;
  let healthChecker: HealthChecker;

  beforeEach(function () {
    (HealthChecker as any).instance = undefined;
    healthChecker = HealthChecker.getInstance();

    container = document.createElement("div");
    document.body.appendChild(container);

    section = new ServiceConfigSection(healthChecker);
  });

  afterEach(function () {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  });

  describe("rendering", function () {
    it("should render services section", async function () {
      await section.render(container);

      expect(container.querySelector(".momento7-services-section")).toBeTruthy();
    });

    it("should display section title and description", async function () {
      await section.render(container);

      const title = container.querySelector(".momento7-services-section h3");
      expect(title?.textContent).toBe("📋 Archive Services");
    });
  });

  describe("service management", function () {
    it("should return enabled services", function () {
      const services = section.getEnabledServices();
      expect(Array.isArray(services)).toBe(true);
    });

    it("should return service order", function () {
      const order = section.getServiceOrder();
      expect(Array.isArray(order)).toBe(true);
    });
  });

  describe("event handling", function () {
    it("should emit serviceToggle event", function () {
      const handler = jest.fn();
      section.on("serviceToggle", handler);

      // Event emission will be tested once implemented
    });

    it("should emit serviceReorder event", function () {
      const handler = jest.fn();
      section.on("serviceReorder", handler);

      // Event emission will be tested once implemented
    });

    it("should emit testConnection event", function () {
      const handler = jest.fn();
      section.on("testConnection", handler);

      // Event emission will be tested once implemented
    });
  });
});

describe("CredentialsSection", function () {
  let section: CredentialsSection;
  let container: HTMLElement;

  beforeEach(function () {
    container = document.createElement("div");
    document.body.appendChild(container);

    section = new CredentialsSection();
  });

  afterEach(function () {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  });

  describe("rendering", function () {
    it("should render credentials section", async function () {
      await section.render(container);

      expect(container.querySelector(".momento7-credentials-section")).toBeTruthy();
    });

    it("should display credential forms", async function () {
      await section.render(container);

      const form = container.querySelector(".momento7-credentials-form");
      expect(form).toBeTruthy();
    });
  });

  describe("credential management", function () {
    it("should handle credential updates", function () {
      const handler = jest.fn();
      section.on("credentialUpdate", handler);

      // Credential update tests will be added
    });

    it("should test credentials", function () {
      const handler = jest.fn();
      section.on("credentialTest", handler);

      // Credential test implementation will be added
    });
  });
});

describe("PreferencesSection", function () {
  let section: PreferencesSection;
  let container: HTMLElement;

  beforeEach(function () {
    container = document.createElement("div");
    document.body.appendChild(container);

    section = new PreferencesSection();
  });

  afterEach(function () {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  });

  describe("rendering", function () {
    it("should render preferences section", async function () {
      await section.render(container);

      expect(container.querySelector(".momento7-preferences-section")).toBeTruthy();
    });

    it("should display preference form", async function () {
      await section.render(container);

      const form = container.querySelector(".momento7-preferences-form");
      expect(form).toBeTruthy();
    });
  });

  describe("preference values", function () {
    it("should return timeout value", function () {
      const timeout = section.getTimeout();
      expect(typeof timeout).toBe("number");
      expect(timeout).toBeGreaterThan(0);
    });

    it("should return check before archive setting", function () {
      const shouldCheck = section.getCheckBeforeArchive();
      expect(typeof shouldCheck).toBe("boolean");
    });

    it("should return archive age threshold", function () {
      const threshold = section.getArchiveAgeThreshold();
      expect(typeof threshold).toBe("number");
      expect(threshold).toBeGreaterThan(0);
    });

    it("should return auto archive setting", function () {
      const autoArchive = section.getAutoArchive();
      expect(typeof autoArchive).toBe("boolean");
    });
  });
});
