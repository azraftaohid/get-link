/**
 * `abc.xyz' -> '.xyz'
 */
export function extractExtension(name: string) {
	const i = name.lastIndexOf(".");
	return i !== -1 && i + 1 < name.length ? name.substring(i) : "";
}


export function extractDisplayName(fileName: string) {
	const i = fileName.lastIndexOf(".");
	return i !== -1 ? fileName.substring(0, i) : fileName;
}

export function formatSize(bytes: number) {
	return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}