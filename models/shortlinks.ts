export enum ShortlinkField {
	TARGET = "target",
}

export enum ShortlinkTargetField {
	PATH = "path",
}

export const COLLECTION_SHORTLINK = "shortlinks";

export interface ShortlinkTarget {
	[ShortlinkTargetField.PATH]?: string,
}

export interface ShortlinkData {
	[ShortlinkField.TARGET]?: ShortlinkTarget,
}
