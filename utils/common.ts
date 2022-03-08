import { GetStaticPropsResult } from "next";
import { AuthStatus } from "./auths";
import { FilesStatus } from "./files";

export const hasWindow = typeof window !== "undefined";

export const notFound: GetStaticPropsResult<any> = {
	notFound: true,
};

export type StatusCode = AuthStatus | FilesStatus;