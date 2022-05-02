import React from "react";
import BSButton, { ButtonProps as BSButtonProps } from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import { mergeNames } from "../utils/mergeNames";

export const Button: React.FunctionComponent<React.PropsWithChildren<ButtonProps>> = ({ className, left, right, state, children, ...rest }) => {
	return <BSButton className={mergeNames("d-flex flex-row gap-1 align-items-center", className)} {...rest}>
		{state !== "loading" ? left : <Spinner as="span" role="status" animation="border" size="sm" aria-hidden />}
		{children}
		{right}
	</BSButton>;
};

export interface ButtonProps extends BSButtonProps {
	left?: React.ReactNode,
	right?: React.ReactNode,
	download?: string | boolean,
	state?: "none" | "loading",
}