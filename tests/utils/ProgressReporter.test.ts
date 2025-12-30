/**
 * Tests for ProgressReporter
 */

import {
	ProgressReporter,
	ProgressListener,
	ProgressEvent,
	ZoteroProgressWindowAdapter,
} from '../../src/utils/ProgressReporter';

describe('ProgressReporter', () => {
	let reporter: ProgressReporter;
	let mockListener: ProgressListener;
	let receivedEvents: ProgressEvent[];

	beforeEach(() => {
		reporter = new ProgressReporter();
		receivedEvents = [];
		mockListener = {
			onProgress: jest.fn((event: ProgressEvent) => {
				receivedEvents.push(event);
			}),
		};
	});

	describe('subscribe', () => {
		it('should add listener', () => {
			reporter.subscribe(mockListener);
			reporter.start('Test');

			expect(mockListener.onProgress).toHaveBeenCalled();
		});

		it('should return unsubscribe function', () => {
			const unsubscribe = reporter.subscribe(mockListener);
			unsubscribe();

			reporter.start('Test');
			expect(mockListener.onProgress).not.toHaveBeenCalled();
		});

		it('should support multiple listeners', () => {
			const listener2 = { onProgress: jest.fn() };

			reporter.subscribe(mockListener);
			reporter.subscribe(listener2);

			reporter.start('Test');

			expect(mockListener.onProgress).toHaveBeenCalled();
			expect(listener2.onProgress).toHaveBeenCalled();
		});
	});

	describe('start', () => {
		it('should emit start event', () => {
			reporter.subscribe(mockListener);
			reporter.start('Starting operation');

			expect(receivedEvents).toHaveLength(1);
			expect(receivedEvents[0].type).toBe('start');
			expect(receivedEvents[0].message).toBe('Starting operation');
			expect(receivedEvents[0].timestamp).toBeInstanceOf(Date);
		});

		it('should set reporter as active', () => {
			reporter.start('Test');
			expect(reporter.isReporting()).toBe(true);
		});

		it('should reset events on new start', () => {
			reporter.subscribe(mockListener);
			reporter.start('First');
			reporter.update('Update');
			reporter.start('Second');

			// Events should be reset
			const events = reporter.getEvents();
			expect(events).toHaveLength(1);
			expect(events[0].message).toBe('Second');
		});
	});

	describe('update', () => {
		beforeEach(() => {
			reporter.subscribe(mockListener);
			reporter.start('Started');
		});

		it('should emit update event', () => {
			reporter.update('Processing item 1');

			expect(receivedEvents[1].type).toBe('update');
			expect(receivedEvents[1].message).toBe('Processing item 1');
		});

		it('should include progress percentage', () => {
			reporter.update('50% complete', 50);

			expect(receivedEvents[1].progress).toBe(50);
		});

		it('should not emit if not active', () => {
			reporter.complete();
			receivedEvents = [];

			reporter.update('Should not emit');

			expect(receivedEvents).toHaveLength(0);
		});
	});

	describe('success', () => {
		beforeEach(() => {
			reporter.subscribe(mockListener);
			reporter.start('Started');
		});

		it('should emit success event', () => {
			reporter.success('Operation successful');

			expect(receivedEvents[1].type).toBe('success');
			expect(receivedEvents[1].message).toBe('Operation successful');
		});

		it('should include details', () => {
			const details = { itemCount: 5 };
			reporter.success('Archived 5 items', details);

			expect(receivedEvents[1].details).toEqual(details);
		});

		it('should not emit if not active', () => {
			reporter.complete();
			receivedEvents = [];

			reporter.success('Should not emit');

			expect(receivedEvents).toHaveLength(0);
		});
	});

	describe('error', () => {
		beforeEach(() => {
			reporter.subscribe(mockListener);
			reporter.start('Started');
		});

		it('should emit error event', () => {
			reporter.error('Something went wrong');

			expect(receivedEvents[1].type).toBe('error');
			expect(receivedEvents[1].message).toBe('Something went wrong');
		});

		it('should include error details', () => {
			const error = new Error('Network failure');
			reporter.error('Failed to archive', error);

			expect(receivedEvents[1].details).toBe(error);
		});

		it('should not emit if not active', () => {
			reporter.complete();
			receivedEvents = [];

			reporter.error('Should not emit');

			expect(receivedEvents).toHaveLength(0);
		});
	});

	describe('complete', () => {
		beforeEach(() => {
			reporter.subscribe(mockListener);
			reporter.start('Started');
		});

		it('should emit complete event', () => {
			reporter.complete('All done');

			expect(receivedEvents[1].type).toBe('complete');
			expect(receivedEvents[1].message).toBe('All done');
		});

		it('should use default message when not provided', () => {
			reporter.complete();

			expect(receivedEvents[1].message).toBe('Operation completed');
		});

		it('should set reporter as inactive', () => {
			reporter.complete();
			expect(reporter.isReporting()).toBe(false);
		});

		it('should not emit if not active', () => {
			reporter.complete();
			receivedEvents = [];

			reporter.complete('Should not emit');

			expect(receivedEvents).toHaveLength(0);
		});
	});

	describe('getEvents', () => {
		it('should return copy of events', () => {
			reporter.start('Started');
			reporter.update('Update 1');
			reporter.update('Update 2');

			const events = reporter.getEvents();

			expect(events).toHaveLength(3);
			expect(events[0].type).toBe('start');
			expect(events[1].type).toBe('update');
			expect(events[2].type).toBe('update');
		});

		it('should not allow modification of internal events', () => {
			reporter.start('Started');

			const events = reporter.getEvents();
			(events as ProgressEvent[]).push({
				type: 'update',
				message: 'Injected',
				timestamp: new Date(),
			});

			expect(reporter.getEvents()).toHaveLength(1);
		});
	});

	describe('isReporting', () => {
		it('should return false initially', () => {
			expect(reporter.isReporting()).toBe(false);
		});

		it('should return true after start', () => {
			reporter.start('Started');
			expect(reporter.isReporting()).toBe(true);
		});

		it('should return false after complete', () => {
			reporter.start('Started');
			reporter.complete();
			expect(reporter.isReporting()).toBe(false);
		});
	});

	describe('error handling in listeners', () => {
		it('should continue notifying other listeners if one throws', () => {
			const errorListener = {
				onProgress: jest.fn(() => {
					throw new Error('Listener error');
				}),
			};
			const goodListener = { onProgress: jest.fn() };

			reporter.subscribe(errorListener);
			reporter.subscribe(goodListener);

			// Should not throw
			expect(() => reporter.start('Test')).not.toThrow();

			// Other listener should still be called
			expect(goodListener.onProgress).toHaveBeenCalled();
		});
	});
});

describe('ZoteroProgressWindowAdapter', () => {
	let adapter: ZoteroProgressWindowAdapter;

	beforeEach(() => {
		adapter = new ZoteroProgressWindowAdapter();
		jest.clearAllMocks();
	});

	describe('onProgress - start event', () => {
		it('should create and show progress window', () => {
			adapter.onProgress({
				type: 'start',
				message: 'Starting archive',
				timestamp: new Date(),
			});

			expect(Zotero.ProgressWindow).toHaveBeenCalled();
		});
	});

	describe('onProgress - update event', () => {
		it('should update progress window', () => {
			// First start
			adapter.onProgress({
				type: 'start',
				message: 'Starting',
				timestamp: new Date(),
			});

			// Then update
			adapter.onProgress({
				type: 'update',
				message: 'Processing...',
				progress: 50,
				timestamp: new Date(),
			});

			// addDescription should have been called
			const mockWindow = (Zotero.ProgressWindow as jest.Mock).mock.results[0].value;
			expect(mockWindow.addDescription).toHaveBeenCalledWith('Processing...');
		});
	});

	describe('onProgress - success event', () => {
		it('should show success window', () => {
			adapter.onProgress({
				type: 'start',
				message: 'Starting',
				timestamp: new Date(),
			});

			adapter.onProgress({
				type: 'success',
				message: 'Archived successfully',
				timestamp: new Date(),
			});

			// Should create new window for success
			expect(Zotero.ProgressWindow).toHaveBeenCalledTimes(2);
		});
	});

	describe('onProgress - error event', () => {
		it('should show error window', () => {
			adapter.onProgress({
				type: 'start',
				message: 'Starting',
				timestamp: new Date(),
			});

			adapter.onProgress({
				type: 'error',
				message: 'Archive failed',
				details: new Error('Network error'),
				timestamp: new Date(),
			});

			// Should create new window for error
			expect(Zotero.ProgressWindow).toHaveBeenCalledTimes(2);
		});
	});

	describe('onProgress - complete event', () => {
		it('should close window when closeOnComplete is true', () => {
			adapter = new ZoteroProgressWindowAdapter({ closeOnComplete: true });

			adapter.onProgress({
				type: 'start',
				message: 'Starting',
				timestamp: new Date(),
			});

			adapter.onProgress({
				type: 'complete',
				message: 'Done',
				timestamp: new Date(),
			});

			const mockWindow = (Zotero.ProgressWindow as jest.Mock).mock.results[0].value;
			expect(mockWindow.close).toHaveBeenCalled();
		});

		it('should not close window when closeOnComplete is false', () => {
			adapter = new ZoteroProgressWindowAdapter({ closeOnComplete: false });

			adapter.onProgress({
				type: 'start',
				message: 'Starting',
				timestamp: new Date(),
			});

			adapter.onProgress({
				type: 'complete',
				message: 'Done',
				timestamp: new Date(),
			});

			const mockWindow = (Zotero.ProgressWindow as jest.Mock).mock.results[0].value;
			expect(mockWindow.close).not.toHaveBeenCalled();
		});
	});

	describe('options', () => {
		it('should respect autoCloseDelay', () => {
			adapter = new ZoteroProgressWindowAdapter({ autoCloseDelay: 5000 });

			adapter.onProgress({
				type: 'start',
				message: 'Starting',
				timestamp: new Date(),
			});

			adapter.onProgress({
				type: 'success',
				message: 'Done',
				timestamp: new Date(),
			});

			const successWindow = (Zotero.ProgressWindow as jest.Mock).mock.results[1].value;
			expect(successWindow.startCloseTimer).toHaveBeenCalledWith(5000);
		});
	});
});
