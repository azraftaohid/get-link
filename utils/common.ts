import { GetStaticPropsResult } from "next";
import { LinkStatus } from "../models/links";
import { AuthStatus } from "./auths";
import { FilesStatus } from "./files";

export const hasWindow = typeof window !== "undefined";

export const notFound: GetStaticPropsResult<any> = {
	notFound: true,
};

export function isLocalHost() {
	return typeof window !== "undefined" && 
		(window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
}

export type StatusCode = AuthStatus | FilesStatus | LinkStatus | "page:redirecting";
