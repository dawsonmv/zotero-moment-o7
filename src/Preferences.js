if (typeof Zotero === "undefined") {
	// var Zotero;
}

Zotero.MomentO7.Preferences = {
	// Default preferences
	defaults: {
		"extensions.momento7.autoArchive": true,
		"extensions.momento7.defaultService": "internetarchive",
		"extensions.momento7.iaTimeout": 120000, // 2 minutes
		"extensions.momento7.iaMaxRetries": 3,
		"extensions.momento7.iaRetryDelay": 5000, // 5 seconds
		"extensions.momento7.robustLinkServices": "internetarchive,archivetoday",
		"extensions.momento7.fallbackOrder": "internetarchive,archivetoday,arquivopt,permacc,ukwebarchive"
	},

	// Initialize preferences with defaults
	init() {
		for (const [key, value] of Object.entries(this.defaults)) {
			if (Zotero.Prefs.get(key) === undefined) {
				Zotero.Prefs.set(key, value);
			}
		}
	},

	// Create a simple preferences window
	createPreferencesWindow(win) {
		const doc = win.document;
		const container = doc.getElementById("momento7-preferences-container");

		if (!container) {
			// Create inline preferences UI
			this.createInlinePreferences();
			return;
		}

		// Create the preferences UI
		const prefsUI = this.createPreferencesUI();
		container.appendChild(prefsUI);

		// Load current values
		this.loadPreferences();

		// Add button handlers
		const saveButton = doc.createElement("button");
		saveButton.setAttribute("label", "Save");
		saveButton.addEventListener("command", () => {
			this.savePreferences();
			win.close();
		});

		const cancelButton = doc.createElement("button");
		cancelButton.setAttribute("label", "Cancel");
		cancelButton.addEventListener("command", () => {
			win.close();
		});

		const restoreButton = doc.createElement("button");
		restoreButton.setAttribute("label", "Restore Defaults");
		restoreButton.addEventListener("command", () => {
			this.restoreDefaults();
		});

		const buttonBox = doc.createElement("hbox");
		buttonBox.setAttribute("pack", "end");
		buttonBox.setAttribute("style", "margin-top: 20px;");
		buttonBox.appendChild(restoreButton);
		const spacer = doc.createElement("spacer");
		spacer.setAttribute("flex", "1");
		buttonBox.appendChild(spacer);
		buttonBox.appendChild(cancelButton);
		buttonBox.appendChild(saveButton);

		container.appendChild(buttonBox);
	},

	// Create inline preferences for simple dialog
	createInlinePreferences() {
		const params = {
			autoArchive: Zotero.Prefs.get("extensions.momento7.autoArchive", true),
			defaultService: Zotero.Prefs.get("extensions.momento7.defaultService", "internetarchive"),
			iaTimeout: Math.round(Zotero.Prefs.get("extensions.momento7.iaTimeout", 120000) / 1000),
			iaMaxRetries: Zotero.Prefs.get("extensions.momento7.iaMaxRetries", 3),
			iaRetryDelay: Math.round(Zotero.Prefs.get("extensions.momento7.iaRetryDelay", 5000) / 1000),
			robustLinkServices: Zotero.Prefs.get("extensions.momento7.robustLinkServices", "internetarchive,archivetoday"),
			fallbackOrder: Zotero.Prefs.get("extensions.momento7.fallbackOrder", "internetarchive,archivetoday,arquivopt,permacc,ukwebarchive"),
			permaccApiKey: Zotero.Prefs.get("extensions.momento7.permaccApiKey", "")
		};

		window.openDialog(
			"data:application/xhtml+xml," + encodeURIComponent(this.getSimplePreferencesHTML()),
			"momento7-preferences-simple",
			"chrome,dialog,centerscreen,modal,resizable=yes,width=600,height=700",
			params
		);

		// Save if OK was clicked
		if (params.save) {
			Zotero.Prefs.set("extensions.momento7.autoArchive", params.autoArchive);
			Zotero.Prefs.set("extensions.momento7.defaultService", params.defaultService);
			Zotero.Prefs.set("extensions.momento7.iaTimeout", params.iaTimeout * 1000);
			Zotero.Prefs.set("extensions.momento7.iaMaxRetries", params.iaMaxRetries);
			Zotero.Prefs.set("extensions.momento7.iaRetryDelay", params.iaRetryDelay * 1000);
			Zotero.Prefs.set("extensions.momento7.robustLinkServices", params.robustLinkServices);
			Zotero.Prefs.set("extensions.momento7.fallbackOrder", params.fallbackOrder);
			if (params.permaccApiKey) {
				Zotero.Prefs.set("extensions.momento7.permaccApiKey", params.permaccApiKey);
			}
		}
	},

	// Register preference pane
	registerPane() {
		// This will be called from the main plugin initialization
		Components.utils.import("resource://zotero/preferences/preferences.js");

		if (!Zotero.PreferencePanes) {
			Zotero.PreferencePanes = {};
		}

		Zotero.PreferencePanes.momento7 = {
			id: "zotero-preferences-momento7",
			label: "Moment-o7",
			src: "chrome://zotero-momento7/content/preferences.xhtml",
			scripts: [],

			init: function () {
				// Load current preferences into the UI
				Zotero.MomentO7.Preferences.loadPreferences();
			}
		};
	},

	// Create preferences UI programmatically
	createPreferencesUI() {
		const prefWindow = window.document;
		const container = prefWindow.createElement("vbox");
		container.setAttribute("id", "zotero-preferences-momento7");

		// General Settings Group
		const generalGroup = this.createGroupBox(prefWindow, "General Settings");

		// Auto-archive checkbox
		const autoArchiveRow = prefWindow.createElement("hbox");
		autoArchiveRow.setAttribute("align", "center");
		const autoArchiveCheckbox = prefWindow.createElement("checkbox");
		autoArchiveCheckbox.setAttribute("id", "pref-autoArchive");
		autoArchiveCheckbox.setAttribute("label", "Automatically archive new items added via Browser Connector");
		autoArchiveCheckbox.setAttribute("preference", "extensions.momento7.autoArchive");
		autoArchiveRow.appendChild(autoArchiveCheckbox);
		generalGroup.appendChild(autoArchiveRow);

		// Default service
		const defaultServiceRow = prefWindow.createElement("hbox");
		defaultServiceRow.setAttribute("align", "center");
		const defaultServiceLabel = prefWindow.createElement("label");
		defaultServiceLabel.setAttribute("value", "Default archive service:");
		defaultServiceLabel.setAttribute("control", "pref-defaultService");
		const defaultServiceMenu = prefWindow.createElement("menulist");
		defaultServiceMenu.setAttribute("id", "pref-defaultService");
		defaultServiceMenu.setAttribute("preference", "extensions.momento7.defaultService");

		const defaultServicePopup = prefWindow.createElement("menupopup");
		const services = [
			{ value: "internetarchive", label: "Internet Archive" },
			{ value: "archivetoday", label: "Archive.today" },
			{ value: "permacc", label: "Perma.cc" },
			{ value: "ukwebarchive", label: "UK Web Archive" },
			{ value: "arquivopt", label: "Arquivo.pt" }
		];

		services.forEach(service => {
			const menuitem = prefWindow.createElement("menuitem");
			menuitem.setAttribute("value", service.value);
			menuitem.setAttribute("label", service.label);
			defaultServicePopup.appendChild(menuitem);
		});

		defaultServiceMenu.appendChild(defaultServicePopup);
		defaultServiceRow.appendChild(defaultServiceLabel);
		defaultServiceRow.appendChild(defaultServiceMenu);
		generalGroup.appendChild(defaultServiceRow);

		container.appendChild(generalGroup);

		// Timeout and Retry Settings Group
		const timeoutGroup = this.createGroupBox(prefWindow, "Timeout and Retry Settings");

		// IA Timeout
		const timeoutRow = this.createNumberRow(prefWindow,
			"Internet Archive timeout (seconds):",
			"pref-iaTimeout",
			"extensions.momento7.iaTimeout",
			30, 300, 120,
			"How long to wait for Internet Archive to respond (30-300 seconds)"
		);
		timeoutGroup.appendChild(timeoutRow.container);
		timeoutGroup.appendChild(timeoutRow.help);

		// Max retries
		const retriesRow = this.createNumberRow(prefWindow,
			"Maximum retry attempts:",
			"pref-iaMaxRetries",
			"extensions.momento7.iaMaxRetries",
			0, 5, 3,
			"Number of times to retry if archiving fails"
		);
		timeoutGroup.appendChild(retriesRow.container);
		timeoutGroup.appendChild(retriesRow.help);

		// Retry delay
		const delayRow = this.createNumberRow(prefWindow,
			"Delay between retries (seconds):",
			"pref-iaRetryDelay",
			"extensions.momento7.iaRetryDelay",
			1, 30, 5,
			"How long to wait between retry attempts"
		);
		timeoutGroup.appendChild(delayRow.container);
		timeoutGroup.appendChild(delayRow.help);

		container.appendChild(timeoutGroup);

		// Robust Links Settings Group
		const robustGroup = this.createGroupBox(prefWindow, "Robust Links Settings");
		const robustDesc = prefWindow.createElement("description");
		robustDesc.textContent = "Select which services to include when creating Robust Links";
		robustGroup.appendChild(robustDesc);

		const robustServices = this.createServiceCheckboxes(prefWindow, "robust");
		robustGroup.appendChild(robustServices);
		container.appendChild(robustGroup);

		// Fallback Order Group
		const fallbackGroup = this.createGroupBox(prefWindow, "Fallback Order");
		const fallbackDesc = prefWindow.createElement("description");
		fallbackDesc.textContent = "When archiving fails with one service, the next service will be tried";
		fallbackGroup.appendChild(fallbackDesc);

		const fallbackList = this.createFallbackList(prefWindow);
		fallbackGroup.appendChild(fallbackList);
		container.appendChild(fallbackGroup);

		// API Keys Group
		const apiGroup = this.createGroupBox(prefWindow, "Service API Keys");

		const permaccRow = prefWindow.createElement("hbox");
		permaccRow.setAttribute("align", "center");
		const permaccLabel = prefWindow.createElement("label");
		permaccLabel.setAttribute("value", "Perma.cc API Key:");
		const permaccTextbox = prefWindow.createElement("textbox");
		permaccTextbox.setAttribute("id", "pref-permaccApiKey");
		permaccTextbox.setAttribute("type", "password");
		permaccTextbox.setAttribute("preference", "extensions.momento7.permaccApiKey");
		permaccTextbox.setAttribute("flex", "1");
		permaccRow.appendChild(permaccLabel);
		permaccRow.appendChild(permaccTextbox);
		apiGroup.appendChild(permaccRow);

		const permaccHelp = prefWindow.createElement("description");
		permaccHelp.setAttribute("class", "help-text");
		permaccHelp.textContent = "Get your free API key at: ";
		const permaccLink = prefWindow.createElement("label");
		permaccLink.setAttribute("class", "text-link");
		permaccLink.setAttribute("value", "https://perma.cc/settings/tools");
		permaccLink.setAttribute("href", "https://perma.cc/settings/tools");
		permaccHelp.appendChild(permaccLink);
		apiGroup.appendChild(permaccHelp);

		container.appendChild(apiGroup);

		return container;
	},

	createGroupBox(doc, label) {
		const groupbox = doc.createElement("groupbox");
		const caption = doc.createElement("label");
		caption.setAttribute("class", "header");
		caption.setAttribute("value", label);
		groupbox.appendChild(caption);
		return groupbox;
	},

	createNumberRow(doc, label, id, pref, min, max, defaultValue, helpText) {
		const container = doc.createElement("hbox");
		container.setAttribute("align", "center");

		const labelElem = doc.createElement("label");
		labelElem.setAttribute("value", label);
		labelElem.setAttribute("control", id);

		const textbox = doc.createElement("textbox");
		textbox.setAttribute("id", id);
		textbox.setAttribute("type", "number");
		textbox.setAttribute("min", min);
		textbox.setAttribute("max", max);
		textbox.setAttribute("preference", pref);
		textbox.setAttribute("size", "5");

		container.appendChild(labelElem);
		container.appendChild(textbox);

		const help = doc.createElement("description");
		help.setAttribute("class", "help-text");
		help.textContent = helpText;

		return { container, help };
	},

	createServiceCheckboxes(doc, prefix) {
		const container = doc.createElement("vbox");
		const services = [
			{ id: "internetarchive", label: "Internet Archive" },
			{ id: "archivetoday", label: "Archive.today" },
			{ id: "permacc", label: "Perma.cc (requires API key)" },
			{ id: "ukwebarchive", label: "UK Web Archive (UK domains only)" },
			{ id: "arquivopt", label: "Arquivo.pt" }
		];

		services.forEach(service => {
			const checkbox = doc.createElement("checkbox");
			checkbox.setAttribute("id", `${prefix}-${service.id}`);
			checkbox.setAttribute("label", service.label);
			checkbox.setAttribute("oncommand", "Zotero.MomentO7.Preferences.updateRobustLinkServices()");
			container.appendChild(checkbox);
		});

		return container;
	},

	createFallbackList(doc) {
		const listbox = doc.createElement("richlistbox");
		listbox.setAttribute("id", "fallback-order");
		listbox.setAttribute("height", "150");

		const services = [
			{ id: "internetarchive", label: "Internet Archive" },
			{ id: "archivetoday", label: "Archive.today" },
			{ id: "arquivopt", label: "Arquivo.pt" },
			{ id: "permacc", label: "Perma.cc" },
			{ id: "ukwebarchive", label: "UK Web Archive" }
		];

		services.forEach(service => {
			const item = doc.createElement("richlistitem");
			item.setAttribute("value", service.id);
			const label = doc.createElement("label");
			label.setAttribute("value", service.label);
			label.setAttribute("flex", "1");
			item.appendChild(label);
			listbox.appendChild(item);
		});

		// Add drag and drop handlers
		listbox.addEventListener("dragstart", this.handleDragStart);
		listbox.addEventListener("dragover", this.handleDragOver);
		listbox.addEventListener("drop", this.handleDrop);
		listbox.addEventListener("dragend", this.handleDragEnd);

		return listbox;
	},

	// Drag and drop handlers
	handleDragStart(event) {
		event.dataTransfer.effectAllowed = "move";
		event.dataTransfer.setData("text/plain", event.target.getAttribute("value"));
		event.target.style.opacity = "0.5";
	},

	handleDragOver(event) {
		if (event.preventDefault) {
			event.preventDefault();
		}
		event.dataTransfer.dropEffect = "move";
		return false;
	},

	handleDrop(event) {
		if (event.stopPropagation) {
			event.stopPropagation();
		}

		const draggedValue = event.dataTransfer.getData("text/plain");
		const targetValue = event.target.getAttribute("value");

		if (draggedValue !== targetValue) {
			// Reorder the items
			Zotero.MomentO7.Preferences.reorderFallbackList(draggedValue, targetValue);
		}

		return false;
	},

	handleDragEnd(event) {
		event.target.style.opacity = "";
	},

	reorderFallbackList(draggedId, targetId) {
		const currentOrder = Zotero.Prefs.get("extensions.momento7.fallbackOrder").split(",");
		const draggedIndex = currentOrder.indexOf(draggedId);
		const targetIndex = currentOrder.indexOf(targetId);

		if (draggedIndex > -1 && targetIndex > -1) {
			currentOrder.splice(draggedIndex, 1);
			currentOrder.splice(targetIndex, 0, draggedId);
			Zotero.Prefs.set("extensions.momento7.fallbackOrder", currentOrder.join(","));
			this.loadPreferences(); // Refresh the UI
		}
	},

	updateRobustLinkServices() {
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

	loadPreferences() {
		// Load auto-archive
		const autoArchive = document.getElementById("pref-autoArchive");
		if (autoArchive) {
			autoArchive.checked = Zotero.Prefs.get("extensions.momento7.autoArchive", true);
		}

		// Load default service
		const defaultService = document.getElementById("pref-defaultService");
		if (defaultService) {
			defaultService.value = Zotero.Prefs.get("extensions.momento7.defaultService", "internetarchive");
		}

		// Load timeout settings (convert from milliseconds)
		const iaTimeout = document.getElementById("pref-iaTimeout");
		if (iaTimeout) {
			iaTimeout.value = Math.round(Zotero.Prefs.get("extensions.momento7.iaTimeout", 120000) / 1000);
		}

		const iaMaxRetries = document.getElementById("pref-iaMaxRetries");
		if (iaMaxRetries) {
			iaMaxRetries.value = Zotero.Prefs.get("extensions.momento7.iaMaxRetries", 3);
		}

		const iaRetryDelay = document.getElementById("pref-iaRetryDelay");
		if (iaRetryDelay) {
			iaRetryDelay.value = Math.round(Zotero.Prefs.get("extensions.momento7.iaRetryDelay", 5000) / 1000);
		}

		// Load robust link services
		const robustServices = Zotero.Prefs.get("extensions.momento7.robustLinkServices", "internetarchive,archivetoday").split(",");
		["internetarchive", "archivetoday", "permacc", "ukwebarchive", "arquivopt"].forEach(service => {
			const checkbox = document.getElementById(`robust-${service}`);
			if (checkbox) {
				checkbox.checked = robustServices.includes(service);
			}
		});

		// Load fallback order
		const fallbackOrder = Zotero.Prefs.get("extensions.momento7.fallbackOrder",
			"internetarchive,archivetoday,arquivopt,permacc,ukwebarchive").split(",");
		const listbox = document.getElementById("fallback-order");
		if (listbox) {
			// Reorder items according to saved preference
			const items = Array.from(listbox.children);
			fallbackOrder.forEach(serviceId => {
				const item = items.find(i => i.getAttribute("value") === serviceId);
				if (item) {
					listbox.appendChild(item);
				}
			});
		}

		// Load API key
		const permaccKey = document.getElementById("pref-permaccApiKey");
		if (permaccKey) {
			permaccKey.value = Zotero.Prefs.get("extensions.momento7.permaccApiKey", "");
		}
	},

	savePreferences() {
		// Save timeout settings (convert to milliseconds)
		const iaTimeout = document.getElementById("pref-iaTimeout");
		if (iaTimeout) {
			Zotero.Prefs.set("extensions.momento7.iaTimeout", parseInt(iaTimeout.value) * 1000);
		}

		const iaRetryDelay = document.getElementById("pref-iaRetryDelay");
		if (iaRetryDelay) {
			Zotero.Prefs.set("extensions.momento7.iaRetryDelay", parseInt(iaRetryDelay.value) * 1000);
		}

		// Save fallback order
		const listbox = document.getElementById("fallback-order");
		if (listbox) {
			const order = Array.from(listbox.children).map(item => item.getAttribute("value"));
			Zotero.Prefs.set("extensions.momento7.fallbackOrder", order.join(","));
		}

		// Update robust link services
		this.updateRobustLinkServices();
	},

	restoreDefaults() {
		if (Services.prompt.confirm(window, "Restore Defaults",
			"Are you sure you want to restore all settings to their defaults?")) {
			// Clear preferences (except API keys)
			for (const key of Object.keys(this.defaults)) {
				if (!key.includes("ApiKey")) {
					Zotero.Prefs.clear(key);
				}
			}

			// Reinitialize with defaults
			this.init();

			// Reload UI
			this.loadPreferences();
		}
	},

	getSimplePreferencesHTML() {
		return `<?xml version="1.0"?>
<?xml-stylesheet href="chrome://global/skin/" type="text/css"?>
<dialog xmlns="http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul"
	title="Moment-o7 Preferences"
	buttons="accept,cancel"
	onaccept="return savePreferences();"
	oncancel="return true;"
	style="padding: 0;">
	
	<script><![CDATA[
		function savePreferences() {
			window.arguments[0].autoArchive = document.getElementById('pref-autoArchive').checked;
			window.arguments[0].defaultService = document.getElementById('pref-defaultService').value;
			window.arguments[0].iaTimeout = parseInt(document.getElementById('pref-iaTimeout').value);
			window.arguments[0].iaMaxRetries = parseInt(document.getElementById('pref-iaMaxRetries').value);
			window.arguments[0].iaRetryDelay = parseInt(document.getElementById('pref-iaRetryDelay').value);
			window.arguments[0].permaccApiKey = document.getElementById('pref-permaccApiKey').value;
			
			// Get robust link services
			const robustServices = [];
			['internetarchive', 'archivetoday', 'permacc', 'ukwebarchive', 'arquivopt'].forEach(service => {
				if (document.getElementById('robust-' + service).checked) {
					robustServices.push(service);
				}
			});
			window.arguments[0].robustLinkServices = robustServices.join(',');
			
			// Get fallback order
			const listbox = document.getElementById('fallback-order');
			const order = [];
			for (let i = 0; i < listbox.getRowCount(); i++) {
				const item = listbox.getItemAtIndex(i);
				order.push(item.value);
			}
			window.arguments[0].fallbackOrder = order.join(',');
			
			window.arguments[0].save = true;
			return true;
		}
		
		function loadPreferences() {
			const params = window.arguments[0];
			document.getElementById('pref-autoArchive').checked = params.autoArchive;
			document.getElementById('pref-defaultService').value = params.defaultService;
			document.getElementById('pref-iaTimeout').value = params.iaTimeout;
			document.getElementById('pref-iaMaxRetries').value = params.iaMaxRetries;
			document.getElementById('pref-iaRetryDelay').value = params.iaRetryDelay;
			document.getElementById('pref-permaccApiKey').value = params.permaccApiKey || '';
			
			// Load robust link services
			const robustServices = params.robustLinkServices.split(',');
			['internetarchive', 'archivetoday', 'permacc', 'ukwebarchive', 'arquivopt'].forEach(service => {
				document.getElementById('robust-' + service).checked = robustServices.includes(service);
			});
			
			// Load fallback order
			const order = params.fallbackOrder.split(',');
			const listbox = document.getElementById('fallback-order');
			const items = Array.from(listbox.children);
			order.forEach(serviceId => {
				const item = items.find(i => i.value === serviceId);
				if (item) {
					listbox.appendChild(item);
				}
			});
		}
	]]></script>
	
	<vbox style="padding: 10px; width: 550px;">
		<groupbox>
			<label class="header" value="General Settings"/>
			<checkbox id="pref-autoArchive" label="Automatically archive new items added via Browser Connector"/>
			<hbox align="center">
				<label value="Default archive service:" control="pref-defaultService"/>
				<menulist id="pref-defaultService">
					<menupopup>
						<menuitem value="internetarchive" label="Internet Archive"/>
						<menuitem value="archivetoday" label="Archive.today"/>
						<menuitem value="permacc" label="Perma.cc"/>
						<menuitem value="ukwebarchive" label="UK Web Archive"/>
						<menuitem value="arquivopt" label="Arquivo.pt"/>
					</menupopup>
				</menulist>
			</hbox>
		</groupbox>
		
		<groupbox>
			<label class="header" value="Timeout and Retry Settings"/>
			<grid>
				<columns>
					<column flex="1"/>
					<column/>
				</columns>
				<rows>
					<row align="center">
						<label value="Internet Archive timeout (seconds):" control="pref-iaTimeout"/>
						<textbox id="pref-iaTimeout" type="number" min="30" max="300" size="5"/>
					</row>
					<row align="center">
						<label value="Maximum retry attempts:" control="pref-iaMaxRetries"/>
						<textbox id="pref-iaMaxRetries" type="number" min="0" max="5" size="5"/>
					</row>
					<row align="center">
						<label value="Delay between retries (seconds):" control="pref-iaRetryDelay"/>
						<textbox id="pref-iaRetryDelay" type="number" min="1" max="30" size="5"/>
					</row>
				</rows>
			</grid>
		</groupbox>
		
		<groupbox>
			<label class="header" value="Robust Links Settings"/>
			<description>Select services to include when creating Robust Links:</description>
			<checkbox id="robust-internetarchive" label="Internet Archive"/>
			<checkbox id="robust-archivetoday" label="Archive.today"/>
			<checkbox id="robust-permacc" label="Perma.cc (requires API key)"/>
			<checkbox id="robust-ukwebarchive" label="UK Web Archive (UK domains only)"/>
			<checkbox id="robust-arquivopt" label="Arquivo.pt"/>
		</groupbox>
		
		<groupbox>
			<label class="header" value="Fallback Order"/>
			<description>Services will be tried in this order if archiving fails:</description>
			<listbox id="fallback-order" rows="5">
				<listitem value="internetarchive" label="Internet Archive"/>
				<listitem value="archivetoday" label="Archive.today"/>
				<listitem value="arquivopt" label="Arquivo.pt"/>
				<listitem value="permacc" label="Perma.cc"/>
				<listitem value="ukwebarchive" label="UK Web Archive"/>
			</listbox>
		</groupbox>
		
		<groupbox>
			<label class="header" value="Service API Keys"/>
			<hbox align="center">
				<label value="Perma.cc API Key:" control="pref-permaccApiKey"/>
				<textbox id="pref-permaccApiKey" type="password" flex="1"/>
			</hbox>
			<description style="font-size: small;">Get your free API key at: https://perma.cc/settings/tools</description>
		</groupbox>
	</vbox>
	
	<script>
		loadPreferences();
	</script>
</dialog>`;
	}
};