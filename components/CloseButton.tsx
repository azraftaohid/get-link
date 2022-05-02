import React from "react";
import BSCloseButton, { CloseButtonProps as BSCloseButtonProps } from "react-bootstrap/CloseButton";
import { mergeNames } from "../utils/mergeNames";

export const CloseButton: React.FunctionComponent<React.PropsWithChildren<CloseButtonProps>> = ({ className, ...rest }) => {
	return <BSCloseButton className={mergeNames("btn-close", className)} {...rest} />;
};

export interface CloseButtonProps extends BSCloseButtonProps {
	variant?: never,
}