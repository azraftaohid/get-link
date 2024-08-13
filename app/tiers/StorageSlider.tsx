"use client";

import React, { useEffect, useState } from "react";
import FormControl from "react-bootstrap/FormControl";
import FormGroup, { FormGroupProps } from "react-bootstrap/FormGroup";
import FormLabel from "react-bootstrap/FormLabel";
import FormText from "react-bootstrap/FormText";

export const StorageSlider: React.FunctionComponent<StorageSliderProps> = ({
	freeLimitGb = 20,
	pricingRateBdt = 1.4,
	onSettled,
	...rest
}) => {
	const [value, setValue] = useState(freeLimitGb);
	const [effValue, setEffValue] = useState(value);

	const cost = +(pricingRateBdt * Math.max(0, value - freeLimitGb)).toFixed(2);

	useEffect(() => {
		onSettled?.([cost, effValue]);
	}, [effValue, cost, onSettled]);

	return <FormGroup {...rest}>
		<FormLabel>Reserved storage (GB)</FormLabel>
		<FormControl
			name="storage"
			type="number"
			value={value}
			min={freeLimitGb}
			max={5120}
			step={10}
			onChange={evt => {
				setValue(+evt.currentTarget.value);
			}}
			onBlur={(evt) => {
				const newValue = Math.max(freeLimitGb, +evt.currentTarget.value);
				setEffValue(newValue);
				setValue(newValue);
			}}
		/>
		<FormText>{value > freeLimitGb
			? <>Price: {cost} BDT</>
			: <>First {freeLimitGb} GB at zero cost, then 1.4 BDT/GB increased</>}</FormText>
	</FormGroup>;
};

export interface StorageSliderProps extends FormGroupProps {
	freeLimitGb?: number,
	pricingRateBdt?: number,
	onSettled?: (costAndReservationGb: [number, number]) => unknown;
}
