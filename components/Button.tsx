import React from "react";
import BSButton, { ButtonProps as BSButtonProps } from "react-bootstrap/Button";
import { mergeNames } from "../utils/mergeNames";

export const Button: React.FunctionComponent<ButtonProps> = ({ className, left, right, children, ...rest }) => {
	return <BSButton className={mergeNames("d-flex flex-row gap-1 align-items-center", className)} {...rest}>
		{left}
		{children}
		{right}
	</BSButton>;
};

export interface ButtonProps extends BSButtonProps {
	left?: React.ReactNode,
	right?: React.ReactNode,
	download?: string | boolean,
}