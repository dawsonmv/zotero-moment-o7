// Memento Protocol checker for Zotero 7
// Checks if URLs are already archived in any web archive

Zotero.MementoChecker = {
	AGGREGATOR_URL: "https://timetravel.mementoweb.org/",
	TIMEGATE_URL: "https://timetravel.mementoweb.org/timegate/",
	TIMEMAP_URL: "https://timetravel.mementoweb.org/timemap/json/",

	/**
	 * Check if a URL has any existing archives
	 */
	findArchives: async function (url) {
		try {
			// Request TimeMap (list of all mementos)
			const response = await Zotero.HTTP.request("GET", this.TIMEMAP_URL + url, {
				timeout: 15000,
				responseType: "json"
			});

			if (response.status === 200) {
				const data = response.response;

				// Parse mementos
				const mementos = data.mementos || [];
				const archives = {
					count: mementos.length,
					first: null,
					last: null,
					sources: new Set(),
					archives: []
				};

				if (mementos.length > 0) {
					// Get first and last
					archives.first = {
						datetime: mementos[0].datetime,
						uri: mementos[0].uri
					};
					archives.last = {
						datetime: mementos[mementos.length - 1].datetime,
						uri: mementos[mementos.length - 1].uri
					};

					// Group by archive source
					mementos.forEach(memento => {
						const source = this.getArchiveSource(memento.uri);
						archives.sources.add(source);

						archives.archives.push({
							datetime: memento.datetime,
							uri: memento.uri,
							source: source
						});
					});
				}

				archives.sources = Array.from(archives.sources);
				return archives;
			}
		} catch (error) {
			if (error.status === 404) {
				// No archives found
				return {
					count: 0,
					sources: [],
					archives: []
				};
			}
			throw error;
		}
	},

	/**
	 * Get the closest memento to a specific date
	 */
	getClosestMemento: async function (url, datetime = new Date()) {
		try {
			const dateStr = datetime.toISOString().slice(0, 19).replace(/[-:]/g, "");
			const timegateUrl = `${this.TIMEGATE_URL}${dateStr}/${url}`;

			const response = await Zotero.HTTP.request("HEAD", timegateUrl, {
				timeout: 10000
			});

			if (response.status === 302) {
				const location = response.getResponseHeader("Location");
				const mementoDatetime = response.getResponseHeader("Memento-Datetime");

				return {
					uri: location,
					datetime: mementoDatetime,
					source: this.getArchiveSource(location)
				};
			}
		} catch (error) {
			if (error.status === 404) {
				return null;
			}
			throw error;
		}
	},

	/**
	 * Identify archive source from URL
	 */
	getArchiveSource: function (uri) {
		if (uri.includes("web.archive.org")) {
			return "Internet Archive";
		} else if (uri.includes("archive.today") || uri.includes("archive.is") || uri.includes("archive.ph")) {
			return "Archive.today";
		} else if (uri.includes("perma.cc")) {
			return "Perma.cc";
		} else if (uri.includes("webarchive.org.uk")) {
			return "UK Web Archive";
		} else if (uri.includes("arquivo.pt")) {
			return "Portuguese Web Archive";
		} else if (uri.includes("webarchive.loc.gov")) {
			return "Library of Congress";
		} else if (uri.includes("wayback.archive-it.org")) {
			return "Archive-It";
		} else {
			// Extract domain as source
			try {
				// Parse URL to get hostname
				const match = uri.match(/^https?:\/\/([^/]+)/);
				if (match) {
					return match[1];
				}
			} catch {
				// Ignore error
			}
			return "Unknown Archive";
		}
	},

	/**
	 * Check archives for selected items
	 */
	checkSelected: async function () {
		const ZoteroPane = Zotero.getActiveZoteroPane();
		const selectedItems = ZoteroPane.getSelectedItems();

		if (selectedItems.length === 0) {
			return;
		}

		const progressWin = new Zotero.ProgressWindow({
			closeOnClick: true
		});
		progressWin.changeHeadline("Checking for existing archives...");
		progressWin.show();

		let totalArchives = 0;

		for (const item of selectedItems) {
			if (item.isNote() || item.isAttachment()) {
				continue;
			}

			const url = item.getField("url");
			if (!url) {
				continue;
			}

			try {
				progressWin.addLines([`Checking: ${item.getField("title")}`]);

				const archives = await this.findArchives(url);

				if (archives.count > 0) {
					totalArchives += archives.count;

					// Create detailed note
					await this.createArchiveReport(item, url, archives);

					// Show summary
					const sources = archives.sources.join(", ");
					progressWin.addLines([
						`✓ Found ${archives.count} archives in: ${sources}`,
						`  First: ${new Date(archives.first.datetime).toLocaleDateString()}`,
						`  Last: ${new Date(archives.last.datetime).toLocaleDateString()}`
					]);

					// Add tag
					item.addTag("has-memento");
					await item.saveTx();
				} else {
					progressWin.addLines(["✗ No archives found"]);
				}
			} catch (error) {
				progressWin.addLines([`✗ Error: ${error.message}`]);
				Zotero.logError(`Memento check error for ${url}: ${error}`);
			}
		}

		// Show summary
		const summary = totalArchives > 0 ?
			`Found ${totalArchives} total archives` :
			"No existing archives found";
		progressWin.addDescription(summary);
		progressWin.startCloseTimer(8000);
	},

	/**
	 * Create a note with archive report
	 */
	createArchiveReport: async function (item, originalUrl, archives) {

		let noteContent = "<h3>Existing Archives Report</h3>";
		noteContent += `<p>Original URL: <a href="${originalUrl}">${originalUrl}</a></p>`;
		noteContent += `<p>Total archives found: ${archives.count}</p>`;

		// Group by source
		const bySource = {};
		archives.archives.forEach(archive => {
			if (!bySource[archive.source]) {
				bySource[archive.source] = [];
			}
			bySource[archive.source].push(archive);
		});

		// List archives by source
		noteContent += "<h4>Archives by Source:</h4>";
		for (const [source, sourceArchives] of Object.entries(bySource)) {
			noteContent += `<p><b>${source}</b> (${sourceArchives.length} snapshots)</p>`;
			noteContent += "<ul>";

			// Show first few and last
			const toShow = sourceArchives.slice(0, 3);
			if (sourceArchives.length > 3) {
				toShow.push(sourceArchives[sourceArchives.length - 1]);
			}

			toShow.forEach((archive, index) => {
				const date = new Date(archive.datetime).toLocaleString();
				const isLast = index === toShow.length - 1 && sourceArchives.length > 3;
				if (isLast && index === 3) {
					noteContent += "<li>...</li>";
				}
				noteContent += `<li><a href="${archive.uri}">${date}</a></li>`;
			});

			noteContent += "</ul>";
		}

		// Recommendations
		noteContent += "<h4>Recommendations:</h4>";
		noteContent += "<ul>";

		const lastArchive = new Date(archives.last.datetime);
		const daysSinceLastArchive = Math.floor((new Date() - lastArchive) / (1000 * 60 * 60 * 24));

		if (daysSinceLastArchive > 180) {
			noteContent += `<li>Last archive is ${daysSinceLastArchive} days old. Consider creating a new archive.</li>`;
		} else {
			noteContent += `<li>Recent archive exists (${daysSinceLastArchive} days ago). No need to create new archive.</li>`;
		}

		if (!archives.sources.includes("Perma.cc")) {
			noteContent += "<li>No Perma.cc archive found. Consider creating one for permanent citation.</li>";
		}

		noteContent += "</ul>";

		noteContent += `<p><small>Report generated: ${new Date().toLocaleString()}</small></p>`;

		await item.addNote(noteContent);
	}
};