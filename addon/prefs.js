/* Moment-o7 Preferences Defaults */

// General settings
pref("autoArchive", true);
pref("defaultService", "internetarchive");

// Internet Archive settings
pref("iaTimeout", 120000);
pref("iaMaxRetries", 3);
pref("iaRetryDelay", 5000);

// Robust Links settings
pref("robustLinkServices", "internetarchive,archivetoday");

// Fallback order for archiving (comma-separated)
pref(
  "fallbackOrder",
  "internetarchive,archivetoday,arquivopt,permacc,ukwebarchive",
);

// Memento pre-check settings
pref("checkBeforeArchive", true);
pref("archiveAgeThresholdHours", 24);
pref("skipExistingMementos", false);

// Service availability (enabled by default)
pref("enableInternetArchive", true);
pref("enableArchiveToday", true);
pref("enableArquivoPt", true);
pref("enablePermaCC", false);
pref("enableUKWebArchive", false);

// DOI resolution preference
pref("preferDOI", true);
