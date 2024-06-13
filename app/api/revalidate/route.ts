import { revalidatePath } from "next/cache";
import { NextRequest } from "next/server";

export const revalidate = 1;

export async function POST(req: NextRequest) {
	const search = req.nextUrl.searchParams;
	const apiKey = search.get("apikey");
	
	if (apiKey !== process.env.API_KEY) {
		return new Response(JSON.stringify({
			message: "Unauthorized request.",
		}), {
			status: 401,
		});
	}

	const path = search.get("path");
	if (typeof path !== "string" || !path.startsWith("/") || path.length >= 1024) {
		return new Response(JSON.stringify({
			message: `Query parameter 'path' is invalid, received ${path}`,
		}), {
			status: 400,
		});
	}

	try {
		revalidatePath(path, "page");
		return Response.json({ revalidated: true });
	} catch (error) {
		console.error("Error revalidating page:", error);
		return new Response(JSON.stringify({
			message: "Revalidation failed due to an internal error.",
		}), {
			status: 500,
		});
	}
}


export async function GET(req: NextRequest) {
	return POST(req);
}
