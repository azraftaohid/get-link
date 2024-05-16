import { get } from "@vercel/edge-config";
import { AppCheckToken, CustomProvider } from "firebase/app-check";
import { appcheckDebugToken } from "../configs";
import { now } from "../dates";
import { MaxFetchRateExceededError } from "../errors/MaxFetchRateExceededError";

export class AppCheckFromEdgeConfigProvider extends CustomProvider {
	private static FETCH_RATE_P100S = 5;

	private attempts = new Map<number, { attemptNo: number, cachedValue?: AppCheckToken }>();

	constructor() {
		super({
			getToken: async () => {
				const periodId = now() / 100000 | 0; // changes every 100 seconds
				const attempt = this.attempts.get(periodId) || { attemptNo: 1 };

				if (attempt.cachedValue) {
					console.debug("Returning cached appcheck token.");
					return attempt.cachedValue;
				}
				
				if (attempt.attemptNo > AppCheckFromEdgeConfigProvider.FETCH_RATE_P100S) throw new MaxFetchRateExceededError();
				attempt.attemptNo++;
				this.attempts.clear();
				this.attempts.set(periodId, attempt);

				let result: AppCheckToken;
				if (process.env.NODE_ENV === "development") {
					console.debug("Using AppCheck debug token");

					result = {
						token: appcheckDebugToken,
						expireTimeMillis: now() + 60 * 60 * 1000,
					};
				} else {
					console.debug("Getting appcheck token from database.");
					const options = await get("appCheck");
					if (!options || typeof options !== "object" || Array.isArray(options)) 
						throw new Error("AppCheck object is malformed or missing from database.");
	
					const token = options.token;
					const expireTime = options.expireTime;
	
					if (typeof token !== "string" || typeof expireTime !== "number" || expireTime < new Date().getTime())
						throw new Error("Invalid token or expire time of AppCheck object.");

					result = {
						token,
						expireTimeMillis: expireTime,
					};
				}

				// cache the result for current period
				// init calls from other periods would fetch from server
				if ((result.expireTimeMillis / 100000 | 0) > periodId) attempt.cachedValue = result;
				return result;
			}
		});
	}
}
