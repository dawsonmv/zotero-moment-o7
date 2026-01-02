import { MementoProtocol, TimeMap } from "./MementoProtocol";

export interface MementoCheckResult {
  hasMemento: boolean;
  mementos: MementoInfo[];
  timegate?: string;
  timemap?: string;
}

export interface MementoInfo {
  url: string;
  datetime: string;
  service: string;
}

export class MementoChecker {
  private static readonly AGGREGATORS = [
    {
      name: "Time Travel",
      timegateUrl: "http://timetravel.mementoweb.org/timegate/",
      timemapUrl: "http://timetravel.mementoweb.org/timemap/json/",
    },
    {
      name: "MemGator",
      timegateUrl: "https://memgator.cs.odu.edu/timegate/",
      timemapUrl: "https://memgator.cs.odu.edu/timemap/json/",
    },
  ];

  private static readonly KNOWN_ARCHIVES = [
    {
      name: "Internet Archive",
      pattern: /web\.archive\.org/i,
      timegateUrl: "https://web.archive.org/web/",
      timemapUrl: "https://web.archive.org/web/timemap/json/",
    },
    {
      name: "Archive.today",
      pattern: /archive\.(today|is|ph|md|li)/i,
      // Archive.today doesn't support Memento Protocol directly
      timegateUrl: null,
      timemapUrl: null,
    },
    {
      name: "UK Web Archive",
      pattern: /webarchive\.org\.uk/i,
      timegateUrl: "https://www.webarchive.org.uk/wayback/",
      timemapUrl: "https://www.webarchive.org.uk/wayback/timemap/json/",
    },
    {
      name: "Arquivo.pt",
      pattern: /arquivo\.pt/i,
      timegateUrl: "https://arquivo.pt/wayback/",
      timemapUrl: "https://arquivo.pt/wayback/timemap/json/",
    },
  ];

  /**
   * Check for existing mementos of a URL
   */
  static async checkUrl(url: string): Promise<MementoCheckResult> {
    const result: MementoCheckResult = {
      hasMemento: false,
      mementos: [],
    };

    // Try aggregators first
    for (const aggregator of this.AGGREGATORS) {
      try {
        const timemap = await this.fetchTimeMap(
          aggregator.timemapUrl + encodeURIComponent(url),
        );
        if (timemap && timemap.mementos.length > 0) {
          result.hasMemento = true;
          result.timegate = aggregator.timegateUrl + url;
          result.timemap = aggregator.timemapUrl + url;
          result.mementos = this.extractMementoInfo(timemap);
          return result;
        }
      } catch (error) {
        console.warn(`Failed to check ${aggregator.name}:`, error);
      }
    }

    // Try individual archives
    for (const archive of this.KNOWN_ARCHIVES) {
      if (archive.timemapUrl) {
        try {
          const timemap = await this.fetchTimeMap(
            archive.timemapUrl + encodeURIComponent(url),
          );
          if (timemap && timemap.mementos.length > 0) {
            result.hasMemento = true;
            result.mementos.push(
              ...this.extractMementoInfo(timemap, archive.name),
            );
          }
        } catch (error) {
          console.warn(`Failed to check ${archive.name}:`, error);
        }
      }
    }

    return result;
  }

  /**
   * Check if a specific archive has a memento
   */
  static async checkArchive(
    url: string,
    archiveName: string,
  ): Promise<MementoInfo | null> {
    const archive = this.KNOWN_ARCHIVES.find(
      (a) => a.name.toLowerCase() === archiveName.toLowerCase(),
    );

    if (!archive || !archive.timemapUrl) {
      return null;
    }

    try {
      const timemap = await this.fetchTimeMap(
        archive.timemapUrl + encodeURIComponent(url),
      );
      if (timemap && timemap.mementos.length > 0) {
        const bestMemento = MementoProtocol.findBestMemento(timemap.mementos);
        if (bestMemento) {
          return {
            url: bestMemento.url,
            datetime: bestMemento.datetime,
            service: archive.name,
          };
        }
      }
    } catch (error) {
      console.warn(`Failed to check ${archive.name}:`, error);
    }

    return null;
  }

  /**
   * Fetch TimeMap from a URL
   */
  private static async fetchTimeMap(
    timemapUrl: string,
  ): Promise<TimeMap | null> {
    try {
      const response = await Zotero.HTTP.request(timemapUrl, {
        method: "GET",
        timeout: 30000,
        headers: {
          Accept: "application/json, application/link-format",
        },
      });

      if (response.status !== 200) {
        return null;
      }

      // Try parsing as JSON first
      try {
        const json = JSON.parse(response.responseText || "{}");
        return MementoProtocol.parseTimeMap(json);
      } catch {
        // Try parsing as link format
        return MementoProtocol.parseTimemapLinkFormat(
          response.responseText || "",
        );
      }
    } catch (error) {
      console.error("Failed to fetch TimeMap:", error);
      return null;
    }
  }

  /**
   * Extract memento information from TimeMap
   */
  private static extractMementoInfo(
    timemap: TimeMap,
    serviceName?: string,
  ): MementoInfo[] {
    return timemap.mementos.map((memento) => {
      let service = serviceName || "Unknown";

      // Try to detect service from URL if not provided
      if (!serviceName) {
        for (const archive of this.KNOWN_ARCHIVES) {
          if (archive.pattern.test(memento.url)) {
            service = archive.name;
            break;
          }
        }
      }

      return {
        url: memento.url,
        datetime: memento.datetime,
        service,
      };
    });
  }

  /**
   * Find existing mementos in item data
   */
  static findExistingMementos(item: Zotero.Item): MementoInfo[] {
    const mementos: MementoInfo[] = [];

    // Check Extra field
    const extra = item.getField("extra");
    if (extra) {
      // Look for archived URLs
      const patterns = [
        /Archived:\s*(https?:\/\/[^\s]+)/gi,
        /Internet Archive:\s*(https?:\/\/[^\s]+)/gi,
        /Archive\.today:\s*(https?:\/\/[^\s]+)/gi,
        /Perma\.cc:\s*(https?:\/\/[^\s]+)/gi,
      ];

      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(extra)) !== null) {
          const url = match[1];
          let service = "Unknown";

          // Detect service
          for (const archive of this.KNOWN_ARCHIVES) {
            if (archive.pattern.test(url)) {
              service = archive.name;
              break;
            }
          }

          mementos.push({
            url,
            datetime: new Date().toISOString(), // We don't have the actual datetime
            service,
          });
        }
      }
    }

    // Check notes
    const notes = item.getNotes ? item.getNotes() : [];
    for (const noteId of notes) {
      const note = Zotero.Items.get(noteId);
      if (note && note.getNote) {
        const noteContent = note.getNote();
        // Look for robust links
        const robustLinkPattern = /data-versionurl="([^"]+)"/g;
        let match;
        while ((match = robustLinkPattern.exec(noteContent)) !== null) {
          const url = match[1];
          let service = "Unknown";

          // Detect service
          for (const archive of this.KNOWN_ARCHIVES) {
            if (archive.pattern.test(url)) {
              service = archive.name;
              break;
            }
          }

          // Get datetime if available
          const datetimeMatch = noteContent.match(
            new RegExp(
              `data-versiondate="([^"]+)"[^>]*data-versionurl="${url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`,
            ),
          );
          const datetime =
            datetimeMatch && datetimeMatch.length > 1 && datetimeMatch[1]
              ? datetimeMatch[1]
              : new Date().toISOString();

          mementos.push({
            url,
            datetime,
            service,
          });
        }
      }
    }

    // Remove duplicates
    const uniqueMementos = new Map<string, MementoInfo>();
    for (const memento of mementos) {
      uniqueMementos.set(memento.url, memento);
    }

    return Array.from(uniqueMementos.values());
  }
}
