import { NextApiHandler } from "next";
import { initFirebase } from "../../utils/firebase";
import { getHttpEndpoint } from "../../utils/functions";
import { Region } from "../../utils/region";

const handler: NextApiHandler = async (req, res) => {
	if (req.method !== "GET" && req.method !== "HEAD") {
		return res.status(405).json({ message: "Must be a GET or HEAD request." });
	}

	const data = {...req.body, ...req.query};
	const lid = data.lid;

	if (typeof lid !== "string") {
		return res.status(400).json({ message: "Parameter 'lid' must be a valid link ID (string)." });
	}

	initFirebase();

	let result: ExportLinkResponseData;
	let response: Response;
	try {
		const exportEndPoint = getHttpEndpoint("export-link", Region.ASIA_SOUTH_1);
		console.debug(`Export HTTP endpoint: ${exportEndPoint}`);
	
		response = await fetch(exportEndPoint, {
			headers: {
				"Content-Type": "application/json",
			},
			method: "POST",
			body: JSON.stringify({ lid } as ExportLinkRequestData),
		});
	
		result = await response.json();
	} catch (error) {
		console.error("Error using fetch to invoke export-link func: ", error);
		return res.status(500).json({ message: "Unable to initiate the link export operation. Try again after some times." });
	}

	const cacheControl = response.headers.get("Cache-Control") || "public, s-maxage=60, max-age=0, must-revalidate";
	return res.setHeader("Cache-Control", cacheControl)
		.status(response.status)
		.json(result);
};

export default handler;

export interface ExportLinkResponseData {
	docId: string,
}

export interface ExportLinkRequestData {
	lid?: unknown,
}

