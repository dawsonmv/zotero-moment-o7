/// <reference path="../types/global.d.ts" />

// Extend global namespace for tests
declare global {
	const Zotero: typeof import('../types/global').Zotero;
	const Services: any;
	const DOMParser: any;
}

export {};
