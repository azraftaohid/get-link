/* eslint-disable @next/next/no-server-import-in-page */
import { NextRequest, NextResponse } from "next/server";
import { FetchError } from "../utils/errors/FetchError";
import { Region } from "../utils/region";
import { getHttpEndpoint } from "./functions";

async function getShortlinkData(id: string) {
	const res = await fetch(getHttpEndpoint("shortlinks-getdata", Region.ASIA_SOUTH_1) + "?id=" + id, {
		method: "GET"
	});

	const resText = await res.text();
	if (res.status !== 200) throw new FetchError(res.status, resText);

	const data: ShortlinkData = JSON.parse(resText);
	return data;
}

export default async function handler(request: NextRequest) {
	console.info("Processing shortlink via middleware:", request.nextUrl.pathname);

	const id = request.nextUrl.pathname.split("/s/")[1];
	
	let data: ShortlinkData;
	try {
		data = await getShortlinkData(id);
	} catch (error) {
		console.error("Get shortlink data failed:", error);
		return NextResponse.error();
	}

	const target = data?.target?.path;
	if (typeof target !== "string") return NextResponse.error();

	return NextResponse.redirect(new URL(target, request.url), { status: 308 });
}

interface ShortlinkData {
	target?: {
		path?: string,
	},
}
