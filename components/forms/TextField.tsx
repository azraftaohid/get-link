import { FieldHookConfig, useField } from "formik";
import React from "react";
import FormControl, { FormControlProps } from "react-bootstrap/FormControl";
import FormGroup from "react-bootstrap/FormGroup";
import FormLabel from "react-bootstrap/FormLabel";
import FormText from "react-bootstrap/FormText";
import { BsPrefixRefForwardingComponent } from "react-bootstrap/helpers";

const TextField: BsPrefixRefForwardingComponent<"input", TextFieldProps> = ({
	className,
	label,
	helperText,
	...rest
}) => {
	const [ fieldProps, meta ] = useField(rest as unknown as FieldHookConfig<unknown>);

	return <FormGroup className={className} controlId={fieldProps.name}>
		{label && <FormLabel>{label}</FormLabel>}
		{/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
		<FormControl isInvalid={meta.touched && !!meta.error} {...fieldProps} {...rest as any} />
		{helperText && <FormText id={`helpblock-${fieldProps.name}`}>{helperText}</FormText>}
		<FormControl.Feedback type="invalid">{meta.error}</FormControl.Feedback>
	</FormGroup>;
};

export default TextField;

export interface TextFieldProps extends FormControlProps {
	name: string,
	label?: React.ReactNode,
	helperText?: React.ReactNode,
}
