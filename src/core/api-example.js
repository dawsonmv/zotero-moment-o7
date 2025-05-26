/**
 * Example usage of Zotero Beta API
 * This shows how to use the local API endpoint http://localhost:23119/api/
 */

/* global Zotero */

// Example 1: Get all items with a specific tag
async function getArchivedItems() {
	try {
		const response = await Zotero.HTTP.request("GET", "http://localhost:23119/api/users/0/items?tag=archived", {
			headers: {
				"Zotero-API-Version": "3"
			}
		});
		
		const items = JSON.parse(response.responseText);
		Zotero.debug(`Found ${items.length} archived items`);
		return items;
	} catch (error) {
		Zotero.debug(`Error fetching archived items: ${error.message}`, 1);
		return [];
	}
}

// Example 2: Update item with archive URL using API
async function updateItemViaAPI(itemKey, archiveUrl) {
	try {
		// First get the item to get its version
		const getResponse = await Zotero.HTTP.request("GET", `http://localhost:23119/api/users/0/items/${itemKey}`, {
			headers: {
				"Zotero-API-Version": "3"
			}
		});
		
		const item = JSON.parse(getResponse.responseText);
		const version = getResponse.getResponseHeader("Last-Modified-Version");
		
		// Update the item's extra field with archive URL
		const currentExtra = item.data.extra || "";
		const newExtra = currentExtra + `\nArchived at: ${archiveUrl}`;
		
		const updateData = {
			key: itemKey,
			version: parseInt(version),
			data: {
				...item.data,
				extra: newExtra
			}
		};
		
		const updateResponse = await Zotero.HTTP.request("PATCH", `http://localhost:23119/api/users/0/items/${itemKey}`, {
			headers: {
				"Content-Type": "application/json",
				"Zotero-API-Version": "3",
				"If-Unmodified-Since-Version": version
			},
			body: JSON.stringify(updateData)
		});
		
		Zotero.debug(`Updated item ${itemKey} with archive URL`);
		return JSON.parse(updateResponse.responseText);
	} catch (error) {
		Zotero.debug(`Error updating item: ${error.message}`, 1);
		throw error;
	}
}

// Example 3: Create a note via API
async function createNoteViaAPI(parentItemKey, noteContent) {
	try {
		const noteData = {
			itemType: "note",
			note: noteContent,
			parentItem: parentItemKey,
			tags: [
				{ tag: "archived", type: 0 }
			]
		};
		
		const response = await Zotero.HTTP.request("POST", "http://localhost:23119/api/users/0/items", {
			headers: {
				"Content-Type": "application/json",
				"Zotero-API-Version": "3"
			},
			body: JSON.stringify([noteData])
		});
		
		const createdItems = JSON.parse(response.responseText);
		Zotero.debug(`Created note for item ${parentItemKey}`);
		return createdItems.successful[0];
	} catch (error) {
		Zotero.debug(`Error creating note: ${error.message}`, 1);
		throw error;
	}
}

// Example 4: Search for items by URL
async function searchItemsByURL(url) {
	try {
		// URL search requires encoding
		const encodedUrl = encodeURIComponent(url);
		const response = await Zotero.HTTP.request("GET", `http://localhost:23119/api/users/0/items?q=${encodedUrl}&qmode=everything`, {
			headers: {
				"Zotero-API-Version": "3"
			}
		});
		
		const items = JSON.parse(response.responseText);
		return items.filter(item => item.data.url === url);
	} catch (error) {
		Zotero.debug(`Error searching items: ${error.message}`, 1);
		return [];
	}
}

// Example 5: Get item's attachments via API
async function getItemAttachments(itemKey) {
	try {
		const response = await Zotero.HTTP.request("GET", `http://localhost:23119/api/users/0/items?itemKey=${itemKey}&itemType=attachment`, {
			headers: {
				"Zotero-API-Version": "3"
			}
		});
		
		const attachments = JSON.parse(response.responseText);
		return attachments;
	} catch (error) {
		Zotero.debug(`Error fetching attachments: ${error.message}`, 1);
		return [];
	}
}

// Integration example: Archive an item using the API
async function archiveItemUsingAPI(itemKey, archiveUrl) {
	try {
		// Update item with archive info
		await updateItemViaAPI(itemKey, archiveUrl);
		
		// Create a note with robust link
		const noteContent = `<h3>Archived Version</h3>
<p><a href="${archiveUrl}">${archiveUrl}</a></p>
<p>Archived on: ${new Date().toISOString()}</p>`;
		
		await createNoteViaAPI(itemKey, noteContent);
		
		Zotero.debug(`Successfully archived item ${itemKey} via API`);
		return true;
	} catch (error) {
		Zotero.debug(`Error archiving item via API: ${error.message}`, 1);
		return false;
	}
}

// Check if API is available
async function checkAPIConnection() {
	try {
		const response = await Zotero.HTTP.request("GET", "http://localhost:23119/api/users/0/items?limit=1", {
			headers: {
				"Zotero-API-Version": "3"
			},
			timeout: 5000
		});
		
		return response.status === 200;
	} catch (error) {
		Zotero.debug(`API connection check failed: ${error.message}`, 2);
		return false;
	}
}

// Export functions for use in the plugin
if (typeof Zotero !== "undefined" && Zotero.MomentO7) {
	Zotero.MomentO7.API = {
		getArchivedItems,
		updateItemViaAPI,
		createNoteViaAPI,
		searchItemsByURL,
		getItemAttachments,
		archiveItemUsingAPI,
		checkAPIConnection
	};
}