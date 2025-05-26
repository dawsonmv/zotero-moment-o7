/**
 * Progress reporting system using Observer pattern
 * Decouples progress UI from business logic
 */

export type ProgressEventType = 'start' | 'update' | 'success' | 'error' | 'complete';

export interface ProgressEvent {
  type: ProgressEventType;
  message: string;
  progress?: number; // 0-100
  details?: any;
  timestamp: Date;
}

export interface ProgressListener {
  onProgress(event: ProgressEvent): void;
}

/**
 * Observable progress reporter
 * Implements the Observer pattern for progress updates
 */
export class ProgressReporter {
  private listeners = new Set<ProgressListener>();
  private events: ProgressEvent[] = [];
  private isActive = false;

  /**
   * Subscribe to progress events
   */
  subscribe(listener: ProgressListener): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Start a new progress session
   */
  start(message: string): void {
    this.isActive = true;
    this.events = [];
    this.notify({
      type: 'start',
      message,
      timestamp: new Date()
    });
  }

  /**
   * Update progress
   */
  update(message: string, progress?: number): void {
    if (!this.isActive) return;
    
    this.notify({
      type: 'update',
      message,
      progress,
      timestamp: new Date()
    });
  }

  /**
   * Report success
   */
  success(message: string, details?: any): void {
    if (!this.isActive) return;
    
    this.notify({
      type: 'success',
      message,
      details,
      timestamp: new Date()
    });
  }

  /**
   * Report error
   */
  error(message: string, error?: Error): void {
    if (!this.isActive) return;
    
    this.notify({
      type: 'error',
      message,
      details: error,
      timestamp: new Date()
    });
  }

  /**
   * Complete the progress session
   */
  complete(message?: string): void {
    if (!this.isActive) return;
    
    this.notify({
      type: 'complete',
      message: message || 'Operation completed',
      timestamp: new Date()
    });
    
    this.isActive = false;
  }

  /**
   * Get all events from current session
   */
  getEvents(): ReadonlyArray<ProgressEvent> {
    return [...this.events];
  }

  /**
   * Check if reporter is active
   */
  isReporting(): boolean {
    return this.isActive;
  }

  /**
   * Notify all listeners
   */
  private notify(event: ProgressEvent): void {
    this.events.push(event);
    this.listeners.forEach(listener => {
      try {
        listener.onProgress(event);
      } catch (error) {
        console.error('Progress listener error:', error);
      }
    });
  }
}

/**
 * Zotero-specific progress window adapter
 * Implements ProgressListener to show Zotero progress windows
 */
export class ZoteroProgressWindowAdapter implements ProgressListener {
  private progressWindow: Zotero.ProgressWindow | null = null;
  private closeOnComplete: boolean;
  private autoCloseDelay: number;

  constructor(
    options: {
      closeOnComplete?: boolean;
      autoCloseDelay?: number;
      closeOnClick?: boolean;
    } = {}
  ) {
    this.closeOnComplete = options.closeOnComplete ?? true;
    this.autoCloseDelay = options.autoCloseDelay ?? 3000;
  }

  onProgress(event: ProgressEvent): void {
    switch (event.type) {
      case 'start':
        this.showWindow(event.message);
        break;
        
      case 'update':
        this.updateWindow(event.message, event.progress);
        break;
        
      case 'success':
        this.showSuccess(event.message);
        break;
        
      case 'error':
        this.showError(event.message, event.details);
        break;
        
      case 'complete':
        if (this.closeOnComplete) {
          this.closeWindow();
        }
        break;
    }
  }

  private showWindow(headline: string): void {
    this.progressWindow = new (Zotero.ProgressWindow as any)({ 
      closeOnClick: false 
    });
    this.progressWindow!.changeHeadline(headline);
    this.progressWindow!.show();
  }

  private updateWindow(message: string, progress?: number): void {
    if (!this.progressWindow) return;
    
    this.progressWindow.addDescription(message);
    
    // If progress percentage is provided, could show progress bar
    // (Zotero's progress window doesn't support this directly)
  }

  private showSuccess(message: string): void {
    this.closeWindow();
    
    const successWindow = new (Zotero.ProgressWindow as any)({ 
      closeOnClick: true 
    });
    successWindow.changeHeadline('Success');
    successWindow.addDescription(message);
    successWindow.show();
    successWindow.startCloseTimer(this.autoCloseDelay);
  }

  private showError(message: string, error?: Error): void {
    this.closeWindow();
    
    const errorWindow = new (Zotero.ProgressWindow as any)({ 
      closeOnClick: true 
    });
    errorWindow.changeHeadline('Error');
    errorWindow.addDescription(message);
    if (error) {
      errorWindow.addDescription(error.message);
    }
    errorWindow.show();
    errorWindow.startCloseTimer(this.autoCloseDelay * 2);
  }

  private closeWindow(): void {
    if (this.progressWindow) {
      this.progressWindow.close();
      this.progressWindow = null;
    }
  }
}