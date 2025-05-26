#!/usr/bin/env node
/* eslint-env node */

/**
 * Zotero API Examples - Communicate with Zotero through localhost:23119
 *
 * Make sure Zotero is running and API is enabled:
 * Preferences → Advanced → General → Allow other applications to communicate with Zotero
 */

const http = require("http");

// Configuration
const API_BASE = "http://localhost:23119/api";
const USER_ID = "0"; // Local library

// Helper function for API requests
function apiRequest(method, path, data = null) {
	return new Promise((resolve, reject) => {
		const url = new URL(API_BASE + path);

		const options = {
			hostname: url.hostname,
			port: url.port,
			path: url.pathname + url.search,
			method: method,
			headers: {
				"Content-Type": "application/json",
				"Zotero-API-Version": "3"
			}
		};

		const req = http.request(options, (res) => {
			let body = "";
			res.on("data", chunk => body += chunk);
			res.on("end", () => {
				try {
					const result = {
						status: res.statusCode,
						headers: res.headers,
						data: body ? JSON.parse(body) : null
					};
					resolve(result);
				} catch (e) {
					resolve({
						status: res.statusCode,
						headers: res.headers,
						data: body
					});
				}
			});
		});

		req.on("error", reject);

		if (data) {
			req.write(JSON.stringify(data));
		}

		req.end();
	});
}

// Example 1: Get all collections
async function getCollections() {
	console.log("\n📁 Getting Collections:");
	const response = await apiRequest("GET", `/users/${USER_ID}/collections`);

	if (response.status === 200) {
		const collections = response.data;
		console.log(`Found ${collections.length} collections:`);
		collections.forEach(col => {
			console.log(`  - ${col.data.name} (${col.key})`);
		});
	}
	return response.data;
}

// Example 2: Get recent items
async function getRecentItems(limit = 5) {
	console.log(`\n📚 Getting ${limit} Recent Items:`);
	const response = await apiRequest("GET", `/users/${USER_ID}/items?limit=${limit}&sort=dateAdded&direction=desc`);

	if (response.status === 200) {
		const items = response.data;
		items.forEach((item, i) => {
			const data = item.data;
			console.log(`\n${i + 1}. ${data.title || "Untitled"}`);
			console.log(`   Type: ${data.itemType}`);
			console.log(`   Key: ${item.key}`);
			if (data.url) {
				console.log(`   URL: ${data.url}`);
			}
		});
	}
	return response.data;
}

// Example 3: Search for items
async function searchItems(query) {
	console.log(`\n🔍 Searching for "${query}":`);
	const response = await apiRequest("GET", `/users/${USER_ID}/items?q=${encodeURIComponent(query)}`);

	if (response.status === 200) {
		const items = response.data;
		console.log(`Found ${items.length} items`);
		items.slice(0, 3).forEach(item => {
			console.log(`  - ${item.data.title || "Untitled"} (${item.data.itemType})`);
		});
	}
	return response.data;
}

// Example 4: Get items with a specific tag
async function getItemsByTag(tag) {
	console.log(`\n🏷️  Getting items tagged "${tag}":`);
	const response = await apiRequest("GET", `/users/${USER_ID}/items?tag=${encodeURIComponent(tag)}`);

	if (response.status === 200) {
		const items = response.data;
		console.log(`Found ${items.length} items`);
		items.forEach(item => {
			console.log(`  - ${item.data.title || "Untitled"}`);
		});
	}
	return response.data;
}

// Example 5: Create a note
async function createNote(content, tags = []) {
	console.log("\n📝 Creating a note...");

	const noteData = [{
		itemType: "note",
		note: content,
		tags: tags.map(tag => ({ tag: tag, type: 0 }))
	}];

	const response = await apiRequest("POST", `/users/${USER_ID}/items`, noteData);

	if (response.status === 200 || response.status === 201) {
		console.log("✅ Note created successfully");
		if (response.data.successful) {
			console.log(`   Key: ${response.data.successful[0].key}`);
		}
	} else {
		console.log("❌ Failed to create note:", response.status);
	}
	return response;
}

// Example 6: Get item's attachments and notes
async function getItemChildren(itemKey) {
	console.log(`\n📎 Getting children of item ${itemKey}:`);
	const response = await apiRequest("GET", `/users/${USER_ID}/items/${itemKey}/children`);

	if (response.status === 200) {
		const children = response.data;
		console.log(`Found ${children.length} children:`);
		children.forEach(child => {
			const type = child.data.itemType;
			if (type === "note") {
				console.log(`  - Note: ${child.data.note.substring(0, 50)}...`);
			} else if (type === "attachment") {
				console.log(`  - Attachment: ${child.data.title}`);
			}
		});
	}
	return response.data;
}

// Example 7: Working with Moment-o7 archived items
async function getMomentItems() {
	console.log("\n🗄️  Getting items with Moment archives:");
	const response = await apiRequest("GET", `/users/${USER_ID}/items?tag=moment`);

	if (response.status === 200) {
		const items = response.data;
		console.log(`Found ${items.length} items with moments`);

		for (const item of items.slice(0, 3)) {
			console.log(`\n  📄 ${item.data.title || "Untitled"}`);
			console.log(`     Original URL: ${item.data.url}`);

			// Get notes for this item
			const children = await getItemChildren(item.key);
			const notes = children.filter(c => c.data.itemType === "note");

			notes.forEach(note => {
				if (note.data.note.includes("Moment for")) {
					console.log("     ✅ Has Moment note with archive links");
				}
			});
		}
	}
	return response.data;
}

// Main function to run examples
async function main() {
	console.log("=".repeat(60));
	console.log("Zotero API Examples - Localhost Communication");
	console.log("=".repeat(60));
	console.log(`\nAPI Endpoint: ${API_BASE}`);
	console.log("Make sure Zotero is running!\n");

	try {
		// Run examples
		await getCollections();
		await getRecentItems(3);
		await searchItems("web");
		await getItemsByTag("archived");

		// Create a test note
		await createNote(
			"<h3>API Test Note</h3><p>Created via localhost API at " + new Date().toLocaleString() + "</p>",
			["api-test", "demo"]
		);

		// Check for Moment-o7 items
		await getMomentItems();

		console.log("\n" + "=".repeat(60));
		console.log("✅ All examples completed successfully!");
		console.log("\nYou can use these examples to build your own Zotero integrations.");
		console.log("API Documentation: https://www.zotero.org/support/dev/web_api/v3/basics");

	} catch (error) {
		console.error("\n❌ Error:", error.message);
		console.log("\nTroubleshooting:");
		console.log("1. Is Zotero running?");
		console.log("2. Is API enabled in Preferences?");
		console.log("3. Check Tools → Developer → Error Console in Zotero");
	}
}

// Run if called directly
if (require.main === module) {
	main();
}

// Export functions for use in other scripts
module.exports = {
	apiRequest,
	getCollections,
	getRecentItems,
	searchItems,
	getItemsByTag,
	createNote,
	getItemChildren,
	getMomentItems
};