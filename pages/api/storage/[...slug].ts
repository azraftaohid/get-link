import { NextApiHandler, NextApiRequest } from "next";
import { Readable } from "stream";
import { now } from "../../../utils/dates";
import { isTimeoutError } from "../../../utils/errors/utils";
import { getBucketName } from "../../../utils/storage";

export const B2_API_URL = "https://api003.backblazeb2.com";

const ALLOWED_API_ENDPOINTS = [
	"b2_authorize_account", "b2_cancel_large_file", "b2_finish_large_file", "b2_get_file_info", "b2_get_upload_part_url",
	"b2_get_upload_url", "b2_list_file_names", "b2_list_file_versions", "b2_list_parts", "b2_head_file",
	"b2_list_unfinished_large_files", "b2_start_large_file", "b2_upload_file", "b2_upload_part"
];

export function transformHeaders(src: NextApiRequest["headers"]) {
	const result: Record<string, string> = {};
	Object.entries(src).forEach(([key, value]) => {
		if (!value || key.startsWith("x-gl-")) return;
		result[key] = Array.isArray(value) ? value.join(",") : value;
	});

	return result;
}

const handler: NextApiHandler = async (req, res) => {
	const { slug, ...query } = req.query as QueryParams;
	const apiEndpoint = slug.join("/");

	if (!ALLOWED_API_ENDPOINTS.includes(apiEndpoint)) {
		return res.status(403).json({
			status: 403,
			code: "forbidden_api_call",
			message: `Requested API call (${apiEndpoint}) is not on the list of allowed API endpoints.`,
		});
	}

	const requestedFwdUrl = req.headers["x-gl-forward-url"];
	const url = typeof requestedFwdUrl === "string"
		? new URL(requestedFwdUrl)
		: new URL(`${B2_API_URL}/b2api/v2/${apiEndpoint}`);

	Object.keys(query).forEach(key => url.searchParams.set(key, query[key])); // mirror query params

	console.debug(`Forward URL: ${url.toString()}`);

	// we don't want to wait and consume the whole body then sending the request; (see exported api config options below)
	// instead, we are passing the request body to our endpoint
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
			// @ts-expect-error: is required by spec; see: https://github.com/nodejs/node/issues/46221
			duplex: "half",
		});
	} catch (error) {
		console.error(`B2 request forward failed (${apiEndpoint}): `, error);
		if (isTimeoutError(error)) res.status(504);
		else res.status(502);

		return res.json({
			status: res.statusCode,
			code: "proxy_fetch_failed",
			message: "Unable to forward the request.",
		});
	}

	console.debug(`Response received [api: ${apiEndpoint}; status: ${result.status}; took: ${now() - startTime}ms]`);

	// call this to return with the response from B2 endpoint
	const continueWithResult = () => {
		res.status(result.status);
		result.headers.forEach((value, key) => res.setHeader(key, value)); // set result headers to response

		if (jsonResponse) return res.json(jsonResponse);
		if (result.body) {
			const r = Readable.from(result.body as unknown as Parameters<typeof Readable.from>[0]);
			return r.pipe(res);
		}
		return res.end();
	};

	// End of our proxying
	let jsonResponse: Record<string, unknown> | undefined;
	if (result.status !== 200) return continueWithResult();

	if (apiEndpoint === "b2_upload_file" || apiEndpoint === "b2_finish_large_file") {
		try {
			jsonResponse = await result.json();
			if (!jsonResponse) throw new Error("Must be a json response");
		} catch (error) {
			console.error(`Error parsing '${apiEndpoint}' response body: `, error);
			return continueWithResult();
		}

		const fileId = jsonResponse.fileId;
		const fileName = jsonResponse.fileName;
		const bucketId = jsonResponse.bucketId;
		const fileSize = Number.parseInt(`${jsonResponse.contentLength}`);

		if (
			Number.isNaN(fileSize) || typeof fileId !== "string" || typeof fileName !== "string" ||
			typeof bucketId !== "string"
		) {
			console.error(`Malformed response body from '${apiEndpoint}': `, jsonResponse);
			return continueWithResult();
		}

		const bucketName = getBucketName(bucketId);
		const fileOptions = {
			id: fileId, name: fileName, bucket: bucketName, size: fileSize,
		};

		// todo: notify google cloud func about user content generation
		console.debug("File created: ", fileOptions);
	}

	return continueWithResult();
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
