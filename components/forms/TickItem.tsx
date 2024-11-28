import { mergeNames } from "@/utils/mergeNames";
import { useField } from "formik";
import React from "react";
import Feedback from "react-bootstrap/Feedback";
import FormCheck from "react-bootstrap/FormCheck";
import FormCheckInput, { FormCheckInputProps } from "react-bootstrap/FormCheckInput";
import FormCheckLabel from "react-bootstrap/FormCheckLabel";

export const TickItem: React.FunctionComponent<TickItemProps> = ({
	className,
	type="checkbox",
	children,
	...rest
}) => {
	const [ fieldProps, meta ] = useField(rest);

	return <FormCheck className={mergeNames("tick-item", className)}>
		<FormCheckInput 
			type={type} 
			isInvalid={meta.touched && !!meta.error}
			{...(meta.initialValue && { defaultChecked: meta.initialValue === rest.value })}
			{...fieldProps}
			{...rest}
		/>
		<FormCheckLabel className="w-100" htmlFor={rest.id}>{children}</FormCheckLabel>
		<Feedback type="invalid">{meta.error}</Feedback>
	</FormCheck>;
};

export type TickItemProps = FormCheckInputProps & {
	name: string,
	type?: "checkbox" | "radio"
};
