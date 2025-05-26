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
export declare class HttpClient {
    private defaultTimeout;
    private defaultHeaders;
    constructor(baseTimeout?: number);
    /**
     * Make an HTTP request with automatic error handling
     */
    request<T = string>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>>;
    /**
     * Convenience method for GET requests
     */
    get<T = string>(url: string, options?: Omit<HttpRequestOptions, 'method'>): Promise<HttpResponse<T>>;
    /**
     * Convenience method for POST requests
     */
    post<T = string>(url: string, body?: string, options?: Omit<HttpRequestOptions, 'method' | 'body'>): Promise<HttpResponse<T>>;
    /**
     * Parse header string into object
     */
    private parseHeaders;
    /**
     * Enhance error with additional context
     */
    private enhanceError;
}
//# sourceMappingURL=HttpClient.d.ts.map