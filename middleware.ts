/* eslint-disable @next/next/no-server-import-in-page */
import { NextRequest } from "next/server";
import { initMiddleware } from "./middlewares/init";
import shortlinkHandler from "./middlewares/shortlinks";

export async function middleware(request: NextRequest) {
	initMiddleware();
	return shortlinkHandler(request);
}

export const config = {
	matcher: ["/s/:id*"],
};
