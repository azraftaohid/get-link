import { NextApiHandler } from "next";

const handler: NextApiHandler = async (req, res) => {
	if (req.query.apikey !== process.env.API_KEY) {
		return res.status(401).json({ message: "Unauthorized request." });
	}

	const path = req.query.path;
	if (typeof path !== "string") return res.status(400).json({ message: "Query parameter 'path' is invalid." });

	try {
		await res.revalidate(path);
		return res.status(200).json({ revalidated: true });
	} catch (error) {
		console.error(`error revalidating page [cause: ${error}]`);
		return res.status(500).send("Revalidate falied due to an internal error.");
	}
};

export default handler;
