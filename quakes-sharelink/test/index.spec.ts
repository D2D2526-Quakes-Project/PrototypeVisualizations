import { SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

describe('share link worker', () => {
	it('creates and retrieves a share payload', async () => {
		const createResponse = await SELF.fetch('https://example.com/api/share', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
			},
			body: JSON.stringify({
				v: 1,
				state: 'encoded-state',
			}),
		});
		expect(createResponse.status).toBe(201);
		const created = (await createResponse.json()) as {
			id: string;
			url: string;
			expiresAt: string;
			ttlSeconds: number;
		};
		expect(typeof created.id).toBe('string');
		expect(created.id.length).toBeGreaterThan(0);
		expect(created.ttlSeconds).toBeGreaterThan(0);

		const readResponse = await SELF.fetch(`https://example.com/api/share/${created.id}`);
		expect(readResponse.status).toBe(200);
		const readJson = (await readResponse.json()) as { v: number; state: string };
		expect(readJson).toMatchObject({
			v: 1,
			state: 'encoded-state',
		});
	});

	it('rejects invalid create payloads', async () => {
		const response = await SELF.fetch('https://example.com/api/share', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
			},
			body: JSON.stringify({
				v: 0,
				state: '',
			}),
		});
		expect(response.status).toBe(400);
	});

	it('returns not found for missing share id', async () => {
		const response = await SELF.fetch('https://example.com/api/share/does-not-exist');
		expect(response.status).toBe(404);
	});
});
