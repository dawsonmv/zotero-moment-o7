/**
 * Main Zotero Moment-o7 plugin class
 */

/// <reference path="./types/zotero.d.ts" />

import { ServiceRegistry } from './services/ServiceRegistry';
import { ArchiveCoordinator } from './services/ArchiveCoordinator';
import { PreferencesManager } from './preferences/PreferencesManager';
import { InternetArchiveService } from './services/InternetArchiveService';
import { ArchiveTodayService } from './services/ArchiveTodayService';
import { PermaCCService } from './services/PermaCCService';
import { UKWebArchiveService } from './services/UKWebArchiveService';
import { ArquivoPtService } from './services/ArquivoPtService';
import { MenuItemConfig } from './services/types';

export class MomentO7 {
	id: string | null = null;
	version: string | null = null;
	rootURI: string | null = null;
	initialized = false;
	private windows = new WeakMap<Window, WindowData>();
	private notifierID: string | null = null;

	/**
	 * Initialize the plugin
	 */
	init({ id, version, rootURI }: { id: string; version: string; rootURI: string }): void {
		if (this.initialized) {
			return;
		}

		this.id = id;
		this.version = version;
		this.rootURI = rootURI;
		this.initialized = true;

		this.log(`Initializing Zotero Moment-o7 v${version}`);

		// Initialize services
		this.initializeServices();

		// Initialize preferences
		PreferencesManager.getInstance().init();

		// Register notifier to watch for new items
		this.registerNotifier();
	}

	/**
	 * Initialize services
	 */
	private initializeServices(): void {
		const registry = ServiceRegistry.getInstance();
		registry.init();

		// Register all archive services
		registry.register('internetarchive', new InternetArchiveService());
		registry.register('archivetoday', new ArchiveTodayService());
		registry.register('permacc', new PermaCCService());
		registry.register('ukwebarchive', new UKWebArchiveService());
		registry.register('arquivopt', new ArquivoPtService());

		this.log(`Services initialized: ${registry.getAll().length} services registered`);
	}

	/**
	 * Register notifier for auto-archiving
	 */
	private registerNotifier(): void {
		const notifierCallbacks = {
			notify: async (event: string, type: string, ids: number[]) => {
				if (type === 'item' && event === 'add') {
					this.log(`New items added: ${ids.join(', ')}`);

					for (const id of ids) {
						try {
							const item = await Zotero.Items.getAsync(id);
							if (!item) continue;

							// Check if auto-archive is enabled
							const autoArchiveEnabled = PreferencesManager.getInstance().getPref('autoArchive');

							// Only process items with URLs
							if (autoArchiveEnabled && item.getField('url')) {
								this.log(`Auto-archiving item: ${item.getField('title')}`);

								await ArchiveCoordinator.getInstance().autoArchive(item);
							}
						} catch (error) {
							this.log(`Error processing item ${id}: ${error}`);
						}
					}
				}
			},
		};

		this.notifierID = Zotero.Notifier.registerObserver(notifierCallbacks, ['item']);
		this.log(`Notifier registered with ID: ${this.notifierID}`);
	}

	/**
	 * Add UI elements to a window
	 */
	addToWindow(window: Window): void {
		if (!window?.document) {
			return;
		}

		this.log('Adding to window');

		// Store window-specific data
		this.windows.set(window, {
			menuItems: [],
			listeners: [],
		});

		// Add menu items
		this.addMenuItems(window);
	}

	/**
	 * Add menu items to the window
	 */
	private addMenuItems(window: Window): void {
		const doc = window.document;
		const itemMenu = doc.getElementById('zotero-itemmenu');

		if (!itemMenu) {
			this.log('Item menu not found, will retry later');
			return;
		}

		// Create separator
		const separator = doc.createXULElement('menuseparator');
		separator.id = 'zotero-moment-o7-separator';

		// Create main menu
		const menu = doc.createXULElement('menu');
		menu.id = 'zotero-moment-o7-menu';
		menu.setAttribute('label', 'Archive this Resource');

		// Create popup
		const menupopup = doc.createXULElement('menupopup');

		// Define menu items
		const menuConfigs: MenuItemConfig[] = [
			{
				id: 'internetarchive',
				label: 'Internet Archive',
				serviceId: 'internetarchive',
				handler: async () => this.archiveSelected('internetarchive'),
			},
			{
				id: 'archivetoday',
				label: 'Archive.today',
				serviceId: 'archivetoday',
				handler: async () => this.archiveSelected('archivetoday'),
			},
			{
				id: 'permacc',
				label: 'Perma.cc (Academic)',
				serviceId: 'permacc',
				handler: async () => this.archiveSelected('permacc'),
			},
			{
				id: 'ukwebarchive',
				label: 'UK Web Archive',
				serviceId: 'ukwebarchive',
				handler: async () => this.archiveSelected('ukwebarchive'),
			},
			{
				id: 'arquivopt',
				label: 'Arquivo.pt (Portuguese)',
				serviceId: 'arquivopt',
				handler: async () => this.archiveSelected('arquivopt'),
			},
		];

		// Create menu items
		menuConfigs.forEach(config => {
			const menuItem = this.createMenuItem(doc, config);
			menupopup.appendChild(menuItem);
		});

		// Add separator
		const menuSeparator = doc.createXULElement('menuseparator');
		menupopup.appendChild(menuSeparator);

		// Add robust link item
		const robustItem = this.createMenuItem(doc, {
			id: 'robust-link',
			label: 'Create Robust Link (All Archives)',
			handler: async () => this.createRobustLinks(),
		});
		menupopup.appendChild(robustItem);

		// Add preferences separator
		const prefsSeparator = doc.createXULElement('menuseparator');
		menupopup.appendChild(prefsSeparator);

		// Add preferences item
		const prefsItem = this.createMenuItem(doc, {
			id: 'preferences',
			label: 'Moment-o7 Preferences...',
			handler: async () => this.openPreferences(),
		});
		menupopup.appendChild(prefsItem);

		// Assemble menu
		menu.appendChild(menupopup);
		itemMenu.appendChild(separator);
		itemMenu.appendChild(menu);

		// Store references for cleanup
		const windowData = this.windows.get(window);
		if (windowData) {
			windowData.menuItems.push(separator, menu);
		}
	}

	/**
	 * Create a menu item
	 */
	private createMenuItem(doc: Document, config: MenuItemConfig): XULElement {
		const menuItem = doc.createXULElement('menuitem');
		menuItem.id = `zotero-moment-o7-${config.id}`;
		menuItem.setAttribute('label', config.label);

		menuItem.addEventListener('command', async () => {
			try {
				await config.handler();
			} catch (error) {
				this.log(`Error in menu handler ${config.id}: ${error}`);
				this.showError(error instanceof Error ? error.message : String(error));
			}
		});

		return menuItem;
	}

	/**
	 * Archive selected items
	 */
	private async archiveSelected(serviceId: string): Promise<void> {
		const items = window.ZoteroPane?.getSelectedItems();
		if (!items || items.length === 0) {
			throw new Error('No items selected');
		}

		const coordinator = ArchiveCoordinator.getInstance();
		const results = await coordinator.archiveItems(items, serviceId);

		// Show results
		const failures = results.filter(r => !r.success);
		const serviceName = ServiceRegistry.getInstance().get(serviceId)?.name || serviceId;

		if (failures.length === 0) {
			this.showSuccess(`Successfully archived ${results.length} item(s) to ${serviceName}`);
		} else if (failures.length === results.length) {
			this.showError(failures[0].error || 'Unknown error');
		} else {
			this.showMessage(
				`Archived ${results.length - failures.length} of ${results.length} items`,
				`${failures.length} items failed`
			);
		}
	}

	/**
	 * Create robust links for selected items
	 */
	private async createRobustLinks(): Promise<void> {
		const items = window.ZoteroPane?.getSelectedItems();
		if (!items || items.length === 0) {
			throw new Error('No items selected');
		}

		// Get robust link services from preferences
		const robustServices = PreferencesManager.getInstance().getPref('robustLinkServices');

		const coordinator = ArchiveCoordinator.getInstance();
		const allResults = [];

		for (const serviceId of robustServices) {
			try {
				const results = await coordinator.archiveItems(items, serviceId);
				allResults.push(...results);
			} catch (error) {
				this.log(`Error archiving to ${serviceId}: ${error}`);
			}
		}

		this.showSuccess(
			`Created robust links for ${items.length} item(s)`,
			`Archived to ${robustServices.length} services`
		);
	}

	/**
	 * Open preferences dialog
	 */
	private openPreferences(): void {
		PreferencesManager.getInstance().openDialog();
	}

	/**
	 * Show success message
	 */
	private showSuccess(headline: string, description?: string): void {
		const progressWin = new (Zotero.ProgressWindow as any)({ closeOnClick: true });
		progressWin.changeHeadline(headline);
		if (description) {
			progressWin.addDescription(description);
		}
		progressWin.show();
		progressWin.startCloseTimer(3000);
	}

	/**
	 * Show error message
	 */
	private showError(message: string): void {
		const progressWin = new (Zotero.ProgressWindow as any)({ closeOnClick: true });
		progressWin.changeHeadline('Archive Error');
		progressWin.addDescription(message);
		progressWin.show();
		progressWin.startCloseTimer(8000);
	}

	/**
	 * Show general message
	 */
	private showMessage(headline: string, description?: string): void {
		const progressWin = new (Zotero.ProgressWindow as any)({ closeOnClick: true });
		progressWin.changeHeadline(headline);
		if (description) {
			progressWin.addDescription(description);
		}
		progressWin.show();
		progressWin.startCloseTimer(5000);
	}

	/**
	 * Remove from window
	 */
	removeFromWindow(window: Window): void {
		if (!window?.document) {
			return;
		}

		// const doc = window.document;
		const windowData = this.windows.get(window);

		if (windowData) {
			// Remove menu items
			windowData.menuItems.forEach(item => {
				item.remove();
			});
		}

		this.windows.delete(window);
	}

	/**
	 * Add to all windows
	 */
	addToAllWindows(): void {
		const windows = Zotero.getMainWindows();
		for (const win of windows) {
			if ((win as any).ZoteroPane) {
				this.addToWindow(win);
			}
		}
	}

	/**
	 * Remove from all windows
	 */
	removeFromAllWindows(): void {
		const windows = Zotero.getMainWindows();
		for (const win of windows) {
			this.removeFromWindow(win);
		}
	}

	/**
	 * Main entry point
	 */
	async main(): Promise<void> {
		this.log('Main initialization complete');
	}

	/**
	 * Shutdown
	 */
	shutdown(): void {
		this.log('Shutting down');

		// Unregister notifier
		if (this.notifierID) {
			Zotero.Notifier.unregisterObserver(this.notifierID);
			this.notifierID = null;
		}

		// Clear services
		ServiceRegistry.getInstance().clear();

		// Clear other properties
		this.initialized = false;
		this.id = null;
		this.version = null;
		this.rootURI = null;
	}

	/**
	 * Log message
	 */
	private log(msg: string): void {
		Zotero.debug(`Zotero Moment-o7: ${msg}`);
	}
}

// Window data interface
interface WindowData {
	menuItems: XULElement[];
	listeners: Array<{ element: Element; event: string; handler: EventListener }>;
}

// Export singleton instance
export const ZoteroMomentO7 = new MomentO7();

// Make available globally for Zotero
if (!Zotero.MomentO7) {
	Zotero.MomentO7 = ZoteroMomentO7 as any;
}
