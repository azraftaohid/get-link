export function compressImage(url: string, width = 1200, quality = 75) {
	// Encode url value because the Metadata API converts https:// to https:/
	return `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=${quality}`;
}
