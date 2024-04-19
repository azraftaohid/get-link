import { getToken } from "firebase/app-check";
import { FetchError } from "./errors/FetchError";
import { requireAppCheck } from "./firebase";
import { getHttpEndpoint } from "./functions";
import { Region } from "./region";
import { DOMAIN } from "./urls";

export async function makeShortlink(path: string) {
	const token = await getToken(requireAppCheck(), false);
	const res = await fetch(getHttpEndpoint("shortlinks-require", Region.ASIA_SOUTH_1), {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-Firebase-AppCheck": token.token,
		},
		body: JSON.stringify({
			path
		}),
	});

	const resText = await res.text();
	if (res.status !== 200) throw new FetchError(res.status, resText);

	const data: Shortlink = JSON.parse(resText);
	return DOMAIN + data.path;
}

interface Shortlink {
	path: string,
}
