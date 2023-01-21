const PLACEHOLDER_HEIGHT = "_HEIGHT";
const PLACEHOLDER_WIDTH = "_WIDTH";

const svgs: Record<StallContent, string> = {
	image: `<svg xmlns="http://www.w3.org/2000/svg" width="${PLACEHOLDER_WIDTH}px" height="${PLACEHOLDER_HEIGHT}px" viewBox="0 0 24 24"><path d="M0,0H24V24H0Z" fill="none"/><path d="M16.7,7.3v9.4H7.3V7.3h9.4m0-1.3H7.3A1.3,1.3,0,0,0,6,7.3v9.4A1.3,1.3,0,0,0,7.3,18h9.4A1.3,1.3,0,0,0,18,16.7V7.3A1.3,1.3,0,0,0,16.7,6Zm-3.3,5.9-2,2.6L10,12.8,8,15.3h8Z" fill="#6c757d"/></svg>`,
};

export function getStallImage(content: StallContent, width = 192, height = 192) {
	const svg = svgs[content]
		.replace(PLACEHOLDER_WIDTH, width.toString())
		.replace(PLACEHOLDER_HEIGHT, height.toString());

	const base64 = Buffer.from(svg).toString("base64");
	return `data:image/svg+xml;base64,${base64}`;
}

export function getSolidStallImage() {
	return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mPMKa2tBwAEkgHf5d9j9gAAAABJRU5ErkJggg==";
}

export type StallContent = "image";
