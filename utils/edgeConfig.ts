let client: EdgeConfig | undefined;

export function getEdgeConfig() {
	if (!client) {
		client = new EdgeConfig(process.env.EDGE_CONFIG_ID || "", process.env.EDGE_CONFIG_TOKEN || "");
	}

	return client;
}

export class EdgeConfig {
	private readonly configId: string;
	private readonly configToken: string;

	constructor(id: string, token: string) {
		this.configId = id;
		this.configToken = token;
	}

	public async get<T = EdgeConfigValue>(key: string, options?: EdgeConfigOptions): Promise<T | undefined> {
		const response = await fetch(`https://edge-config.vercel.com/${this.configId}/item/${key}`, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${this.configToken}`,
			},
			...(options?.revalidate !== undefined && { next: { revalidate: options.revalidate } }),
		});
	
		return await response.json();
	}
}

export type EdgeConfigValue = string | number | boolean | null | {
    [x: string]: EdgeConfigValue;
} | EdgeConfigValue[];

export type EdgeConfigOptions = {
	revalidate?: number | false;
}
