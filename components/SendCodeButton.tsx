import React, { useEffect, useState } from "react";
import { Button, ButtonProps } from "./Button";

export const SendCodeButton: React.FunctionComponent<SendCodeButtonProps> = ({
	sender,
	onSent,
	onSendFailed,
	disabled,
	...rest 
}) => {
	const [state, setState] = useState<"none" | "sending" | "sent">("none");
	const [coolDown, setCoolDown] = useState(0);

	useEffect(() => {
		if (coolDown < 1) return;
		setTimeout(() => setCoolDown(c => Math.max(0, c - 1)), 1000);
	}, [coolDown]);

	return <Button
		variant={state === "none" ? "outline-primary" : "outline-secondary"}
		state={state === "sending" ? "loading" : "none"}
		onClick={async () => {
			setState("sending");
			try {
				await sender?.();
				setState("sent");
				setCoolDown(60);
				onSent?.();
			} catch (error) {
				setState("none");
				onSendFailed?.(error);
			}
		}}
		disabled={coolDown > 0 || state === "sending" || disabled}
		{...rest}
	>
		{(() => {switch (state) {
			case "none": return "Send code";
			case "sending": return "Sending";
			default: return coolDown > 0 ? `Resend (${coolDown}s)` : "Resend";
		}})()}
	</Button>;
};

interface SendCodeButtonProps extends ButtonProps {
	sender?: () => Promise<unknown>,
	onSent?: () => unknown,
	onSendFailed?: (error: unknown) => unknown,
}
