# Zotero Moment-o7 Localization File
# English (US) translations

## Menu Items
momento7-menu-archive = Archive to...
momento7-menu-create-moment = Create Moment ({$count} services)
momento7-menu-preferences = Moment-o7 Preferences

## Service Names
momento7-service-internetarchive = Internet Archive
momento7-service-archivetoday = Archive.today
momento7-service-permacc = Perma.cc
momento7-service-ukwebarchive = UK Web Archive
momento7-service-arquivopt = Arquivo.pt

## Status Messages
momento7-status-archiving = Archiving to {$service}...
momento7-status-checking-existing = Checking for existing archives...
momento7-status-success = Successfully archived to {$service}
momento7-status-error = Failed to archive to {$service}: {$error}
momento7-status-partial = {$service}: {$success} succeeded, {$failed} failed

## Preferences
momento7-pref-title = Moment-o7 Settings
momento7-pref-services = Archive Services
momento7-pref-enable-service = Enable {$service}
momento7-pref-auto-archive = Automatic Archiving
momento7-pref-auto-archive-desc = Automatically archive items when added to library
momento7-pref-auto-archive-delay = Delay before archiving (seconds):
momento7-pref-create-notes = Create archive notes
momento7-pref-create-notes-desc = Add notes with archived links to items
momento7-pref-permacc-key = Perma.cc API Key:
momento7-pref-permacc-folder = Perma.cc Folder ID:
momento7-pref-check-memento = Check Memento Protocol
momento7-pref-check-memento-desc = Check if archives already exist before creating new ones

## Robust Links / Moments
momento7-moment-title = Moment created on {$date}
momento7-moment-archived = Archived version
momento7-moment-view = View archived version

## Errors
momento7-error-no-url = Item has no URL to archive
momento7-error-invalid-url = Invalid URL: {$url}
momento7-error-network = Network error: {$error}
momento7-error-timeout = Request timed out after {$seconds} seconds
momento7-error-quota = Perma.cc quota exceeded
momento7-error-api-key = Invalid Perma.cc API key
momento7-error-worker-url = Archive.today proxy not configured

## Migration Tool
momento7-migration-title = Migrate Robust Links
momento7-migration-desc = Convert old "robust-link" tags to "moment" tags
momento7-migration-found = Found {$count} items to migrate
momento7-migration-complete = Migration complete
momento7-migration-error = Migration failed: {$error}