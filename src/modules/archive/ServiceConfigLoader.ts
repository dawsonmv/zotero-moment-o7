/**
 * Service Configuration Loader
 *
 * Loads and registers all archive services - both hardcoded complex services
 * and config-driven simple services.
 */

import { ServiceRegistry } from "./ServiceRegistry";
import { ConfigurableArchiveService } from "./ConfigurableArchiveService";
import { InternetArchiveService } from "./InternetArchiveService";
import { ArchiveTodayService } from "./ArchiveTodayService";
import {
  permaCCConfig,
  arquivoPtConfig,
  ukWebArchiveConfig,
} from "../../config";

export class ServiceConfigLoader {
  /**
   * Load and register all archive services
   */
  static loadAllServices(): void {
    const registry = ServiceRegistry.getInstance();
    registry.init();

    // Register hardcoded services (complex logic: polling, async jobs, proxies)
    try {
      registry.register("internetarchive", new InternetArchiveService());
      Zotero.debug("MomentO7: Registered InternetArchiveService");
    } catch (error) {
      Zotero.debug(
        `MomentO7: Failed to register InternetArchiveService: ${error}`,
      );
    }

    try {
      registry.register("archivetoday", new ArchiveTodayService());
      Zotero.debug("MomentO7: Registered ArchiveTodayService");
    } catch (error) {
      Zotero.debug(
        `MomentO7: Failed to register ArchiveTodayService: ${error}`,
      );
    }

    // Register config-driven services
    const configs = [permaCCConfig, arquivoPtConfig, ukWebArchiveConfig];

    for (const config of configs) {
      try {
        const service = new ConfigurableArchiveService(config);
        registry.register(config.id, service);
        Zotero.debug(`MomentO7: Registered config-driven service: ${config.id}`);
      } catch (error) {
        Zotero.debug(
          `MomentO7: Failed to load service ${config.id}: ${error}`,
        );
      }
    }

    Zotero.debug("MomentO7: Archive services initialization complete");
  }
}
