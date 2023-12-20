import { NextApiHandler } from "next";
import { initiateLinkExport } from "../../utils/exports";

const handler: NextApiHandler = async (req, res) => {
	const data = {...req.body, ...req.query};
	const lid = data.lid;

	if (typeof lid !== "string") {
		return res.status(400).json({ message: "Parameter 'lid' must be a valid link ID (string)." });
	}

	try {
		const result = await initiateLinkExport(lid);
		return res.status(200).json(result);
	} catch (error) {
		return res.status(500).json({ message: "Unable to initiate the link export operation. Try again after some times." });
	}
};

export default handler;
