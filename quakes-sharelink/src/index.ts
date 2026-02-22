export interface Env {
	KV: KVNamespace;
	CORS_ORIGIN?: string;
	SHARE_URL_BASE?: string;
}

interface CreateShareRequest {
	v: number;
	state: string;
}

interface ShareRecord {
	v: number;
	state: string;
	createdAt: string;
}

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days
const MAX_STATE_LENGTH = 400_000;
const ID_LENGTH = 10;
const MAX_VERSION = 1_000_000;
const ID_REGEX = /^[A-Za-z0-9_-]{6,32}$/;

function getCorsOrigin(env: Env): string {
	return env.CORS_ORIGIN ?? '*';
}

function corsHeaders(env: Env): HeadersInit {
	return {
		'Access-Control-Allow-Origin': getCorsOrigin(env),
		'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type',
		'Access-Control-Max-Age': '86400',
		Vary: 'Origin',
	};
}

function jsonResponse(status: number, data: unknown, env: Env): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			...corsHeaders(env),
		},
	});
}

function textResponse(status: number, message: string, env: Env): Response {
	return new Response(message, {
		status,
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			...corsHeaders(env),
		},
	});
}

function randomId(length = ID_LENGTH): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
	const bytes = new Uint8Array(length);
	crypto.getRandomValues(bytes);
	let out = '';
	for (const value of bytes) {
		out += chars[value % chars.length];
	}
	return out;
}

function buildShareUrl(request: Request, env: Env, id: string): string {
	const base = env.SHARE_URL_BASE?.trim();
	if (base) {
		return new URL(`/s/${id}`, base).toString();
	}
	const url = new URL(request.url);
	return `${url.origin}/s/${id}`;
}

async function parseCreateRequest(request: Request): Promise<CreateShareRequest | null> {
	let json: unknown;
	try {
		json = await request.json<unknown>();
	} catch {
		return null;
	}
	if (typeof json !== 'object' || json === null) {
		return null;
	}
	const maybe = json as Partial<CreateShareRequest>;
	if (typeof maybe.v !== 'number' || !Number.isInteger(maybe.v) || maybe.v < 1 || maybe.v > MAX_VERSION) {
		return null;
	}
	if (typeof maybe.state !== 'string' || maybe.state.length < 1 || maybe.state.length > MAX_STATE_LENGTH) {
		return null;
	}
	return { v: maybe.v, state: maybe.state };
}

async function putWithUniqueId(env: Env, payload: ShareRecord): Promise<string> {
	for (let attempt = 0; attempt < 5; attempt += 1) {
		const id = randomId();
		const key = `share:${id}`;
		const existing = await env.KV.get(key);
		if (existing !== null) {
			continue;
		}
		await env.KV.put(key, JSON.stringify(payload), {
			expirationTtl: DEFAULT_TTL_SECONDS,
		});
		return id;
	}
	throw new Error('Unable to allocate a unique share id');
}

export default {
	async fetch(request, env): Promise<Response> {
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				status: 204,
				headers: corsHeaders(env),
			});
		}

		const url = new URL(request.url);
		const pathname = url.pathname;

		if (request.method === 'POST' && pathname === '/api/share') {
			const parsed = await parseCreateRequest(request);
			if (parsed === null) {
				return jsonResponse(400, {
					error: 'Invalid request body. Expected JSON: { "v": number, "state": string }',
				}, env);
			}

			const createdAt = new Date().toISOString();
			const id = await putWithUniqueId(env, {
				v: parsed.v,
				state: parsed.state,
				createdAt,
			});
			const expiresAt = new Date(Date.now() + DEFAULT_TTL_SECONDS * 1000).toISOString();

			return jsonResponse(201, {
				id,
				url: buildShareUrl(request, env, id),
				expiresAt,
				ttlSeconds: DEFAULT_TTL_SECONDS,
			}, env);
		}

		if (request.method === 'GET' && pathname.startsWith('/api/share/')) {
			const id = pathname.replace('/api/share/', '').trim();
			if (!ID_REGEX.test(id)) {
				return jsonResponse(400, { error: 'Invalid share id format' }, env);
			}

			const raw = await env.KV.get(`share:${id}`);
			if (raw === null) {
				return jsonResponse(404, { error: 'Share link not found or expired' }, env);
			}

			let record: ShareRecord;
			try {
				record = JSON.parse(raw) as ShareRecord;
			} catch {
				return jsonResponse(500, { error: 'Stored share payload is invalid JSON' }, env);
			}

			if (typeof record.v !== 'number' || typeof record.state !== 'string') {
				return jsonResponse(500, { error: 'Stored share payload is malformed' }, env);
			}

			return jsonResponse(200, {
				v: record.v,
				state: record.state,
				createdAt: record.createdAt,
			}, env);
		}

		if (request.method === 'GET' && pathname === '/health') {
			return jsonResponse(200, { ok: true }, env);
		}

		return textResponse(404, 'Not Found', env);
	},
} satisfies ExportedHandler<Env>;
