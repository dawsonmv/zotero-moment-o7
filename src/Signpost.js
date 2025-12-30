Zotero.Signpost = {
	/*
	 * Sets the given item's URL field if the item is a Journal Article.
	 *
	 * @param {Zotero.Item} item: the item that we need to modify.
	 *
	 * @returns: nothing.
	 */

	modifyLink: function (item) {
		if (item.getField("DOI")) {
			item.setField("url", item.getField("DOI"));
		}
	},

	/*
	 * Determines whether the given item has had its author's ORCIDs attached and its URL changed.
	 *
	 * @param {Zotero.Item} item: currently selected item Zotero.
	 *
	 * @return {Boolean}: True if the item has an author's ORCID attached to it. Else return False.
	 */

	isSignposted: function (item) {
		for (let i = 0; i < item.getAttachments().length; i++) {
			const currAttach = Zotero.Items.get(item.getAttachments()[i.toString()]);
			if (currAttach.getField("title").indexOf("ORCID") !== -1) {
				return true;
			}
		}
		return false;
	},

	/*
	 * Searches the Link header text for URLs to the authors' ORCID profiles.
	 *
	 * @param {string} linkHdrText: the text associated with the Link header.
	 *
	 * @return {Array}: list of URLs to the ORCID profiles of the authors.
	 */

	getAuthorOrcids: function (linkHdrText) {
		const orcids = [];
		let start = 0;
		while (linkHdrText) {
			const currAuthor = linkHdrText.indexOf("rel=\"author\"", start);
			if (currAuthor === -1) {
				break;
			}
			const startOrcid = linkHdrText.lastIndexOf("http", currAuthor);
			const endOrcid =
				linkHdrText.lastIndexOf(">;", currAuthor) !== -1
					? linkHdrText.lastIndexOf(">;", currAuthor)
					: linkHdrText.lastIndexOf(";", currAuthor);
			if (linkHdrText.slice(startOrcid, endOrcid).indexOf("orcid") !== -1) {
				orcids.push(linkHdrText.slice(startOrcid, endOrcid));
			}
			start = currAuthor + 1;
		}
		return orcids;
	},

	/*
	 * Sets request headers to allow communication with the ORCID API.
	 *
	 * @param {XMLHttpRequest} req: the request to be modified.
	 *
	 * @return: nothing.
	 */

	setRequestProperties: function (req) {
		req.setRequestHeader("X-Requested-With", "XMLHttpRequest");
		req.setRequestHeader("Accept", "application/vnd.orcid+xml");

		// Get ORCID API key from preferences (user must configure this)
		const orcidApiKey = Zotero.Prefs.get("extensions.momento7.orcidApiKey");
		if (orcidApiKey) {
			req.setRequestHeader("Authorization", "Bearer " + orcidApiKey);
		}
	},

	/*
	 * Uses ORCID API to get the name associated with each ORCID profile.
	 *
	 * @param {string} fullOrcidUrl: the URL to an author's ORCID profile.
	 *
	 * @returns {string}: the name of the author associated with fullOrcidUrl. Returns null if the
	 *                    author's name cannot be found.
	 */

	getAuthorName: function (fullOrcidUrl) {
		const orcidPattern = /[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{4}/;
		const orcidIdStart = fullOrcidUrl.search(orcidPattern);
		const orcidId = fullOrcidUrl.slice(orcidIdStart, orcidIdStart + 19);
		const orcidReqUrl =
			"https://cors-anywhere.herokuapp.com/https://sandbox.orcid.org/v2.0/" + orcidId + "/record";
		const req = Zotero.IaPusher.createCORSRequest("GET", orcidReqUrl, false);
		this.setRequestProperties(req);
		req.send();

		const authorNameStart =
			req.responseText.indexOf(">", req.responseText.indexOf("<personal-details:credit-name>")) + 1;
		const authorNameEnd = req.responseText.indexOf("</personal-details:", authorNameStart);

		return authorNameStart < 1 || authorNameEnd < 1
			? null
			: req.responseText.slice(authorNameStart, authorNameEnd);
	},

	/*
	 * Creates and attaches the link to the author's ORCID profile for the currently selected item.
	 *
	 * @param {string} linkHdrText: the text associated with the Link response header.
	 *
	 * @return: nothing.
	 */

	attachAuthorOrcids: function (linkHdrText) {
		const pane = Zotero.getActiveZoteroPane();
		const item = pane.getSelectedItems()[0];
		if (!linkHdrText || this.isSignposted(item)) {
			return;
		}
		const orcids = this.getAuthorOrcids(linkHdrText);
		for (const orcidUrl in orcids) {
			const authorName = this.getAuthorName(orcids[orcidUrl.toString()]);
			Zotero.Attachments.linkFromURL({
				url: orcids[orcidUrl.toString()],
				parentItemID: item.getField("id"),
				title: authorName ? authorName + "'s ORCID Profile" : "Author's ORCID Profile"
			});
		}
	},

	/*
	 * Attaches links to the authors' ORCID profiles to the selected item and modifies the URL
	 * field of the item to the DOI URL.
	 *
	 * @param {string} linkText: the text associated with the Link response header.
	 *
	 * @return: nothing.
	 */

	signpostEntry: function (linkText) {
		const pane = Zotero.getActiveZoteroPane();
		const item = pane.getSelectedItems()[0];
		this.modifyLink(item);
		this.attachAuthorOrcids(linkText);
	}
};
