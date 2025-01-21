import { useField } from "formik";
import Feedback from "react-bootstrap/Feedback";
import FormGroup from "react-bootstrap/FormGroup";
import FormLabel from "react-bootstrap/FormLabel";
import FormSelect, { FormSelectProps } from "react-bootstrap/FormSelect";
import FormText from "react-bootstrap/FormText";

export const SelectField: React.FunctionComponent<SelectFieldProps> = ({
	label,
	size,
	helperText,
	children,
	...rest
}) => {
	const [fieldProps, meta] = useField(rest);

	return <FormGroup>
		{label && <FormLabel htmlFor={rest.id}>{label}</FormLabel>}
		<FormSelect isInvalid={meta.touched && !!meta.error} {...fieldProps} {...rest} size={size}>
			{children}
		</FormSelect>;
		{helperText && <FormText id={`helpblock-${fieldProps.name}`}>{helperText}</FormText>}
		<Feedback type="invalid">{meta.error}</Feedback>
	</FormGroup>;
};

export interface SelectFieldProps extends FormSelectProps {
	name: string,
	label?: React.ReactNode,
	helperText?: React.ReactNode,
}
