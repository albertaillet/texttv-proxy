interface Env {}
export default {
	async fetch(request, env, ctx): Promise<Response> {
		// 1. Handle CORS Preflight (OPTIONS request)
		// This is necessary so the browser knows it's allowed to send the request.
		if (request.method === "OPTIONS") {
			return new Response(null, {
				headers: {
					"Access-Control-Allow-Origin": "*",
					"Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
					"Access-Control-Allow-Headers": "*",
				},
			});
		}

		// 2. Parse the target URL from the "?url=" query parameter
		const currentUrl = new URL(request.url);
		const targetUrl = currentUrl.searchParams.get("url");

		if (!targetUrl) {
			return new Response("Missing 'url' parameter. Usage: ?url=https://target.com", { 
				status: 400,
				headers: { "Access-Control-Allow-Origin": "*" } 
			});
		}

		async function gatherResponse(response) {
			const { headers } = response;
			const contentType = headers.get("content-type") || "";
			if (contentType.includes("application/json")) {
				return { contentType, result: JSON.stringify(await response.json()) };
			}
			// Added 'await' here so the result is always a string, not a Promise
			return { contentType, result: await response.text() };
		}

		// 3. Fetch the target URL with a User-Agent to prevent blocking
		const init = {
			headers: {
				"User-Agent": "Mozilla/5.0 (compatible; Cloudflare-Worker/1.0)",
			},
		};

		const response = await fetch(targetUrl, init);
		const { contentType, result } = await gatherResponse(response);

		// 4. Return the result with CORS headers enabled
		const options = {
			headers: {
				"content-type": contentType,
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
				"Access-Control-Allow-Headers": "*",
			}
		};
		
		return new Response(result, options);
	},
} satisfies ExportedHandler<Env>;
