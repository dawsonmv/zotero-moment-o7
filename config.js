/**
 * Configuration file for Zotero Moment-o7
 * 
 * Update these values based on your deployment
 */

const CONFIG = {
	// Archive.today proxy URL - Deploy your own Cloudflare Worker
	// See ARCHIVE_TODAY_SETUP.md for instructions
	ARCHIVE_TODAY_PROXY_URL: "https://archive-proxy.YOUR-SUBDOMAIN.workers.dev/archive",
	
	// Optional: Perma.cc API endpoint (usually doesn't need changing)
	PERMACC_API_URL: "https://api.perma.cc/v1",
	
	// Optional: Internet Archive Save URL (usually doesn't need changing)
	INTERNET_ARCHIVE_SAVE_URL: "https://web.archive.org/save/",
	
	// Development settings
	DEBUG: false,
	LOG_LEVEL: "info" // "debug", "info", "warn", "error"
};

// Export for both environments
if (typeof module !== "undefined" && module.exports) {
	module.exports = CONFIG;
}

// Make available to Zotero environment
if (typeof Zotero !== "undefined") {
	Zotero.MomentO7 = Zotero.MomentO7 || {};
	Zotero.MomentO7.CONFIG = CONFIG;
}