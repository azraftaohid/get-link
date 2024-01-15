import { Auth, User, getIdTokenResult } from "firebase/auth";
import { b2Config } from "./configs";
import { getHttpEndpoint } from "./functions";
import { Region } from "./region";

let client: Backblaze;

/**
 * Initialize on demand and get Backblaze instance.
 * 
 * @returns The B2 instance.
 */
export function getBackblaze() {
	if (!client) client = new Backblaze(b2Config);
	return client;
}

export class Backblaze {
	public readonly config: BackblazeConfig;
	public readonly region: string;
	public readonly b2BaseUrl: string;
	public readonly s3Endpoint: string;
	
	private credential: B2Credential | undefined;

	private boundAuth: Auth[];

	constructor(config: BackblazeConfig) {
		this.config = config;
		this.region = `eu-central-${config.clusterNo}`;
		this.b2BaseUrl = `https://f${config.clusterNo}.backblazeb2.com/file`;
		this.s3Endpoint = `https://s3.${this.region}.backblazeb2.com`;

		this.resetCredential();
		this.boundAuth = [];
	}

	public getCredential() {
		return this.credential;
	}

	private resetCredential() {
		let appKey: string | undefined;
		let appKeyId: string | undefined;
		if ((appKeyId = process.env.BACKBLAZE_APP_KEY_ID)) {
			appKey = process.env.BACKBLAZE_APP_KEY;
		} else if ((appKeyId = process.env.NEXT_PUBLIC_BACKBLAZE_APP_KEY_ID)) {
			appKey = process.env.NEXT_PUBLIC_BACKBLAZE_APP_KEY;
		}

		if (appKey && appKeyId) {
			this.credential = {
				key: appKey,
				keyId: appKeyId,
			};
		} else {
			console.warn("Could not resolve Backblaze application key or key ID.");
			this.credential = undefined;
		}
	}

	public bindAuth(auth: Auth) {
		if (this.boundAuth.indexOf(auth) !== -1) {
			return console.log(`B2 already bound to given auth instance [bound count: ${this.boundAuth.length}].`);
		}
		this.boundAuth.push(auth);

		auth.authStateReady().then(async () => {
			console.debug("Auth state settled, updating B2 credential");
			const user = auth.currentUser;
			if (user) this.credential = await getB2Credential(user);
			else this.resetCredential();
		}).catch(error => {
			console.error("B2 credential update failed on post auth state settle: ", error);
		});

		let thenCredential: B2Credential | undefined;
		auth.beforeAuthStateChanged(async (user) => {
			console.debug("Auth state may change, updating B2 credential.");
			thenCredential = this.credential;
			if (user) this.credential = await getB2Credential(user);
			else this.resetCredential();
		}, () => {
			console.debug("Auth state change aborted, reverting B2 credential.");
			this.credential = thenCredential;
		});
	}
}

export async function getB2Credential(user: User | null): Promise<B2Credential> {
	if (!user) throw new Error("User must be signed in with Firebase to get B2 authorization.");

	const idTokenResult = await getIdTokenResult(user, true);

	const keyId = idTokenResult.claims.b2KeyId;
	const key = idTokenResult.claims.b2Key;
	if (typeof keyId === "string" && typeof key === "string") return { key, keyId };

	const idToken = idTokenResult.token;

	const url = getHttpEndpoint("storage/get-b2-authorization", Region.ASIA_SOUTH_1);
	const response = await fetch(url, {
		headers: {
			"Firebase-Authorization": `Bearer ${idToken}`,
		},
		method: "GET",
	});

	let data: { key?: string, keyId?: string, message?: string };
	try {
		data = await response.json();
	} catch (error) {
		throw new Error(`Get storage authorization failed with code: ${response.status} and cause data could not be parsed into JSON.`);
	}

	if (response.status !== 200) {
		throw new Error(`Get storage authorization failed with code: ${response.status} and message ${data.message}`);
	}

	if (!data.key || !data.keyId) {
		throw new Error("Get storage authorization failed with cause app key and/or app key name is not defined in the response data");
	}

	return { keyId: data.keyId, key: data.key };
}

export function makeB2AuthToken(keyId: string, key: string) {
	return `${keyId}:${key}`;
}

export interface BackblazeConfig {
	clusterNo: string,
	defaultBucket: string,
}

export interface B2Credential {
	keyId: string,
	key: string,
}
