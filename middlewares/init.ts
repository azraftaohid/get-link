import { setupFunctionParams } from "./functions";

export function initMiddleware() {
	if (process.env.NODE_ENV === "development") setupFunctionParams("localhost", 5001);
}
