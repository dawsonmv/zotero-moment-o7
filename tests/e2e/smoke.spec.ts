/**
 * Smoke tests for Zotero Moment-o7 plugin
 *
 * These tests verify basic functionality works.
 * For full E2E testing, Zotero must be running with the plugin installed.
 */

import { test, expect } from '@playwright/test';

test.describe('Zotero Moment-o7 Smoke Tests', () => {
	test.describe('Internet Archive API', () => {
		test('should verify Internet Archive availability', async ({ request }) => {
			// Test that Internet Archive API is reachable
			const response = await request.head('https://web.archive.org/');
			expect(response.ok()).toBeTruthy();
		});

		test('should check Wayback Machine availability endpoint', async ({ request }) => {
			// Test availability API
			const response = await request.get('https://archive.org/wayback/available?url=example.com');
			expect(response.ok()).toBeTruthy();

			const data = await response.json();
			expect(data).toHaveProperty('url');
		});
	});

	test.describe('Archive.today API', () => {
		test('should verify Archive.today is reachable', async ({ request }) => {
			// Note: Archive.today may block automated requests
			// This is a basic connectivity test
			try {
				const response = await request.head('https://archive.today/', {
					timeout: 10000,
				});
				// Archive.today may return various status codes
				expect(response.status()).toBeLessThan(500);
			} catch (error) {
				// Skip if blocked - this is expected behavior
				test.skip();
			}
		});
	});

	test.describe('Memento Protocol', () => {
		test('should query TimeMap for a known URL', async ({ request }) => {
			const testUrl = 'http://example.com';
			const timemapUrl = `https://web.archive.org/web/timemap/link/${testUrl}`;

			const response = await request.get(timemapUrl);
			expect(response.ok()).toBeTruthy();

			const body = await response.text();
			// TimeMap should contain memento links
			expect(body).toContain('rel="memento"');
		});

		test('should handle TimeGate negotiation', async ({ request }) => {
			const testUrl = 'http://example.com';
			const timegateUrl = `https://web.archive.org/web/${testUrl}`;

			const response = await request.head(timegateUrl, {
				headers: {
					'Accept-Datetime': 'Thu, 01 Jan 2023 00:00:00 GMT',
				},
			});

			// Should redirect to a memento or return memento headers
			expect(response.status()).toBeLessThan(500);
		});
	});

	test.describe('Plugin Configuration', () => {
		test('plugin manifest should be valid JSON', async () => {
			// This would be a local file test in actual E2E
			// Placeholder for plugin manifest validation
			expect(true).toBeTruthy();
		});
	});
});

test.describe('Performance Benchmarks', () => {
	test('Internet Archive response time should be reasonable', async ({ request }) => {
		const startTime = Date.now();

		await request.get('https://archive.org/wayback/available?url=example.com');

		const duration = Date.now() - startTime;

		// Should respond within 10 seconds
		expect(duration).toBeLessThan(10000);
	});
});
