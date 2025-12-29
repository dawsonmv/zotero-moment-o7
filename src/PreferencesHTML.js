/* global Zotero */

Zotero.MomentO7.PreferencesHTML = {
	// Create a modern HTML-based preferences dialog
	openPreferences() {
		const dialogData = {
			autoArchive: Zotero.Prefs.get("extensions.zotero.momento7.autoArchive", true),
			defaultService: Zotero.Prefs.get(
				"extensions.zotero.momento7.defaultService",
				"internetarchive"
			),
			iaTimeout: Math.round(
				Zotero.Prefs.get("extensions.zotero.momento7.iaTimeout", 120000) / 1000
			),
			iaMaxRetries: Zotero.Prefs.get("extensions.zotero.momento7.iaMaxRetries", 3),
			iaRetryDelay: Math.round(
				Zotero.Prefs.get("extensions.zotero.momento7.iaRetryDelay", 5000) / 1000
			),
			robustLinkServices: Zotero.Prefs.get(
				"extensions.zotero.momento7.robustLinkServices",
				"internetarchive,archivetoday"
			),
			fallbackOrder: Zotero.Prefs.get(
				"extensions.zotero.momento7.fallbackOrder",
				"internetarchive,archivetoday,arquivopt,permacc,ukwebarchive"
			),
			permaccApiKey: Zotero.Prefs.get("extensions.zotero.momento7.permaccApiKey", "")
		};

		const io = { dataIn: dialogData, dataOut: null };

		window.openDialog(
			"chrome://zotero/content/preferences/preferences.xhtml",
			"momento7-preferences",
			"chrome,dialog=no,centerscreen",
			io,
			Zotero.MomentO7.PreferencesHTML.getPreferencesPane()
		);
	},

	getPreferencesPane() {
		return {
			id: "momento7-prefs",
			label: "Moment-o7",
			image: "chrome://momento7/content/icon.png",
			content: this.getPreferencesHTML()
		};
	},

	getPreferencesHTML() {
		return `<!DOCTYPE html>
<html>
<head>
	<style>
		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
			font-size: 13px;
			margin: 0;
			padding: 20px;
			background-color: var(--material-background);
			color: var(--fill-primary);
		}
		
		.section {
			background: var(--material-sidepane);
			border: 1px solid var(--fill-quinary);
			border-radius: 5px;
			padding: 15px;
			margin-bottom: 15px;
		}
		
		.section h2 {
			margin: 0 0 10px 0;
			font-size: 16px;
			font-weight: 600;
			color: var(--fill-primary);
		}
		
		.form-row {
			margin-bottom: 10px;
			display: flex;
			align-items: center;
		}
		
		.form-row label {
			flex: 0 0 200px;
			margin-right: 10px;
		}
		
		.form-row input[type="number"],
		.form-row input[type="password"],
		.form-row select {
			flex: 1;
			max-width: 200px;
			padding: 4px 8px;
			border: 1px solid var(--fill-quinary);
			border-radius: 4px;
			background: var(--material-background);
			color: var(--fill-primary);
		}
		
		.form-row input[type="checkbox"] {
			margin-right: 8px;
		}
		
		.checkbox-group {
			margin: 10px 0;
		}
		
		.checkbox-group label {
			display: block;
			margin-bottom: 5px;
			cursor: pointer;
		}
		
		.help-text {
			font-size: 11px;
			color: var(--fill-secondary);
			margin-top: 3px;
		}
		
		.service-list {
			list-style: none;
			padding: 0;
			margin: 10px 0;
			border: 1px solid var(--fill-quinary);
			border-radius: 4px;
			background: var(--material-background);
		}
		
		.service-list li {
			padding: 8px 12px;
			border-bottom: 1px solid var(--fill-quinary);
			cursor: move;
			display: flex;
			align-items: center;
		}
		
		.service-list li:last-child {
			border-bottom: none;
		}
		
		.service-list li:hover {
			background: var(--material-button);
		}
		
		.service-list li.dragging {
			opacity: 0.5;
		}
		
		.drag-handle {
			margin-right: 10px;
			color: var(--fill-tertiary);
		}
		
		.button-row {
			margin-top: 20px;
			text-align: right;
		}
		
		button {
			padding: 6px 16px;
			margin-left: 8px;
			border: 1px solid var(--fill-quinary);
			border-radius: 4px;
			background: var(--material-button);
			color: var(--fill-primary);
			cursor: pointer;
			font-size: 13px;
		}
		
		button:hover {
			background: var(--material-button-hover);
		}
		
		button.primary {
			background: #2e7cd6;
			color: white;
			border-color: #2e7cd6;
		}
		
		button.primary:hover {
			background: #2966b3;
		}
		
		a {
			color: #2e7cd6;
			text-decoration: none;
		}
		
		a:hover {
			text-decoration: underline;
		}
	</style>
</head>
<body>
	<div class="section">
		<h2>General Settings</h2>
		<div class="form-row">
			<label>
				<input type="checkbox" id="pref-autoArchive">
				Automatically archive new items added via Browser Connector
			</label>
		</div>
		<div class="form-row">
			<label for="pref-defaultService">Default archive service:</label>
			<select id="pref-defaultService">
				<option value="internetarchive">Internet Archive</option>
				<option value="archivetoday">Archive.today</option>
				<option value="permacc">Perma.cc</option>
				<option value="ukwebarchive">UK Web Archive</option>
				<option value="arquivopt">Arquivo.pt</option>
			</select>
		</div>
	</div>

	<div class="section">
		<h2>Timeout and Retry Settings</h2>
		<div class="form-row">
			<label for="pref-iaTimeout">Internet Archive timeout (seconds):</label>
			<input type="number" id="pref-iaTimeout" min="30" max="300" value="120">
			<div class="help-text">How long to wait for Internet Archive to respond (30-300 seconds)</div>
		</div>
		<div class="form-row">
			<label for="pref-iaMaxRetries">Maximum retry attempts:</label>
			<input type="number" id="pref-iaMaxRetries" min="0" max="5" value="3">
			<div class="help-text">Number of times to retry if archiving fails</div>
		</div>
		<div class="form-row">
			<label for="pref-iaRetryDelay">Delay between retries (seconds):</label>
			<input type="number" id="pref-iaRetryDelay" min="1" max="30" value="5">
			<div class="help-text">How long to wait between retry attempts</div>
		</div>
	</div>

	<div class="section">
		<h2>Robust Links Settings</h2>
		<p>Select which services to include when creating Robust Links:</p>
		<div class="checkbox-group">
			<label><input type="checkbox" id="robust-internetarchive"> Internet Archive</label>
			<label><input type="checkbox" id="robust-archivetoday"> Archive.today</label>
			<label><input type="checkbox" id="robust-permacc"> Perma.cc (requires API key)</label>
			<label><input type="checkbox" id="robust-ukwebarchive"> UK Web Archive (UK domains only)</label>
			<label><input type="checkbox" id="robust-arquivopt"> Arquivo.pt</label>
		</div>
	</div>

	<div class="section">
		<h2>Fallback Order</h2>
		<p>Drag to reorder. When archiving fails with one service, the next service will be tried:</p>
		<ul class="service-list" id="fallback-order">
			<li draggable="true" data-service="internetarchive">
				<span class="drag-handle">☰</span> Internet Archive
			</li>
			<li draggable="true" data-service="archivetoday">
				<span class="drag-handle">☰</span> Archive.today
			</li>
			<li draggable="true" data-service="arquivopt">
				<span class="drag-handle">☰</span> Arquivo.pt
			</li>
			<li draggable="true" data-service="permacc">
				<span class="drag-handle">☰</span> Perma.cc
			</li>
			<li draggable="true" data-service="ukwebarchive">
				<span class="drag-handle">☰</span> UK Web Archive
			</li>
		</ul>
	</div>

	<div class="section">
		<h2>Service API Keys</h2>
		<div class="form-row">
			<label for="pref-permaccApiKey">Perma.cc API Key:</label>
			<input type="password" id="pref-permaccApiKey" placeholder="Enter your API key">
		</div>
		<div class="help-text">
			Get your free API key at: <a href="https://perma.cc/settings/tools" target="_blank">https://perma.cc/settings/tools</a>
		</div>
	</div>

	<div class="button-row">
		<button onclick="restoreDefaults()">Restore Defaults</button>
		<button onclick="window.close()">Cancel</button>
		<button class="primary" onclick="savePreferences()">Save</button>
	</div>

	<script>
		// Load current preferences
		function loadPreferences() {
			const prefs = window.arguments[0].dataIn;
			
			document.getElementById('pref-autoArchive').checked = prefs.autoArchive;
			document.getElementById('pref-defaultService').value = prefs.defaultService;
			document.getElementById('pref-iaTimeout').value = prefs.iaTimeout;
			document.getElementById('pref-iaMaxRetries').value = prefs.iaMaxRetries;
			document.getElementById('pref-iaRetryDelay').value = prefs.iaRetryDelay;
			document.getElementById('pref-permaccApiKey').value = prefs.permaccApiKey || '';
			
			// Load robust link services
			const robustServices = prefs.robustLinkServices.split(',');
			['internetarchive', 'archivetoday', 'permacc', 'ukwebarchive', 'arquivopt'].forEach(service => {
				const checkbox = document.getElementById('robust-' + service);
				if (checkbox) checkbox.checked = robustServices.includes(service);
			});
			
			// Load fallback order
			const fallbackOrder = prefs.fallbackOrder.split(',');
			const list = document.getElementById('fallback-order');
			const items = Array.from(list.children);
			
			// Reorder according to saved preferences
			fallbackOrder.forEach(service => {
				const item = items.find(li => li.getAttribute('data-service') === service);
				if (item) list.appendChild(item);
			});
		}
		
		// Save preferences
		function savePreferences() {
			const prefs = window.arguments[0].dataIn;
			
			prefs.autoArchive = document.getElementById('pref-autoArchive').checked;
			prefs.defaultService = document.getElementById('pref-defaultService').value;
			prefs.iaTimeout = parseInt(document.getElementById('pref-iaTimeout').value);
			prefs.iaMaxRetries = parseInt(document.getElementById('pref-iaMaxRetries').value);
			prefs.iaRetryDelay = parseInt(document.getElementById('pref-iaRetryDelay').value);
			prefs.permaccApiKey = document.getElementById('pref-permaccApiKey').value;
			
			// Get robust link services
			const robustServices = [];
			['internetarchive', 'archivetoday', 'permacc', 'ukwebarchive', 'arquivopt'].forEach(service => {
				if (document.getElementById('robust-' + service).checked) {
					robustServices.push(service);
				}
			});
			prefs.robustLinkServices = robustServices.join(',');
			
			// Get fallback order
			const list = document.getElementById('fallback-order');
			const order = Array.from(list.children).map(li => li.getAttribute('data-service'));
			prefs.fallbackOrder = order.join(',');
			
			// Save to Zotero preferences
			window.opener.Zotero.Prefs.set("extensions.zotero.momento7.autoArchive", prefs.autoArchive);
			window.opener.Zotero.Prefs.set("extensions.zotero.momento7.defaultService", prefs.defaultService);
			window.opener.Zotero.Prefs.set("extensions.zotero.momento7.iaTimeout", prefs.iaTimeout * 1000);
			window.opener.Zotero.Prefs.set("extensions.zotero.momento7.iaMaxRetries", prefs.iaMaxRetries);
			window.opener.Zotero.Prefs.set("extensions.zotero.momento7.iaRetryDelay", prefs.iaRetryDelay * 1000);
			window.opener.Zotero.Prefs.set("extensions.zotero.momento7.robustLinkServices", prefs.robustLinkServices);
			window.opener.Zotero.Prefs.set("extensions.zotero.momento7.fallbackOrder", prefs.fallbackOrder);
			
			if (prefs.permaccApiKey) {
				window.opener.Zotero.Prefs.set("extensions.zotero.momento7.permaccApiKey", prefs.permaccApiKey);
			}
			
			window.arguments[0].dataOut = prefs;
			window.close();
		}
		
		// Restore defaults
		function restoreDefaults() {
			if (confirm('Are you sure you want to restore all settings to their defaults?')) {
				document.getElementById('pref-autoArchive').checked = true;
				document.getElementById('pref-defaultService').value = 'internetarchive';
				document.getElementById('pref-iaTimeout').value = 120;
				document.getElementById('pref-iaMaxRetries').value = 3;
				document.getElementById('pref-iaRetryDelay').value = 5;
				
				// Reset checkboxes
				document.getElementById('robust-internetarchive').checked = true;
				document.getElementById('robust-archivetoday').checked = true;
				document.getElementById('robust-permacc').checked = false;
				document.getElementById('robust-ukwebarchive').checked = false;
				document.getElementById('robust-arquivopt').checked = false;
				
				// Reset order
				const list = document.getElementById('fallback-order');
				const defaultOrder = ['internetarchive', 'archivetoday', 'arquivopt', 'permacc', 'ukwebarchive'];
				defaultOrder.forEach(service => {
					const item = Array.from(list.children).find(li => li.getAttribute('data-service') === service);
					if (item) list.appendChild(item);
				});
			}
		}
		
		// Drag and drop functionality
		let draggedElement = null;
		
		document.addEventListener('DOMContentLoaded', function() {
			loadPreferences();
			
			const list = document.getElementById('fallback-order');
			const items = list.querySelectorAll('li');
			
			items.forEach(item => {
				item.addEventListener('dragstart', handleDragStart);
				item.addEventListener('dragend', handleDragEnd);
				item.addEventListener('dragover', handleDragOver);
				item.addEventListener('drop', handleDrop);
				item.addEventListener('dragenter', handleDragEnter);
				item.addEventListener('dragleave', handleDragLeave);
			});
		});
		
		function handleDragStart(e) {
			draggedElement = this;
			this.classList.add('dragging');
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/html', this.innerHTML);
		}
		
		function handleDragEnd(e) {
			this.classList.remove('dragging');
			const items = document.querySelectorAll('.service-list li');
			items.forEach(item => item.classList.remove('drag-over'));
		}
		
		function handleDragOver(e) {
			if (e.preventDefault) {
				e.preventDefault();
			}
			e.dataTransfer.dropEffect = 'move';
			return false;
		}
		
		function handleDragEnter(e) {
			this.classList.add('drag-over');
		}
		
		function handleDragLeave(e) {
			this.classList.remove('drag-over');
		}
		
		function handleDrop(e) {
			if (e.stopPropagation) {
				e.stopPropagation();
			}
			
			if (draggedElement !== this) {
				const list = this.parentNode;
				const items = Array.from(list.children);
				const draggedIndex = items.indexOf(draggedElement);
				const targetIndex = items.indexOf(this);
				
				if (draggedIndex < targetIndex) {
					this.parentNode.insertBefore(draggedElement, this.nextSibling);
				} else {
					this.parentNode.insertBefore(draggedElement, this);
				}
			}
			
			return false;
		}
	</script>
</body>
</html>`;
	}
};
