import { NextApiHandler } from "next";

const handler: NextApiHandler = async (req, res) => {
	if (req.query.apikey !== process.env.API_KEY) {
		return res.status(401).json({ message: "Unauthorized request." });
	}

	const path = req.query.path;
	if (typeof path !== "string" || !path.startsWith("/") || path.length >= 1024) {
		return res.status(400).json({ message: `Query parameter 'path' is invalid, received ${path}` });
	}

	try {
		await res.revalidate(path);
		return res.status(200).json({ revalidated: true });
	} catch (error) {
		console.error(`Error revalidating page [cause: ${error}]`);
		return res.status(500).json({ message: "Revalidate falied due to an internal error." });
	}
};

export default handler;
