/**
 * Unit tests for HttpClient
 */

import { HttpClient } from '../../src/utils/HttpClient';

describe('HttpClient', () => {
  let httpClient: HttpClient;
  let mockRequest: jest.Mock;

  beforeEach(() => {
    httpClient = new HttpClient();
    mockRequest = Zotero.HTTP.request as jest.Mock;
    mockRequest.mockClear();
  });

  describe('request', () => {
    it('should make successful GET request', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        responseText: 'Success',
        getAllResponseHeaders: () => 'Content-Type: text/plain\nContent-Length: 7'
      };
      mockRequest.mockResolvedValue(mockResponse);

      const result = await httpClient.get('https://example.com');

      expect(mockRequest).toHaveBeenCalledWith('GET', 'https://example.com', {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Zotero)' },
        body: undefined,
        timeout: 60000,
        responseType: 'text'
      });

      expect(result).toEqual({
        status: 200,
        statusText: 'OK',
        data: 'Success',
        headers: {
          'content-type': 'text/plain',
          'content-length': '7'
        }
      });
    });

    it('should make successful POST request', async () => {
      const mockResponse = {
        status: 201,
        statusText: 'Created',
        responseText: '{"id": 123}',
        getAllResponseHeaders: () => 'Content-Type: application/json'
      };
      mockRequest.mockResolvedValue(mockResponse);

      const result = await httpClient.post(
        'https://example.com/api',
        JSON.stringify({ name: 'test' }),
        { headers: { 'Content-Type': 'application/json' } }
      );

      expect(mockRequest).toHaveBeenCalledWith('POST', 'https://example.com/api', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Zotero)',
          'Content-Type': 'application/json'
        },
        body: '{"name":"test"}',
        timeout: 60000,
        responseType: 'text'
      });

      expect(result.status).toBe(201);
      expect(result.data).toBe('{"id": 123}');
    });

    it('should handle timeout errors', async () => {
      const error = new Error('Request timed out');
      (error as any).status = 0;
      mockRequest.mockRejectedValue(error);

      await expect(httpClient.get('https://example.com')).rejects.toThrow('Request timed out');
    });

    it('should handle server errors', async () => {
      const error = new Error('Internal Server Error');
      (error as any).status = 500;
      (error as any).statusText = 'Internal Server Error';
      mockRequest.mockRejectedValue(error);

      try {
        await httpClient.get('https://example.com');
      } catch (err: any) {
        expect(err.message).toBe('Server error: 500');
        expect(err.status).toBe(500);
      }
    });

    it('should handle client errors', async () => {
      const error = new Error('Not Found');
      (error as any).status = 404;
      mockRequest.mockRejectedValue(error);

      try {
        await httpClient.get('https://example.com');
      } catch (err: any) {
        expect(err.message).toBe('Client error: 404');
        expect(err.status).toBe(404);
      }
    });

    it('should use custom timeout', async () => {
      const customClient = new HttpClient(5000);
      mockRequest.mockResolvedValue({
        status: 200,
        statusText: 'OK',
        responseText: 'OK',
        getAllResponseHeaders: () => ''
      });

      await customClient.get('https://example.com');

      expect(mockRequest).toHaveBeenCalledWith('GET', 'https://example.com', {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Zotero)' },
        body: undefined,
        timeout: 5000,
        responseType: 'text'
      });
    });

    it('should handle JSON response type', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        responseJSON: { data: 'test' },
        getAllResponseHeaders: () => 'Content-Type: application/json'
      };
      mockRequest.mockResolvedValue(mockResponse);

      const result = await httpClient.get<{ data: string }>(
        'https://example.com',
        { responseType: 'json' }
      );

      expect(result.data).toEqual({ data: 'test' });
    });
  });

  describe('header parsing', () => {
    it('should parse headers correctly', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        responseText: 'OK',
        getAllResponseHeaders: () => 
          'Content-Type: text/html; charset=utf-8\n' +
          'Content-Length: 1234\n' +
          'X-Custom-Header: value\n' +
          'Set-Cookie: session=abc123'
      };
      mockRequest.mockResolvedValue(mockResponse);

      const result = await httpClient.get('https://example.com');

      expect(result.headers).toEqual({
        'content-type': 'text/html; charset=utf-8',
        'content-length': '1234',
        'x-custom-header': 'value',
        'set-cookie': 'session=abc123'
      });
    });

    it('should handle empty headers', async () => {
      const mockResponse = {
        status: 200,
        statusText: 'OK',
        responseText: 'OK',
        getAllResponseHeaders: () => ''
      };
      mockRequest.mockResolvedValue(mockResponse);

      const result = await httpClient.get('https://example.com');

      expect(result.headers).toEqual({});
    });
  });
});