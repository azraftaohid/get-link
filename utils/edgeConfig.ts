import { createClient, EdgeConfigClient } from "@vercel/edge-config";

let client: EdgeConfigClient | undefined;

export function getEdgeConfig() {
	if (!client) {
		client = createClient(
			`https://edge-config.vercel.com/${process.env.EDGE_CONFIG_ID}?token=${process.env.EDGE_CONFIG_TOKEN}`
		);
	}

	return client;
}
