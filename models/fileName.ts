export enum FileNameField {
	DISPLAY = "display",
}

export interface FileName {
	[FileNameField.DISPLAY]?: string;
}
