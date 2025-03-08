import { getCloudflareContext } from "@opennextjs/cloudflare";

let hasInit = false;

export function init() {
	if (hasInit) return;
	hasInit = true;

	console.info("Getting Cloudflare context...");
	getCloudflareContext({ async: true }).then(context => {
		console.info("Env: ", context.env.NEXTJS_ENV);
	}).catch(err => {
		console.error("Error getting Cloudflare context: ", err);
	});

	if (process.env.NODE_ENV === "production") {
		const noOp = () => {
			/* no-op */
		};
		console.debug = noOp;
		console.log = noOp;
	}
}
