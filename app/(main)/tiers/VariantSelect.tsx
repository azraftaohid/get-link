import { Tier } from "@/utils/tiers";
import React from "react";
import FormGroup from "react-bootstrap/FormGroup";
import FormLabel from "react-bootstrap/FormLabel";
import FormSelect, { FormSelectProps } from "react-bootstrap/FormSelect";
import FormText from "react-bootstrap/FormText";

export const VariantSelect: React.FunctionComponent<VariantSelectProps> = ({
	variants,
	label = "Choose storage option",
	helperText = "This will be added on top of your existing storage.",
	...rest
}) => {
	return <FormGroup>
		<FormLabel htmlFor={rest.id}>{label}</FormLabel>
		<FormSelect {...rest}>
			{Object.entries(variants).map(([variant, { storageGb }]) => (
				<option key={variant} value={variant}>{storageGb} GB</option>
			))}
		</FormSelect>
		{helperText && <FormText>{helperText}</FormText>}
	</FormGroup>;
};

export interface VariantDescriptor {
	storageGb: number,
}

export interface VariantSelectProps extends FormSelectProps {
	variants: Partial<Record<Tier, VariantDescriptor>>,
	label?: React.ReactNode,
	helperText?: React.ReactNode,
}
