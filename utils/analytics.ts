import { getAnalytics, logEvent } from "firebase/analytics";
import { nanoid } from "nanoid";
import { Theme } from "./theme";

export const KEY_EID = "experience.id";
export const KEY_SID = "experience.sid";

export function acquireExperienceOptions() {
	let eid = localStorage.getItem(KEY_EID);
	if (!eid) {
		eid = nanoid(10);
		localStorage.setItem(KEY_EID, eid);
	}

	let sid = sessionStorage.getItem(KEY_SID);
	if (!sid) {
		sid = nanoid();
		sessionStorage.setItem(KEY_SID, sid);
	}

	return { eid, sid };
}

export function logClick(btnId: ButtonId, ctx?: ClickEventContext) {
	const params: ClickEventParams = { ...ctx, button_id: btnId };
	logEvent(getAnalytics(), "click", params);
}

export type ButtonId = "download" | "toggle_theme" | "delete" | "delete_file" | "share" | "share_file_card";

export interface ClickEventParams extends ClickEventContext {
	button_id: string;
}

export interface ClickEventContext {
	mechanism?: "built-in" | "browser_default";
	status?: "failed" | "succeed" | "canceled";
	to?: Theme;
}
