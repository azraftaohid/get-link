export enum NameField {
	SURNAME = "surname",
}

export interface Name {
	[NameField.SURNAME]?: string | null;
}
