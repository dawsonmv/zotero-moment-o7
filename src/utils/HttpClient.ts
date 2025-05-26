/**
 * HTTP Client utility for making requests
 * Separates HTTP concerns from business logic
 */

export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  timeout?: number;
  responseType?: 'text' | 'json';
}

export interface HttpResponse<T = string> {
  status: number;
  statusText: string;
  data: T;
  headers: Record<string, string>;
}

export interface HttpError extends Error {
  status?: number;
  statusText?: string;
  response?: any;
}

/**
 * HttpClient provides a clean interface for HTTP requests
 * with proper error handling and response typing
 */
export class HttpClient {
  private defaultTimeout = 60000;
  private defaultHeaders = {
    'User-Agent': 'Mozilla/5.0 (compatible; Zotero)'
  };

  constructor(private baseTimeout?: number) {
    if (baseTimeout) {
      this.defaultTimeout = baseTimeout;
    }
  }

  /**
   * Make an HTTP request with automatic error handling
   */
  async request<T = string>(
    url: string, 
    options: HttpRequestOptions = {}
  ): Promise<HttpResponse<T>> {
    const { 
      method = 'GET', 
      headers = {}, 
      body, 
      timeout = this.defaultTimeout,
      responseType = 'text'
    } = options;

    try {
      const response = await Zotero.HTTP.request(method, url, {
        headers: { ...this.defaultHeaders, ...headers },
        body,
        timeout,
        responseType: responseType as any
      });

      const responseHeaders = this.parseHeaders(response.getAllResponseHeaders());

      return {
        status: response.status,
        statusText: response.statusText,
        data: responseType === 'json' ? response.responseJSON : response.responseText,
        headers: responseHeaders
      };
    } catch (error: any) {
      throw this.enhanceError(error);
    }
  }

  /**
   * Convenience method for GET requests
   */
  async get<T = string>(url: string, options?: Omit<HttpRequestOptions, 'method'>): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  /**
   * Convenience method for POST requests
   */
  async post<T = string>(
    url: string, 
    body?: string, 
    options?: Omit<HttpRequestOptions, 'method' | 'body'>
  ): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...options, method: 'POST', body });
  }

  /**
   * Parse header string into object
   */
  private parseHeaders(headerStr: string): Record<string, string> {
    const headers: Record<string, string> = {};
    if (!headerStr) return headers;

    headerStr.split('\n').forEach(line => {
      const index = line.indexOf(':');
      if (index > 0) {
        const key = line.slice(0, index).trim().toLowerCase();
        const value = line.slice(index + 1).trim();
        headers[key] = value;
      }
    });

    return headers;
  }

  /**
   * Enhance error with additional context
   */
  private enhanceError(error: any): HttpError {
    const enhanced: HttpError = new Error(error.message || 'HTTP request failed');
    enhanced.name = 'HttpError';
    enhanced.status = error.status;
    enhanced.statusText = error.statusText;
    enhanced.response = error.responseText;
    
    // Add more context based on status code
    if (error.status === 0 && error.message?.includes('timeout')) {
      enhanced.message = 'Request timed out';
    } else if (error.status >= 500) {
      enhanced.message = `Server error: ${error.status}`;
    } else if (error.status >= 400) {
      enhanced.message = `Client error: ${error.status}`;
    }

    return enhanced;
  }
}