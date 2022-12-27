export enum UserSnapshotField {
	UID = "uid",
}

export interface UserSnapshot {
	[UserSnapshotField.UID]?: string;
}
