import { NextApiHandler } from "next";
import { ExportLinkResponseData, initiateLinkExport } from "../../utils/exports";

const handler: NextApiHandler = async (req, res) => {
	const data = {...req.body, ...req.query};
	const lid = data.lid;

	if (typeof lid !== "string") {
		return res.status(400).json({ message: "Parameter 'lid' must be a valid link ID (string)." });
	}

	let result: ExportLinkResponseData;
	let response: Response;
	try {
		[result, response] = await initiateLinkExport(lid);
	} catch (error) {
		return res.status(500).json({ message: "Unable to initiate the link export operation. Try again after some times." });
	}

	const cacheControl = response.headers.get("Cache-Control") || `public, s-maxAge=${60}, max-age=${60}, must-revalidate`;
	return res.setHeader("Cache-Control", cacheControl)
		.status(200)
		.json(result);
};

export default handler;
