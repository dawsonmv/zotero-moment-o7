/* eslint-disable no-undef */
// Default preferences for Zotero Moment-o7
pref("extensions.zotero.momento7.autoArchive", true);
pref("extensions.zotero.momento7.autoArchiveDelay", 3000);
pref("extensions.zotero.momento7.enabledServices", "internetarchive,archivetoday");
pref("extensions.zotero.momento7.archiveTimeout", 30000);
// Deprecated: robustLinkServices now mirrors enabledServices automatically
pref("extensions.zotero.momento7.robustLinkServices", "internetarchive,archivetoday");
pref("extensions.zotero.momento7.fallbackOrder", "internetarchive,archivetoday,permacc,ukwebarchive,arquivopt");
pref("extensions.zotero.momento7.enableMemento", true);
pref("extensions.zotero.momento7.enableRobustLink", true);
pref("extensions.zotero.momento7.createArchiveNote", true);
pref("extensions.zotero.momento7.archiveNoteTitle", "Archived Links");
pref("extensions.zotero.momento7.useAPI", false);
pref("extensions.zotero.momento7.apiEndpoint", "http://localhost:23119/api");