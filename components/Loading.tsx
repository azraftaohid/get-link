import React from "react";
import Spinner, { SpinnerProps } from "react-bootstrap/Spinner";
import Stack, { StackProps } from "react-bootstrap/Stack";

export const Loading: React.FunctionComponent = () => {
	return <Stack>
		<Spinner className="mx-auto" animation="border" />
		<p className="text-center mt-2">Please wait...</p>
	</Stack>;
};

export interface LoadingProps extends StackProps {
	loadingText?: string,
	loadingTextProps?: JSX.IntrinsicElements["p"],
	spinnerProps?: SpinnerProps,
}