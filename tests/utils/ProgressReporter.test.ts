/**
 * Tests for ProgressReporter
 */

import {
  ProgressReporter,
  ProgressListener,
  ProgressEvent,
  ZoteroProgressWindowAdapter,
} from "../../src/utils/ProgressReporter";

describe("ProgressReporter", function () {
  let reporter: ProgressReporter;
  let mockListener: ProgressListener;
  let receivedEvents: ProgressEvent[];

  beforeEach(function () {
    reporter = new ProgressReporter();
    receivedEvents = [];
    mockListener = {
      onProgress: jest.fn((event: ProgressEvent) => {
        receivedEvents.push(event);
      }),
    };
  });

  describe("subscribe", function () {
    it("should add listener", function () {
      reporter.subscribe(mockListener);
      reporter.start("Test");

      expect(mockListener.onProgress).toHaveBeenCalled();
    });

    it("should return unsubscribe function", function () {
      const unsubscribe = reporter.subscribe(mockListener);
      unsubscribe();

      reporter.start("Test");
      expect(mockListener.onProgress).not.toHaveBeenCalled();
    });

    it("should support multiple listeners", function () {
      const listener2 = { onProgress: jest.fn() };

      reporter.subscribe(mockListener);
      reporter.subscribe(listener2);

      reporter.start("Test");

      expect(mockListener.onProgress).toHaveBeenCalled();
      expect(listener2.onProgress).toHaveBeenCalled();
    });
  });

  describe("start", function () {
    it("should emit start event", function () {
      reporter.subscribe(mockListener);
      reporter.start("Starting operation");

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].type).toBe("start");
      expect(receivedEvents[0].message).toBe("Starting operation");
      expect(receivedEvents[0].timestamp).toBeInstanceOf(Date);
    });

    it("should set reporter as active", function () {
      reporter.start("Test");
      expect(reporter.isReporting()).toBe(true);
    });

    it("should reset events on new start", function () {
      reporter.subscribe(mockListener);
      reporter.start("First");
      reporter.update("Update");
      reporter.start("Second");

      // Events should be reset
      const events = reporter.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].message).toBe("Second");
    });
  });

  describe("update", function () {
    beforeEach(function () {
      reporter.subscribe(mockListener);
      reporter.start("Started");
    });

    it("should emit update event", function () {
      reporter.update("Processing item 1");

      expect(receivedEvents[1].type).toBe("update");
      expect(receivedEvents[1].message).toBe("Processing item 1");
    });

    it("should include progress percentage", function () {
      reporter.update("50% complete", 50);

      expect(receivedEvents[1].progress).toBe(50);
    });

    it("should not emit if not active", function () {
      reporter.complete();
      receivedEvents = [];

      reporter.update("Should not emit");

      expect(receivedEvents).toHaveLength(0);
    });
  });

  describe("success", function () {
    beforeEach(function () {
      reporter.subscribe(mockListener);
      reporter.start("Started");
    });

    it("should emit success event", function () {
      reporter.success("Operation successful");

      expect(receivedEvents[1].type).toBe("success");
      expect(receivedEvents[1].message).toBe("Operation successful");
    });

    it("should include details", function () {
      const details = { itemCount: 5 };
      reporter.success("Archived 5 items", details);

      expect(receivedEvents[1].details).toEqual(details);
    });

    it("should not emit if not active", function () {
      reporter.complete();
      receivedEvents = [];

      reporter.success("Should not emit");

      expect(receivedEvents).toHaveLength(0);
    });
  });

  describe("error", function () {
    beforeEach(function () {
      reporter.subscribe(mockListener);
      reporter.start("Started");
    });

    it("should emit error event", function () {
      reporter.error("Something went wrong");

      expect(receivedEvents[1].type).toBe("error");
      expect(receivedEvents[1].message).toBe("Something went wrong");
    });

    it("should include error details", function () {
      const error = new Error("Network failure");
      reporter.error("Failed to archive", error);

      expect(receivedEvents[1].details).toBe(error);
    });

    it("should not emit if not active", function () {
      reporter.complete();
      receivedEvents = [];

      reporter.error("Should not emit");

      expect(receivedEvents).toHaveLength(0);
    });
  });

  describe("complete", function () {
    beforeEach(function () {
      reporter.subscribe(mockListener);
      reporter.start("Started");
    });

    it("should emit complete event", function () {
      reporter.complete("All done");

      expect(receivedEvents[1].type).toBe("complete");
      expect(receivedEvents[1].message).toBe("All done");
    });

    it("should use default message when not provided", function () {
      reporter.complete();

      expect(receivedEvents[1].message).toBe("Operation completed");
    });

    it("should set reporter as inactive", function () {
      reporter.complete();
      expect(reporter.isReporting()).toBe(false);
    });

    it("should not emit if not active", function () {
      reporter.complete();
      receivedEvents = [];

      reporter.complete("Should not emit");

      expect(receivedEvents).toHaveLength(0);
    });
  });

  describe("getEvents", function () {
    it("should return copy of events", function () {
      reporter.start("Started");
      reporter.update("Update 1");
      reporter.update("Update 2");

      const events = reporter.getEvents();

      expect(events).toHaveLength(3);
      expect(events[0].type).toBe("start");
      expect(events[1].type).toBe("update");
      expect(events[2].type).toBe("update");
    });

    it("should not allow modification of internal events", function () {
      reporter.start("Started");

      const events = reporter.getEvents();
      (events as ProgressEvent[]).push({
        type: "update",
        message: "Injected",
        timestamp: new Date(),
      });

      expect(reporter.getEvents()).toHaveLength(1);
    });
  });

  describe("isReporting", function () {
    it("should return false initially", function () {
      expect(reporter.isReporting()).toBe(false);
    });

    it("should return true after start", function () {
      reporter.start("Started");
      expect(reporter.isReporting()).toBe(true);
    });

    it("should return false after complete", function () {
      reporter.start("Started");
      reporter.complete();
      expect(reporter.isReporting()).toBe(false);
    });
  });

  describe("error handling in listeners", function () {
    it("should continue notifying other listeners if one throws", function () {
      const errorListener = {
        onProgress: jest.fn(() => {
          throw new Error("Listener error");
        }),
      };
      const goodListener = { onProgress: jest.fn() };

      reporter.subscribe(errorListener);
      reporter.subscribe(goodListener);

      // Should not throw
      expect(() => reporter.start("Test")).not.toThrow();

      // Other listener should still be called
      expect(goodListener.onProgress).toHaveBeenCalled();
    });
  });
});

describe("ZoteroProgressWindowAdapter", function () {
  let adapter: ZoteroProgressWindowAdapter;

  beforeEach(function () {
    adapter = new ZoteroProgressWindowAdapter();
    jest.clearAllMocks();
  });

  describe("onProgress - start event", function () {
    it("should create and show progress window", function () {
      adapter.onProgress({
        type: "start",
        message: "Starting archive",
        timestamp: new Date(),
      });

      expect(Zotero.ProgressWindow).toHaveBeenCalled();
    });
  });

  describe("onProgress - update event", function () {
    it("should update progress window", function () {
      // First start
      adapter.onProgress({
        type: "start",
        message: "Starting",
        timestamp: new Date(),
      });

      // Then update
      adapter.onProgress({
        type: "update",
        message: "Processing...",
        progress: 50,
        timestamp: new Date(),
      });

      // addDescription should have been called
      const mockWindow = (Zotero.ProgressWindow as jest.Mock).mock.results[0]
        .value;
      expect(mockWindow.addDescription).toHaveBeenCalledWith("Processing...");
    });
  });

  describe("onProgress - success event", function () {
    it("should show success window", function () {
      adapter.onProgress({
        type: "start",
        message: "Starting",
        timestamp: new Date(),
      });

      adapter.onProgress({
        type: "success",
        message: "Archived successfully",
        timestamp: new Date(),
      });

      // Should create new window for success
      expect(Zotero.ProgressWindow).toHaveBeenCalledTimes(2);
    });
  });

  describe("onProgress - error event", function () {
    it("should show error window", function () {
      adapter.onProgress({
        type: "start",
        message: "Starting",
        timestamp: new Date(),
      });

      adapter.onProgress({
        type: "error",
        message: "Archive failed",
        details: new Error("Network error"),
        timestamp: new Date(),
      });

      // Should create new window for error
      expect(Zotero.ProgressWindow).toHaveBeenCalledTimes(2);
    });
  });

  describe("onProgress - complete event", function () {
    it("should close window when closeOnComplete is true", function () {
      adapter = new ZoteroProgressWindowAdapter({ closeOnComplete: true });

      adapter.onProgress({
        type: "start",
        message: "Starting",
        timestamp: new Date(),
      });

      adapter.onProgress({
        type: "complete",
        message: "Done",
        timestamp: new Date(),
      });

      const mockWindow = (Zotero.ProgressWindow as jest.Mock).mock.results[0]
        .value;
      expect(mockWindow.close).toHaveBeenCalled();
    });

    it("should not close window when closeOnComplete is false", function () {
      adapter = new ZoteroProgressWindowAdapter({ closeOnComplete: false });

      adapter.onProgress({
        type: "start",
        message: "Starting",
        timestamp: new Date(),
      });

      adapter.onProgress({
        type: "complete",
        message: "Done",
        timestamp: new Date(),
      });

      const mockWindow = (Zotero.ProgressWindow as jest.Mock).mock.results[0]
        .value;
      expect(mockWindow.close).not.toHaveBeenCalled();
    });
  });

  describe("options", function () {
    it("should respect autoCloseDelay", function () {
      adapter = new ZoteroProgressWindowAdapter({ autoCloseDelay: 5000 });

      adapter.onProgress({
        type: "start",
        message: "Starting",
        timestamp: new Date(),
      });

      adapter.onProgress({
        type: "success",
        message: "Done",
        timestamp: new Date(),
      });

      const successWindow = (Zotero.ProgressWindow as jest.Mock).mock.results[1]
        .value;
      expect(successWindow.startCloseTimer).toHaveBeenCalledWith(5000);
    });
  });
});
