import { NextApiHandler, NextApiRequest } from "next";
import { Readable } from "stream";
import { now } from "../../../utils/dates";

function transformHeaders(src: NextApiRequest["headers"]) {
	const result: Record<string, string> = {};
	Object.entries(src).forEach(([key, value]) => value && (result[key] = Array.isArray(value) ? value.join(",") : value));

	return result;
}

const handler: NextApiHandler = async (req, res) => {
	const { slug, ...query } = req.query as QueryParams;
	const path = slug.join("/");

	const url = new URL(path, "https://api003.backblazeb2.com");
	Object.keys(query).forEach(key => url.searchParams.set(key, query[key]));

	console.debug(`Forward URL: ${url.toString()}`);

	let bodyStream: ReadableStream | undefined;
	if (req.method === "POST" || req.method === "PUT") {
		bodyStream = new ReadableStream({
			start(controller) {
				req.on("data", (chunk) => controller.enqueue(chunk));
				req.on("close", () => controller.close());
				req.on("error", (err) => controller.error(err));
			}
		});
	}

	const startTime = now();
	let result: Response;
	try {
		result = await fetch(url, {
			method: req.method,
			headers: transformHeaders(req.headers),
			body: bodyStream,
			// @ts-expect-error is required be spec; see: https://github.com/nodejs/node/issues/46221
			duplex: "half",
		});
	} catch (error) {
		console.error(`B2 request forward failed (${url.pathname}): `, error);
		if (error instanceof TypeError && `${error.cause}`.startsWith("ConnectTimeoutError:")){
			res.status(504);
		} else {
			res.status(502);
		}

		return res.json({
			status: res.statusCode,
			code: "proxy-fetch-failed",
			message: "Unable to forward the request.",
		});
	}

	console.debug(`Response received [api: ${url.pathname}; status: ${result.status}; took: ${now() - startTime}ms]`);
	res.status(result.status);
	result.headers.forEach((value, key) => res.setHeader(key, value));

	if (result.body) {
		const r = Readable.from(result.body as unknown as Parameters<typeof Readable.from>[0]);
		return r.pipe(res);
	}
};

export default handler;

export const config = {
	api: {
		bodyParser: false,
	},
};

type QueryParams = {
	slug: string[],
} & {
	[key: string]: string,
}
