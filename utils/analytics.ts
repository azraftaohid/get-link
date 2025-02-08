import { getAnalytics, logEvent } from "firebase/analytics";
import { nanoid } from "nanoid";
import { SignInAttempts } from "./auths";
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

/**
 * @deprecated Use purpose-based logging functions instead.
 */
export function logClick(btnId: ButtonId, ctx?: ClickEventContext) {
	const params: ClickEventParams = { ...ctx, button_id: btnId };
	logEvent(getAnalytics(), "click", params);
}

export function logDownload(mechanism: DownloadMechanism, status: DownloadStatus) {
	logEvent(getAnalytics(), "download", {
		mechanism, status,
	});
}

export function logThemeSwitch(to: Theme) {
	const date = new Date();
	logEvent(getAnalytics(), "theme_switch", {
		to,
		local_hour: date.getHours().toString().padStart(2, "0"),
	});
}

export function logLogin(method: LoginMethod, type: LoginType, userLinked: boolean, attempts: SignInAttempts) {
	logEvent(getAnalytics(), "login", {
		method,
		login_type: type,
		account_linked: userLinked,
		attempt_number: attempts.accumulated,
		attempt_number_email_link: attempts.emailLink,
		attempt_number_email_otp: attempts.emailOtp,
	});
}

export function logLoginFailure(method: LoginMethod, attempts: SignInAttempts, reason: LoginFailureReason) {
	logEvent(getAnalytics(), "login_failed", {
		method,
		attempt_number: attempts.accumulated,
		attempt_number_email_link: attempts.emailLink,
		attempt_number_email_otp: attempts.emailOtp,
		failure_reason: reason,
	});
}

export function logReauth(method: LoginMethod, attempts: SignInAttempts) {
	logEvent(getAnalytics(), "reauth", {
		method,
		attempt_number: attempts.accumulated,
		attempt_number_email_link: attempts.emailLink,
		attempt_number_email_otp: attempts.emailOtp,
	});
}

export function logReauthFailure(method: LoginMethod, attempts: SignInAttempts, reason: ReauthFailureReason) {
	logEvent(getAnalytics(), "reauth_failed", {
		method,
		attempt_number: attempts.accumulated,
		attempt_number_email_link: attempts.emailLink,
		attempt_number_email_otp: attempts.emailOtp,
		failure_reason: reason,
	});
}

export function logUpdateEmail(method: LoginMethod, attempts: SignInAttempts) {
	logEvent(getAnalytics(), "update_email", {
		method,
		attempt_number: attempts.accumulated,
		attempt_number_email_link: attempts.emailLink,
		attempt_number_email_otp: attempts.emailOtp,
	});
}

export function logUpdateEmailFailure(method: LoginMethod, attempts: SignInAttempts, reason: EmailUpdateFailureReason) {
	logEvent(getAnalytics(), "update_email_failed", {
		method,
		attempt_number: attempts.accumulated,
		attempt_number_email_link: attempts.emailLink,
		attempt_number_email_otp: attempts.emailOtp,
		failure_reason: reason,
	});
}

export function logEmailRecover(method: LoginMethod, attempts: SignInAttempts) {
	logEvent(getAnalytics(), "email_recover", {
		method,
		attempt_number: attempts.accumulated,
		attempt_number_email_link: attempts.emailLink,
		attempt_number_email_otp: attempts.emailOtp,
	});
}

export function logEmailRecoverFailed(method: LoginMethod, attempts: SignInAttempts, reason: EmailRecoverFailureReason) {
	logEvent(getAnalytics(), "email_recover_failed", {
		method,
		attempt_number: attempts.accumulated,
		attempt_number_email_link: attempts.emailLink,
		attempt_number_email_otp: attempts.emailOtp,
		failure_reason: reason,
	});
}

export function logShare(type: ShareLinkType, method: ShareMethod, contentType: ShareContentType) {
	logEvent(getAnalytics(), "share", {
		method,
		link_type: type,
		content_type: contentType,
	});
}

export function logAccordion(action: AccordionAction, target: AccordionTarget) {
	logEvent(getAnalytics(), "accordion_toggle", {
		action,
		target,
	});
}

export type ButtonId = "download" | "toggle_theme" | "delete" | "delete_file" | "share" | "share_file_card";

export type DownloadMechanism = "built-in" | "browser_default";
export type DownloadStatus = "failed" | "succeed" | "canceled";

export type LoginMethod = "email_otp" | "email_link";
export type LoginType = "sign_in" | "sign_up";

export type LoginFailureReason = "invalid_otp" | "otp_expired" | "no_email" | "unexpected" | "undetermined";
export type ReauthFailureReason = LoginFailureReason | "no_user";
export type EmailUpdateFailureReason = LoginFailureReason | "no_user" | "email_already_exists" | "no_new_email" | "no_otp";
export type EmailRecoverFailureReason = "no_oob_code" | "email_already_exists" | "undetermined";

export type ShareLinkType = "shortlink" | "uuid";
export type ShareMethod = "clipboard" | "display";
export type ShareContentType = "file" | "link";

export type AccordionAction = "expand" | "collapse";
export type AccordionTarget = "usage_quota";

export interface ClickEventParams extends ClickEventContext {
	button_id: string;
}

export interface ClickEventContext {
	mechanism?: "built-in" | "browser_default";
	status?: "failed" | "succeed" | "canceled";
	to?: Theme;
}
