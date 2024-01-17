import { NextApiHandler } from "next";

const handler: NextApiHandler = async (req, res) => {
	res.write("abc");
	res.write("def");
	res.status(200).end("ghi");
};

export default handler;
