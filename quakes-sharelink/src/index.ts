/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
	KV: KVNamespace;
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		// write a key-value pair
		await env.KV.put('KEY', 'VALUE');

		// read a key-value pair
		const value = await env.KV.get('KEY');

		// list all key-value pairs
		const allKeys = await env.KV.list();

		// delete a key-value pair
		await env.KV.delete('KEY');

		// return a Workers response
		return new Response(
			JSON.stringify({
				value: value,
				allKeys: allKeys,
			}),
		);
	},
} satisfies ExportedHandler<Env>;
