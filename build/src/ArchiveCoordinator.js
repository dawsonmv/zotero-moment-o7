if (typeof Zotero === "undefined") {
	// var Zotero;
}

Zotero.MomentO7.ArchiveCoordinator = {
	init: function () {
		this.mementoChecker = Zotero.MomentO7.MementoChecker;
		this.registry = Zotero.MomentO7.ServiceRegistry;
	},

	async archiveItems(items, serviceId = null) {
		if (!items || items.length === 0) {
			throw new Error("No items provided for archiving");
		}

		const results = [];

		for (const item of items) {
			try {
				const result = await this.archiveItem(item, serviceId);
				results.push(result);
			} catch (e) {
				Zotero.debug(`MomentO7: Error archiving item ${item.id}: ${e}`);
				results.push({
					item: item,
					success: false,
					error: e.message
				});
			}
		}

		return results;
	},

	async archiveItem(item, serviceId = null) {
		const url = item.getField("url");
		if (!url) {
			throw new Error("Item has no URL to archive");
		}

		const existingArchives = await this.checkExistingArchives(url);

		if (existingArchives.length > 0 && !serviceId) {
			const recentArchive = this.getMostRecentArchive(existingArchives);
			const daysSinceArchive = (Date.now() - new Date(recentArchive.datetime)) / (1000 * 60 * 60 * 24);

			if (daysSinceArchive < 30) {
				return {
					item: item,
					success: true,
					existingArchive: recentArchive,
					message: `Recent archive found from ${recentArchive.archive} (${Math.floor(daysSinceArchive)} days ago)`
				};
			}
		}

		if (serviceId) {
			const service = this.registry.get(serviceId);
			if (!service) {
				throw new Error(`Service ${serviceId} not found`);
			}
			return await this.archiveWithService(item, service, serviceId);
		} else {
			return await this.archiveWithBestService(item, existingArchives);
		}
	},

	async checkExistingArchives(url) {
		try {
			if (this.mementoChecker) {
				return await this.mementoChecker.findArchives(url);
			}
		} catch (e) {
			Zotero.debug(`MomentO7: Error checking existing archives: ${e}`);
		}
		return [];
	},

	getMostRecentArchive(archives) {
		return archives.reduce((mostRecent, archive) => {
			const archiveDate = new Date(archive.datetime);
			const mostRecentDate = new Date(mostRecent.datetime);
			return archiveDate > mostRecentDate ? archive : mostRecent;
		});
	},

	async archiveWithService(item, service, serviceId) {
		try {
			await service.checkRateLimit();
			const result = await service.archive([item]);
			service.updateLastRequest();

			return {
				item: item,
				success: true,
				service: serviceId,
				result: result
			};
		} catch (e) {
			return {
				item: item,
				success: false,
				service: serviceId,
				error: e.message
			};
		}
	},

	async archiveWithBestService(item, existingArchives) {
		const availableServices = await this.registry.getAvailable();

		if (availableServices.length === 0) {
			throw new Error("No archiving services available");
		}

		const existingServiceIds = new Set(
			existingArchives.map(a => this.getServiceIdFromArchive(a.archive))
		);

		// Get fallback order from preferences
		const fallbackOrder = Zotero.Prefs.get("extensions.momento7.fallbackOrder",
			"internetarchive,archivetoday,arquivopt,permacc,ukwebarchive").split(",");

		// Sort available services according to fallback order
		const orderedServices = [];
		for (const serviceId of fallbackOrder) {
			const service = availableServices.find(s => s.id === serviceId);
			if (service && !existingServiceIds.has(serviceId)) {
				orderedServices.push(service);
			}
		}

		// Add any remaining services not in the fallback order
		for (const service of availableServices) {
			if (!orderedServices.find(s => s.id === service.id) && !existingServiceIds.has(service.id)) {
				orderedServices.push(service);
			}
		}

		const servicesToTry = orderedServices.length > 0 ? orderedServices : availableServices;

		const errors = [];
		for (const { id, service } of servicesToTry) {
			try {
				const result = await this.archiveWithService(item, service, id);
				if (result.success) {
					return result;
				}
				errors.push(`${id}: ${result.error}`);
			} catch (e) {
				errors.push(`${id}: ${e.message}`);
			}
		}

		throw new Error(`All archive services failed:\n${errors.join("\n")}`);
	},

	getServiceIdFromArchive(archiveName) {
		const mapping = {
			"archive.org": "internetarchive",
			"archive.today": "archivetoday",
			"archive.is": "archivetoday",
			"perma.cc": "permacc",
			"webarchive.org.uk": "ukwebarchive"
		};

		for (const [domain, serviceId] of Object.entries(mapping)) {
			if (archiveName.toLowerCase().includes(domain)) {
				return serviceId;
			}
		}

		return archiveName.toLowerCase().replace(/[^a-z0-9]/g, "");
	},

	async autoArchive(item) {
		const url = item.getField("url");
		if (!url || !this.shouldAutoArchive(url)) {
			return null;
		}

		// Use default service from preferences
		const defaultService = Zotero.Prefs.get("extensions.momento7.defaultService", "internetarchive");

		try {
			return await this.archiveItem(item, defaultService);
		} catch (e) {
			Zotero.debug(`MomentO7: Auto-archive failed for item ${item.id}: ${e}`);
			return null;
		}
	},

	shouldAutoArchive(url) {
		const excludePatterns = [
			/^file:/i,
			/^chrome:/i,
			/^about:/i,
			/^data:/i,
			/localhost/i,
			/127\.0\.0\.1/,
			/192\.168\./,
			/10\.\d+\.\d+\.\d+/,
			/172\.(1[6-9]|2[0-9]|3[0-1])\./
		];

		return !excludePatterns.some(pattern => pattern.test(url));
	}
};