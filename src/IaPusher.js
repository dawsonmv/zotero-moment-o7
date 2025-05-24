// Internet Archive Pusher for Zotero 7
// Uses Zotero.HTTP.request instead of XMLHttpRequest

Zotero.IaPusher = {
  /**
   * Check if an item has already been archived
   */
  isArchived: function(item) {
    const tags = item.getTags();
    return tags.some(tag => tag.tag === "archived");
  },

  /**
   * Construct the Internet Archive save URL
   */
  constructUri: function(uri) {
    if (!uri || typeof uri !== "string") {
      return null;
    }
    // Direct request to Internet Archive API - no proxy needed
    return 'https://web.archive.org/save/' + uri;
  },

  /**
   * Check if a URL is valid for archiving
   */
  checkValidUrl: function(url) {
    const pattern = /^https?:\/\/.+/;
    return pattern.test(url);
  },

  /**
   * Extract archived URL from Link header
   */
  getLastMemento: function(linkHeader) {
    if (!linkHeader) return null;
    
    // Extract the last memento URL from the Link header
    const matches = linkHeader.match(/<([^>]+)>;\s*rel="memento"/g);
    if (matches && matches.length > 0) {
      const lastMatch = matches[matches.length - 1];
      const urlMatch = lastMatch.match(/<([^>]+)>/);
      return urlMatch ? urlMatch[1] : null;
    }
    return null;
  },

  /**
   * Extract date from archived URL
   */
  getDate: function(archivedUrl) {
    const match = archivedUrl.match(/\/web\/(\d{4,14})\//);
    if (!match) return "";
    
    const dateString = match[1];
    const year = dateString.slice(0, 4);
    const month = dateString.length >= 6 ? "-" + dateString.slice(4, 6) : "";
    const day = dateString.length >= 8 ? "-" + dateString.slice(6, 8) : "";
    const time = dateString.length >= 14 ? 
      "T" + dateString.slice(8, 10) + ":" + dateString.slice(10, 12) + ":" + dateString.slice(12, 14) + "Z" : "";
    
    return year + month + day + time;
  },

  /**
   * Set the Extra field with archived URL
   */
  setExtra: function(item, archivedUrl) {
    const currentExtra = item.getField("extra");
    
    if (currentExtra.includes(archivedUrl)) {
      return;
    }
    
    const newExtra = currentExtra ? 
      currentExtra + "; " + archivedUrl : 
      archivedUrl;
    
    item.setField("extra", newExtra);
    return item.saveTx();
  },

  /**
   * Create a RobustLink anchor tag
   */
  makeAnchorTag: function(item, url, archivedUrl) {
    const date = this.getDate(archivedUrl);
    return `Version URL: <a href="${archivedUrl}" data-originalurl="${url}" ` +
           `data-versiondate="${date}">Robust Link for: ${url}</a>`;
  },

  /**
   * Attach a note with the archived link
   */
  attachAnchorNote: async function(item, archivedUrl) {
    if (!archivedUrl) {
      this.showNotification("Archive URL not found.", "error");
      return;
    }
    
    const url = item.getField('url');
    const noteText = this.makeAnchorTag(item, url, archivedUrl);
    
    if (this.isArchived(item)) {
      return;
    }
    
    const note = new Zotero.Item('note');
    note.setNote(noteText);
    note.parentID = item.id;
    await note.saveTx();
  },

  /**
   * Show notification window
   */
  showNotification: function(message, type = "info") {
    const notifWindow = new Zotero.ProgressWindow({closeOnClick: true});
    notifWindow.changeHeadline(message);
    notifWindow.show();
    notifWindow.startCloseTimer(type === "error" ? 8000 : 3000);
  },

  /**
   * Handle response status
   */
  handleStatus: async function(item, status, archivedUrl) {
    let message = "";
    
    switch (status) {
      case 200:
        message = "Success! Archived to Internet Archive.";
        await this.attachAnchorNote(item, archivedUrl);
        break;
      case 401:
      case 403:
        message = "No access to the requested resource.";
        break;
      case 404:
        message = "Resource not found. Ensure URL is correct.";
        break;
      case 503:
      case 504:
        message = "Internet Archive may be down. Try again later.";
        break;
      default:
        message = `Error occurred. Try again later (Code ${status}).`;
    }
    
    if (message) {
      this.showNotification(message, status === 200 ? "success" : "error");
    }
  },

  /**
   * Archive a single item
   */
  archiveItem: async function(item) {
    const url = item.getField('url');
    
    if (!this.checkValidUrl(url)) {
      Zotero.debug("Invalid URL for archiving: " + url);
      return;
    }
    
    if (this.isArchived(item)) {
      Zotero.debug("Item already archived: " + item.id);
      return;
    }
    
    const archiveUrl = this.constructUri(url);
    
    try {
      // Show progress notification
      this.showNotification("Archiving... This may take a while...");
      
      // Make request to Internet Archive
      const response = await Zotero.HTTP.request('GET', archiveUrl, {
        headers: {
          'User-Agent': 'Zotero Moment-o7',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: 60000, // 60 second timeout
        responseType: 'text'
      });
      
      // Extract archived URL from response headers
      let archivedUrl = null;
      
      // Try to get from Link header first
      const linkHeader = response.getResponseHeader('Link');
      if (linkHeader) {
        archivedUrl = this.getLastMemento(linkHeader);
      }
      
      // If not in header, try to extract from response
      if (!archivedUrl && response.responseText) {
        // Look for the archived URL in the response
        const match = response.responseText.match(/https:\/\/web\.archive\.org\/web\/\d{14}\/[^\s"<>]+/);
        if (match) {
          archivedUrl = match[0];
        }
      }
      
      if (archivedUrl) {
        await this.setExtra(item, archivedUrl);
        item.addTag("archived");
        await item.saveTx();
      }
      
      await this.handleStatus(item, response.status, archivedUrl);
      
    } catch (error) {
      Zotero.logError(`Archive request failed: ${error}`);
      this.showNotification(`Archive failed: ${error.message}`, "error");
    }
  },

  /**
   * Archive selected items (called from menu)
   */
  sendReq: async function() {
    const pane = Zotero.getActiveZoteroPane();
    const selectedItems = pane.getSelectedItems();
    
    if (selectedItems.length === 0) {
      this.showNotification("No items selected", "error");
      return;
    }
    
    for (const item of selectedItems) {
      if (item.getField('url')) {
        await this.archiveItem(item);
      }
    }
  },

  /**
   * Extract DOI from response (for journal articles)
   */
  recognizeDoiPattern: function(responseText, tagName) {
    const doiPattern = /10\.\d{4,}\/[-._;()\/:a-zA-Z0-9]+/;
    const toMatchTag = new RegExp(tagName + '.*?content="([^"]+)"', "i");
    const match = responseText.match(toMatchTag);
    
    if (match && match[1]) {
      const doiMatch = match[1].match(doiPattern);
      if (doiMatch) {
        return "https://doi.org/" + doiMatch[0];
      }
    }
    return "";
  },

  /**
   * Create DOI URL for journal articles
   */
  makeDoiUrl: function(responseText) {
    const dcId = this.recognizeDoiPattern(responseText, "DC.identifier");
    const citDoi = this.recognizeDoiPattern(responseText, "citation_doi");
    
    return dcId || citDoi || "";
  }
};