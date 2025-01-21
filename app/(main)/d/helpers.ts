import { ClickEventContext } from "@/utils/analytics";
import { compartDirectLink } from "@/utils/files";

export function makeDownloadParams(
	directLink: string,
	fileName: string | "",
	mechanism: ClickEventContext["mechanism"] = "browser_default"
) {
	try {
		const { path, token } = compartDirectLink(directLink);
		return `name=${fileName}&path=${path}&token=${token}&mechanism=${mechanism}`;
	} catch (error) {
		return `name=${fileName}&dl=${encodeURIComponent(directLink)}&mechanism=${mechanism}`;
	}
}
