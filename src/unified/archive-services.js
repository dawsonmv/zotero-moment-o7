/**
 * Unified Archive Services - KISS Architecture with All Services
 * 
 * Combines simplicity of KISS version with full service support
 */

// Load configuration
const CONFIG = Zotero.MomentO7?.CONFIG || {
	ARCHIVE_TODAY_PROXY_URL: "https://archive-proxy.YOUR-SUBDOMAIN.workers.dev/archive"
};

/**
 * Simple service definitions without inheritance
 */
Zotero.MomentO7.Services = {
	/**
	 * Internet Archive Service
	 */
	internetArchive: {
		id: "internetarchive",
		name: "Internet Archive",
		
		async archive(url) {
			const saveUrl = `https://web.archive.org/save/${url}`;
			const response = await Zotero.HTTP.request("GET", saveUrl, {
				timeout: 30000,
				responseType: "text"
			});
			
			// Extract archived URL from response headers or content
			const location = response.getResponseHeader("Content-Location") || 
			                response.getResponseHeader("X-Archive-Orig-Location");
			
			if (location && location.includes("/web/")) {
				return `https://web.archive.org${location}`;
			}
			
			// Fallback: construct URL
			const timestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
			return `https://web.archive.org/web/${timestamp}/${url}`;
		},
		
		async checkExisting(url) {
			try {
				const checkUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`;
				const response = await Zotero.HTTP.request("GET", checkUrl, {
					responseType: "json",
					timeout: 5000
				});
				
				return response.response?.archived_snapshots?.closest?.available || false;
			} catch {
				return false;
			}
		}
	},
	
	/**
	 * Archive.today Service
	 */
	archiveToday: {
		id: "archivetoday",
		name: "Archive.today",
		
		async archive(url) {
			if (!CONFIG.ARCHIVE_TODAY_PROXY_URL || CONFIG.ARCHIVE_TODAY_PROXY_URL.includes("YOUR-")) {
				throw new Error("Archive.today proxy not configured. See ARCHIVE_TODAY_SETUP.md");
			}
			
			const response = await Zotero.HTTP.request("POST", CONFIG.ARCHIVE_TODAY_PROXY_URL, {
				body: JSON.stringify({ url }),
				headers: { "Content-Type": "application/json" },
				timeout: 30000,
				responseType: "json"
			});
			
			if (!response.response?.archived_url) {
				throw new Error("Archive.today did not return an archive URL");
			}
			
			return response.response.archived_url;
		},
		
		async checkExisting(url) {
			// Archive.today doesn't provide a check API
			return false;
		}
	},
	
	/**
	 * Perma.cc Service
	 */
	permacc: {
		id: "permacc",
		name: "Perma.cc",
		
		async archive(url) {
			const apiKey = Zotero.Prefs.get("extensions.momento7.permacc.apiKey");
			if (!apiKey) {
				throw new Error("Perma.cc API key not configured");
			}
			
			const folderId = Zotero.Prefs.get("extensions.momento7.permacc.folderId") || null;
			
			const body = JSON.stringify({
				url: url,
				folder: folderId,
				title: url
			});
			
			const response = await Zotero.HTTP.request("POST", "https://api.perma.cc/v1/archives/", {
				headers: {
					"Authorization": `ApiKey ${apiKey}`,
					"Content-Type": "application/json"
				},
				body: body,
				timeout: 30000,
				responseType: "json"
			});
			
			if (!response.response?.guid) {
				throw new Error(response.response?.error || "Perma.cc archive failed");
			}
			
			return `https://perma.cc/${response.response.guid}`;
		},
		
		async checkExisting(url) {
			const apiKey = Zotero.Prefs.get("extensions.momento7.permacc.apiKey");
			if (!apiKey) return false;
			
			try {
				const response = await Zotero.HTTP.request("GET", 
					`https://api.perma.cc/v1/public/archives/?url=${encodeURIComponent(url)}`, {
					headers: { "Authorization": `ApiKey ${apiKey}` },
					timeout: 5000,
					responseType: "json"
				});
				
				return response.response?.objects?.length > 0;
			} catch {
				return false;
			}
		}
	},
	
	/**
	 * UK Web Archive Service  
	 */
	ukWebArchive: {
		id: "ukwebarchive",
		name: "UK Web Archive",
		
		async archive(url) {
			// UK Web Archive uses a form submission
			const formData = `url=${encodeURIComponent(url)}`;
			
			const response = await Zotero.HTTP.request("POST", 
				"https://www.webarchive.org.uk/ukwa/interject/save", {
				headers: {
					"Content-Type": "application/x-www-form-urlencoded"
				},
				body: formData,
				timeout: 30000
			});
			
			// Extract job ID from response
			const match = response.responseText.match(/job[/-]id["\s:]+([^"<\s]+)/i);
			if (match) {
				return `https://www.webarchive.org.uk/wayback/archive/*/${url}`;
			}
			
			throw new Error("UK Web Archive did not return a valid response");
		},
		
		async checkExisting(url) {
			try {
				const checkUrl = `https://www.webarchive.org.uk/wayback/archive/*/${url}`;
				const response = await Zotero.HTTP.request("HEAD", checkUrl, {
					timeout: 5000
				});
				return response.status === 200;
			} catch {
				return false;
			}
		}
	},
	
	/**
	 * Arquivo.pt Service
	 */
	arquivoPt: {
		id: "arquivopt", 
		name: "Arquivo.pt",
		
		async archive(url) {
			const saveUrl = `https://arquivo.pt/save/${url}`;
			
			const response = await Zotero.HTTP.request("GET", saveUrl, {
				timeout: 30000
			});
			
			// Extract archived URL from response
			const match = response.responseText.match(/arquivo\.pt\/wayback\/\d+\/[^\s"<>]+/);
			if (match) {
				return `https://${match[0]}`;
			}
			
			// Fallback URL
			const timestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
			return `https://arquivo.pt/wayback/${timestamp}/${url}`;
		},
		
		async checkExisting(url) {
			try {
				const checkUrl = `https://arquivo.pt/wayback/*/${url}`;
				const response = await Zotero.HTTP.request("HEAD", checkUrl, {
					timeout: 5000
				});
				return response.status === 200;
			} catch {
				return false;
			}
		}
	}
};

/**
 * Helper functions
 */
Zotero.MomentO7.ServiceHelpers = {
	
	/**
	 * Get enabled services
	 */
	getEnabledServices() {
		const services = [];
		for (const [key, service] of Object.entries(Zotero.MomentO7.Services)) {
			if (Zotero.Prefs.get(`extensions.momento7.service.${service.id}`) !== false) {
				services.push(service);
			}
		}
		return services;
	},
	
	/**
	 * Archive URL with all enabled services
	 */
	async archiveWithAllServices(url) {
		const services = this.getEnabledServices();
		const results = [];
		
		for (const service of services) {
			try {
				// Validate URL first
				if (!Zotero.MomentO7.Utils.isValidUrl(url)) {
					throw new Error("Invalid URL for archiving");
				}
				
				// Check if already archived (skip for services without check)
				if (service.checkExisting) {
					const exists = await service.checkExisting(url);
					if (exists) {
						results.push({
							service: service.id,
							success: true,
							archived_url: `Already archived at ${service.name}`,
							skipped: true
						});
						continue;
					}
				}
				
				const archived_url = await service.archive(url);
				results.push({
					service: service.id,
					success: true,
					archived_url
				});
			} catch (error) {
				results.push({
					service: service.id,
					success: false,
					error: error.message
				});
			}
		}
		
		return results;
	}
};