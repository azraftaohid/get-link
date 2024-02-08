import { Quotas } from "./quotas";

export const COLLECTION_USERS = "users";

export enum UserField {
	QUOTAS = "quotas",
}

export interface UserData {
	[UserField.QUOTAS]?: Quotas,
}

export enum UserSnapshotField {
	UID = "uid",
}

export interface UserSnapshot {
	[UserSnapshotField.UID]?: string;
}
