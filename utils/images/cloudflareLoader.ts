import { ImageLoader } from "next/image";
import { DOMAIN } from "../urls";

const CF_IMAGE_ZONE = process.env.CF_IMAGE_ZONE || DOMAIN.replace("https://", "");

const normalizeSrc = (src: string) => {
    return src.startsWith("/") ? DOMAIN + src : src;
};

// Docs: https://developers.cloudflare.com/images/transform-images
const cloudflareLoader: ImageLoader = ({ src, width, quality }) => {
	const params = [`width=${width}`, `quality=${quality || 75}`, "format=auto"];
	const optionsSeg = params.join(",");
	const srcSeg = normalizeSrc(src);

	if (process.env.NODE_ENV === "development") {
		console.debug(`[cloudflareLoader] options: ${optionsSeg}, src: ${srcSeg}`);
		const url = new URL(srcSeg);
		url.searchParams.set("ignored_params", optionsSeg);

		return url.toString();
	}
	return `https://${CF_IMAGE_ZONE}/cdn-cgi/image/${optionsSeg}/${srcSeg}`;
};

export default cloudflareLoader;
