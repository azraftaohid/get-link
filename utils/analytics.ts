import { nanoid } from "nanoid";

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