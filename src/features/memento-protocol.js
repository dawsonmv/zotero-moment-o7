if (typeof Zotero === "undefined") {
	// var Zotero;
}

/**
 * RFC 7089 compliant Memento Protocol implementation
 * https://tools.ietf.org/html/rfc7089
 */
Zotero.MomentO7.MementoProtocol = class {
	constructor() {
		this.aggregatorUrl = "https://timetravel.mementoweb.org/";
		this.timeGateUrl = "https://timetravel.mementoweb.org/timegate/";
		this.timeMapUrl = "https://timetravel.mementoweb.org/timemap/";
	}

	/**
	 * Format datetime to RFC 1123 format as required by RFC 7089
	 * @param {Date} date
	 * @returns {string} RFC 1123 formatted date
	 */
	formatHttpDate(date) {
		return date.toUTCString();
	}

	/**
	 * Parse HTTP-date to JavaScript Date
	 * @param {string} httpDate
	 * @returns {Date}
	 */
	parseHttpDate(httpDate) {
		return new Date(httpDate);
	}

	/**
	 * Parse Link header according to RFC 5988
	 * @param {string} linkHeader
	 * @returns {Array} Array of link objects with url and rel properties
	 */
	parseLinkHeader(linkHeader) {
		if (!linkHeader) {
			return [];
		}

		const links = [];
		const parts = linkHeader.split(",");

		for (const part of parts) {
			const match = part.match(/<([^>]+)>(.*)$/);
			if (match) {
				const url = match[1];
				const params = match[2];

				const link = { url };

				// Extract rel parameter
				const relMatch = params.match(/rel="([^"]+)"/);
				if (relMatch) {
					link.rel = relMatch[1].split(" ");
				}

				// Extract datetime parameter (for mementos)
				const datetimeMatch = params.match(/datetime="([^"]+)"/);
				if (datetimeMatch) {
					link.datetime = datetimeMatch[1];
				}

				// Extract type parameter
				const typeMatch = params.match(/type="([^"]+)"/);
				if (typeMatch) {
					link.type = typeMatch[1];
				}

				links.push(link);
			}
		}

		return links;
	}

	/**
	 * Find specific link relation in parsed links
	 * @param {Array} links
	 * @param {string} rel
	 * @returns {Object|null}
	 */
	findLinkByRel(links, rel) {
		return links.find(link => link.rel && link.rel.includes(rel));
	}

	/**
	 * Get all mementos from parsed links
	 * @param {Array} links
	 * @returns {Array}
	 */
	getMementos(links) {
		return links.filter(link => link.rel && link.rel.includes("memento"));
	}

	/**
	 * Request a specific datetime version via TimeGate
	 * @param {string} url - Original resource URL
	 * @param {Date} datetime - Desired datetime
	 * @returns {Object} TimeGate response with memento information
	 */
	async timeGateNegotiation(url, datetime = new Date()) {
		const acceptDatetime = this.formatHttpDate(datetime);

		try {
			const response = await Zotero.HTTP.request("HEAD", this.timeGateUrl + url, {
				headers: {
					"Accept-Datetime": acceptDatetime
				},
				timeout: 10000
			});

			// Parse response
			const result = {
				status: response.status,
				location: null,
				mementoDatetime: null,
				links: []
			};

			// Get Location header for redirect
			if (response.status === 302 || response.status === 200) {
				result.location = response.getResponseHeader("Location") || response.responseURL;
			}

			// Get Memento-Datetime header
			const mementoDatetime = response.getResponseHeader("Memento-Datetime");
			if (mementoDatetime) {
				result.mementoDatetime = this.parseHttpDate(mementoDatetime);
			}

			// Parse Link header
			const linkHeader = response.getResponseHeader("Link");
			if (linkHeader) {
				result.links = this.parseLinkHeader(linkHeader);
			}

			return result;

		} catch (error) {
			// Handle specific error codes as per RFC 7089
			if (error.status === 400) {
				throw new Error("Bad Request: Invalid Accept-Datetime header");
			} else if (error.status === 404) {
				throw new Error("Not Found: No mementos exist for this resource");
			} else if (error.status === 406) {
				throw new Error("Not Acceptable: No memento at the requested datetime");
			}
			throw error;
		}
	}

	/**
	 * Get TimeMap (list of all mementos)
	 * @param {string} url - Original resource URL
	 * @param {string} format - Format: 'json' or 'link'
	 * @returns {Object} TimeMap data
	 */
	async getTimeMap(url, format = "json") {
		const timeMapUrl = format === "json"
			? `${this.timeMapUrl}json/${url}`
			: `${this.timeMapUrl}link/${url}`;

		try {
			const response = await Zotero.HTTP.request("GET", timeMapUrl, {
				timeout: 15000,
				responseType: format === "json" ? "json" : "text"
			});

			if (format === "json") {
				return this.parseJsonTimeMap(response.response);
			} else {
				return this.parseLinkTimeMap(response.responseText);
			}

		} catch (error) {
			if (error.status === 404) {
				return {
					original: url,
					mementos: []
				};
			}
			throw error;
		}
	}

	/**
	 * Parse JSON TimeMap format
	 * @param {Object} data
	 * @returns {Object} Normalized TimeMap
	 */
	parseJsonTimeMap(data) {
		const timeMap = {
			original: data.original_uri,
			timeGate: data.timegate_uri,
			timeMapUrl: data.timemap_uri,
			mementos: []
		};

		// Extract mementos
		const mementoList = data.mementos?.list || data.mementos || [];

		for (const memento of mementoList) {
			timeMap.mementos.push({
				datetime: new Date(memento.datetime),
				uri: memento.uri,
				rel: memento.rel || ["memento"]
			});
		}

		// Sort by datetime
		timeMap.mementos.sort((a, b) => a.datetime - b.datetime);

		// Mark first and last
		if (timeMap.mementos.length > 0) {
			timeMap.mementos[0].rel.push("first");
			timeMap.mementos[timeMap.mementos.length - 1].rel.push("last");
		}

		return timeMap;
	}

	/**
	 * Parse Link format TimeMap
	 * @param {string} linkData
	 * @returns {Object} Normalized TimeMap
	 */
	parseLinkTimeMap(linkData) {
		const lines = linkData.split("\n");
		const timeMap = {
			original: null,
			timeGate: null,
			timeMapUrl: null,
			mementos: []
		};

		for (const line of lines) {
			if (!line.trim()) {
				continue;
			}

			const links = this.parseLinkHeader(line);
			for (const link of links) {
				if (link.rel.includes("original")) {
					timeMap.original = link.url;
				} else if (link.rel.includes("timegate")) {
					timeMap.timeGate = link.url;
				} else if (link.rel.includes("self") && link.type === "application/link-format") {
					timeMap.timeMapUrl = link.url;
				} else if (link.rel.includes("memento")) {
					timeMap.mementos.push({
						datetime: new Date(link.datetime),
						uri: link.url,
						rel: link.rel
					});
				}
			}
		}

		return timeMap;
	}

	/**
	 * Check if a URL has existing mementos
	 * @param {string} url
	 * @returns {Object} Archive information
	 */
	async checkArchives(url) {
		const timeMap = await this.getTimeMap(url);

		const archives = {
			count: timeMap.mementos.length,
			hasArchives: timeMap.mementos.length > 0,
			firstMemento: null,
			lastMemento: null,
			sources: new Set(),
			mementos: timeMap.mementos
		};

		if (archives.hasArchives) {
			archives.firstMemento = timeMap.mementos[0];
			archives.lastMemento = timeMap.mementos[timeMap.mementos.length - 1];

			// Identify sources
			for (const memento of timeMap.mementos) {
				const source = this.identifyArchiveSource(memento.uri);
				archives.sources.add(source);
			}
		}

		archives.sources = Array.from(archives.sources);
		return archives;
	}

	/**
	 * Identify archive source from memento URI
	 * @param {string} uri
	 * @returns {string} Archive source name
	 */
	identifyArchiveSource(uri) {
		const patterns = [
			{ pattern: /web\.archive\.org/, name: "Internet Archive" },
			{ pattern: /archive\.(today|is|ph|li|vn|fo|md)/, name: "Archive.today" },
			{ pattern: /perma\.cc/, name: "Perma.cc" },
			{ pattern: /webarchive\.org\.uk/, name: "UK Web Archive" },
			{ pattern: /arquivo\.pt/, name: "Portuguese Web Archive" },
			{ pattern: /webarchive\.loc\.gov/, name: "Library of Congress" },
			{ pattern: /wayback\.archive-it\.org/, name: "Archive-It" },
			{ pattern: /web\.archive\.org\.au/, name: "Australian Web Archive" },
			{ pattern: /webarchiv\.bundestag\.de/, name: "German Parliament Archive" }
		];

		for (const { pattern, name } of patterns) {
			if (pattern.test(uri)) {
				return name;
			}
		}

		// Extract domain as fallback
		try {
			const match = uri.match(/^https?:\/\/([^/]+)/);
			if (match) {
				return match[1];
			}
		} catch {
			// Ignore error
		}
		return "Unknown Archive";
	}
};