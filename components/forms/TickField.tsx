import { mergeNames } from "@/utils/mergeNames";
import React, { PropsWithChildren } from "react";
import FormGroup, { FormGroupProps } from "react-bootstrap/FormGroup";
import FormLabel from "react-bootstrap/FormLabel";

export const TickField: React.FunctionComponent<TickFieldProps> = ({
	className,
	label,
	children,
	...rest
}) => {
	return <FormGroup className={mergeNames("tick-group", className)} {...rest}>
		{label && <FormLabel>{label}</FormLabel>}
		{children}
	</FormGroup>;
};

export type TickFieldProps = PropsWithChildren<{
	label?: React.ReactNode,
} & FormGroupProps>;
