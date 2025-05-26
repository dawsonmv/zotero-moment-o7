/**
 * Zotero Beta API Client
 * Communicates with Zotero through the local HTTP API endpoint
 */

/* global Zotero */

Zotero.MomentO7.APIClient = {
	baseURL: "http://localhost:23119/api",

	/**
	 * Make a request to the Zotero API
	 * @param {string} method - HTTP method
	 * @param {string} endpoint - API endpoint path
	 * @param {Object} options - Request options
	 * @returns {Promise<Object>} Response data
	 */
	async request(method, endpoint, options = {}) {
		const url = `${this.baseURL}${endpoint}`;

		const requestOptions = {
			method: method,
			headers: {
				"Content-Type": "application/json",
				"Zotero-API-Version": "3",
				...options.headers
			},
			timeout: options.timeout || 30000
		};

		if (options.body) {
			requestOptions.body = JSON.stringify(options.body);
		}

		try {
			const response = await Zotero.HTTP.request(method, url, requestOptions);

			if (response.status !== 200 && response.status !== 201 && response.status !== 204) {
				throw new Error(`API request failed with status ${response.status}: ${response.responseText}`);
			}

			if (response.responseText) {
				return JSON.parse(response.responseText);
			}

			return null;
		} catch (error) {
			Zotero.debug(`API request failed: ${error.message}`, 1);
			throw error;
		}
	},

	/**
	 * Get items from the library
	 * @param {Object} params - Query parameters
	 * @returns {Promise<Array>} Array of items
	 */
	async getItems(params = {}) {
		// Build query string manually for compatibility
		const queryString = Object.keys(params)
			.map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
			.join("&");
		const endpoint = `/users/0/items${queryString ? `?${queryString}` : ""}`;
		return await this.request("GET", endpoint);
	},

	/**
	 * Get a specific item
	 * @param {string} itemKey - Item key
	 * @returns {Promise<Object>} Item data
	 */
	async getItem(itemKey) {
		return await this.request("GET", `/users/0/items/${itemKey}`);
	},

	/**
	 * Update an item
	 * @param {string} itemKey - Item key
	 * @param {Object} data - Item data to update
	 * @param {number} version - Item version
	 * @returns {Promise<Object>} Updated item
	 */
	async updateItem(itemKey, data, version) {
		return await this.request("PATCH", `/users/0/items/${itemKey}`, {
			body: data,
			headers: {
				"If-Unmodified-Since-Version": version
			}
		});
	},

	/**
	 * Create a note
	 * @param {string} parentKey - Parent item key
	 * @param {string} content - Note content
	 * @returns {Promise<Object>} Created note
	 */
	async createNote(parentKey, content) {
		const noteData = {
			itemType: "note",
			note: content,
			parentItem: parentKey,
			tags: [],
			relations: {}
		};

		return await this.request("POST", "/users/0/items", {
			body: [noteData]
		});
	},

	/**
	 * Search items
	 * @param {Object} conditions - Search conditions
	 * @returns {Promise<Array>} Search results
	 */
	async searchItems(conditions) {
		// Build search query
		const searchParams = {
			q: conditions.q || "",
			qmode: conditions.qmode || "everything",
			limit: conditions.limit || 25
		};

		return await this.getItems(searchParams);
	},

	/**
	 * Get collections
	 * @returns {Promise<Array>} Array of collections
	 */
	async getCollections() {
		return await this.request("GET", "/users/0/collections");
	},

	/**
	 * Check if API is available
	 * @returns {Promise<boolean>} True if API is available
	 */
	async checkConnection() {
		try {
			await this.request("GET", "/users/0/items?limit=1");
			return true;
		} catch (error) {
			Zotero.debug(`API connection check failed: ${error.message}`, 2);
			return false;
		}
	}
};