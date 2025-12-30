/**
 * Zotero JavaScript API Type Definitions
 * Based on Zotero 7 API
 */

declare namespace Zotero {
	// Core Zotero types
	interface Item {
		id: number;
		key: string;
		version: number;
		itemType: string;
		parentID?: number;

		getField(field: string): string;
		setField(field: string, value: string): void;
		getTags(): Tag[];
		addTag(tag: string, type?: number): void;
		removeTag(tag: string): void;
		saveTx(): Promise<void>;
		save(): Promise<void>;

		// Notes methods (optional as not all items support notes)
		getNotes?(): number[];
		getNote?(): string;
		setNote?(content: string): void;

		// Creators (optional as not all items have creators)
		getCreators?(): Creator[];
		setCreators?(creators: Creator[]): void;

		// Relations
		addRelatedItem(item: Item): void;
		removeRelatedItem(item: Item): void;
	}

	interface Tag {
		tag: string;
		type: number;
	}

	interface Creator {
		firstName?: string;
		lastName: string;
		creatorType: string;
		fieldMode?: number;
	}

	interface Collection {
		id: number;
		name: string;
		parentID?: number;

		addItem(item: Item): void;
		removeItem(item: Item): void;
		getChildItems(): Item[];
	}

	interface Library {
		id: number;
		type: 'user' | 'group';
		name: string;
	}

	// Zotero API objects
	const Items: {
		get(id: number): Item | false;
		getAsync(id: number): Promise<Item | false>;
		getAll(): Item[];
	};

	const Collections: {
		get(id: number): Collection | false;
		getAsync(id: number): Promise<Collection | false>;
	};

	const Prefs: {
		get(pref: string): any;
		get(pref: string, defaultValue: string): string;
		get(pref: string, defaultValue: number): number;
		get(pref: string, defaultValue: boolean): boolean;
		set(pref: string, value: any): void;
		clear(pref: string): void;
	};

	interface HTTPRequestOptions {
		headers?: Record<string, string>;
		body?: string;
		timeout?: number;
		responseType?: 'text' | 'json';
		responseCharset?: string;
		method?: string;
	}

	const HTTP: {
		request(
			method: string,
			url: string,
			options?: HTTPRequestOptions
		): Promise<{
			status: number;
			statusText: string;
			responseText: string;
			responseJSON?: any;
			getAllResponseHeaders(): string;
			getResponseHeader(header: string): string | null;
		}>;
	};

	class ProgressWindow {
		constructor(options?: { closeOnClick?: boolean });
		changeHeadline(text: string): void;
		addDescription(text: string): void;
		show(): void;
		close(): void;
		startCloseTimer(ms: number): void;
	}

	const Notifier: {
		registerObserver(
			observer: {
				notify: (event: string, type: string, ids: number[], extraData?: any) => void;
			},
			types: string[],
			id?: string
		): string;
		unregisterObserver(id: string): void;
	};

	const Translate: {
		Export: any;
		Import: any;
	};

	const File: {
		pathToFile(path: string): any;
		getContentsAsync(path: string): Promise<string>;
		putContentsAsync(path: string, contents: string): Promise<void>;
	};

	function debug(message: string): void;
	function log(message: string): void;
	function logError(error: Error | string): void;

	const version: string;
	const platformMajorVersion: number;

	// Profile and data directory
	const Profile: {
		dir: string;
	};

	const DataDirectory: {
		dir: string;
	};

	// Plugin instance
	let MomentO7: any;

	function getMainWindows(): Window[];
	function getActiveZoteroPane(): ZoteroPane;

	function setTimeout(fn: Function, delay: number): number;
	function clearTimeout(id: number): void;

	function launchURL(url: string): void;

	// Initialization promise
	const initializationPromise: Promise<void>;

	// Constructor for new items
	function Item(itemType: string): Item;
}

// Window extensions
interface Window {
	Zotero: typeof Zotero;
	ZoteroPane: ZoteroPane;
	openDialog(url: string, name: string, features: string, ...args: any[]): Window;
}

interface ZoteroPane {
	getSelectedItems(): Zotero.Item[];
	getSelectedCollection(): Zotero.Collection | false;
	itemsView: any;
}

// Services global
declare const Services: {
	scriptloader: {
		loadSubScript(url: string, scope?: any): void;
	};
	prompt: {
		confirm(parent: Window | null, title: string, message: string): boolean;
		prompt(
			parent: Window | null,
			title: string,
			message: string,
			value: { value: string },
			checkLabel: string | null,
			checkValue: { value: boolean }
		): boolean;
	};
	io: {
		newURI(spec: string): any;
	};
};

// Components global
declare const Components: {
	classes: Record<string, any>;
	interfaces: {
		nsIPromptService: any;
	};
	utils: {
		import(url: string): void;
	};
};

// Document extensions
interface Document {
	createXULElement(tagName: string): XULElement;
}

interface XULElement extends Element {
	setAttribute(name: string, value: string): void;
	addEventListener(event: string, handler: (event: Event) => void): void;
}
