/* global Zotero */

Zotero.MomentO7.PreferencesPane = {
	init() {
		// Initialize preference values
		this.loadRobustServices();
		this.updateTimeoutDisplay();
	},

	loadRobustServices() {
		const robustServices = Zotero.Prefs.get("extensions.momento7.robustLinkServices", "internetarchive,archivetoday").split(",");
		const services = ["internetarchive", "archivetoday", "permacc", "ukwebarchive", "arquivopt"];
		
		services.forEach(service => {
			const checkbox = document.getElementById(`robust-${service}`);
			if (checkbox) {
				checkbox.checked = robustServices.includes(service);
			}
		});
	},

	updateRobustServices() {
		const services = [];
		const checkboxes = ["internetarchive", "archivetoday", "permacc", "ukwebarchive", "arquivopt"];
		
		checkboxes.forEach(service => {
			const checkbox = document.getElementById(`robust-${service}`);
			if (checkbox && checkbox.checked) {
				services.push(service);
			}
		});
		
		Zotero.Prefs.set("extensions.momento7.robustLinkServices", services.join(","));
	},

	updateTimeoutDisplay() {
		// Convert milliseconds to seconds for display
		const timeoutInput = document.getElementById("momento7-iaTimeout");
		const delayInput = document.getElementById("momento7-iaRetryDelay");
		
		if (timeoutInput) {
			const msValue = Zotero.Prefs.get("extensions.momento7.iaTimeout", 120000);
			timeoutInput.value = Math.round(msValue / 1000);
			
			timeoutInput.addEventListener("change", () => {
				const seconds = parseInt(timeoutInput.value) || 120;
				Zotero.Prefs.set("extensions.momento7.iaTimeout", seconds * 1000);
			});
		}
		
		if (delayInput) {
			const msValue = Zotero.Prefs.get("extensions.momento7.iaRetryDelay", 5000);
			delayInput.value = Math.round(msValue / 1000);
			
			delayInput.addEventListener("change", () => {
				const seconds = parseInt(delayInput.value) || 5;
				Zotero.Prefs.set("extensions.momento7.iaRetryDelay", seconds * 1000);
			});
		}
	}
};

// Initialize when the pane loads
window.addEventListener("load", () => {
	Zotero.MomentO7.PreferencesPane.init();
});