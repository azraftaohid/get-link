import { NextApiHandler } from "next";
import { Readable } from "stream";
import { now } from "../../../utils/dates";
import { isTimeoutError } from "../../../utils/errors/utils";
import { formatSize } from "../../../utils/strings";
import { B2_API_URL } from "./[...slug]";

const handler: NextApiHandler = async (req, res) => {
	const { bucketName, fileName } = { ...req.body, ...req.query } as Record<string, unknown>;
	if (typeof bucketName !== "string" || typeof fileName !== "string") {
		return res.status(400).json({
			status: 400,
			code: "bad_request",
			message: "Parameter bucketName and/or fileName are missing or invalid.",
		});
	}

	const startTime = now();
	let fileHeaders: Headers;
	try {
		const result = await fetch(`https://f003.backblazeb2.com/file/${bucketName}/${fileName}`, {
			method: "HEAD",
		});

		if (result.status === 404) return res.status(404).json({
			status: 404,
			code: "not_found",
			message: "",
		});

		fileHeaders = result.headers;
	} catch (error) {
		console.error("B2 head file failed: ", error);
		if (isTimeoutError(error)) res.status(504);
		else res.status(502);

		return res.json({
			status: res.statusCode,
			code: "gateway_preli_failed",
			message: "Head file request failed.",
		});
	}

	const fileId = fileHeaders.get("x-bz-file-id");
	const size = Number.parseInt(fileHeaders.get("content-length") || "");

	if (typeof fileId !== "string" || Number.isNaN(size)) return res.status(502).json({
		status: 502,
		code: "gateway_preli_failed",
		message: "Malformed file headers received.",
	});

	let result: Response;
	try {
		result = await fetch(`${B2_API_URL}/b2api/v2/b2_delete_file_version`, {
			method: "POST",
			headers: {
				...(req.headers.authorization && { authorization: req.headers.authorization })
			},
			body: JSON.stringify({
				fileName, fileId,
			}),
		});
	} catch (error) {
		console.error("B2 delete file failed: ", error);
		if (isTimeoutError(error)) res.status(504);
		else res.status(502);

		return res.json({
			status: res.statusCode,
			code: "gateway_failed",
			message: "Delete operation failed.",
		});
	}

	if (result.status === 200) {
		// todo: notify google cloud func about user content deletion
		console.debug(`File deleted (${formatSize(size)}) [api: delete_file; status: ${result.status}; took: ${now() - startTime}ms]`);
	}

	res.status(result.status);
	result.headers.forEach((value, key) => res.setHeader(key, value));

	if (result.body) {
		const r = Readable.from(result.body as unknown as Parameters<typeof Readable.from>[0]);
		return r.pipe(res);
	}
	return res.end();
};

export default handler;
