import React from "react";
import { copyToClipboard } from "../utils/system";
import { useToast } from "../utils/useToast";
import { Button, ButtonProps } from "./Button";

export const CopyButton: React.FunctionComponent<CopyButtonProps> = ({ content, onClick, children, ...rest }) => {
	const { makeToast } = useToast();
	return <Button variant="outline-secondary" onClick={async evt => {
		onClick?.(evt);
		try {
			await copyToClipboard(content);
			makeToast("Copied");
		} catch (error) {
			makeToast("Couldn't copy text!", "error");
		}
	}} {...rest}>
		{children}
	</Button>;
};

interface CopyButtonProps extends ButtonProps {
	content: string
}