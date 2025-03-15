import React from "react";
import Card from "react-bootstrap/Card";
import CardBody from "react-bootstrap/CardBody";
import CardFooter from "react-bootstrap/CardFooter";
import CardTitle from "react-bootstrap/CardTitle";
import { Button } from "../Button";
import { Formik, FormikConfig, FormikProps, FormikValues } from "formik";
import Form from "react-bootstrap/Form";
import { Variant } from "react-bootstrap/types";
import { mergeNames } from "../../utils/mergeNames";
import CardHeader from "react-bootstrap/CardHeader";

export const CardicForm: <T extends FormikValues> (props: FormikConfig<T> & CardicFormProps<T>) => JSX.Element = ({
	className,
	state,
	headerText,
	primaryText,
	subsidiaryText,
	footerText,
	submitText = "Save",
	variant,
	preventSubmit,
	actions,
	children,
	...rest
}) => {
	return <Card className={className} border={variant}>
		<Formik {...rest}>
			{(formikProps) => <Form noValidate onSubmit={formikProps.handleSubmit}>
				{headerText && <CardHeader>{headerText}</CardHeader>}
				<CardBody className={"py-4"}>
					{primaryText && <CardTitle className={mergeNames(!subsidiaryText && "mb-3")}>{primaryText}</CardTitle>}
					{subsidiaryText && <p className={mergeNames(!children && "mb-0")}>{subsidiaryText}</p>}
					{typeof children === "function" ? children(formikProps) : children}
				</CardBody>
				<CardFooter className={mergeNames("d-flex flex-row align-items-center", variant && "border-" + variant)}>
					{footerText && <p className={"d-block me-2 mb-0 text-muted text-wrap"}>
						{footerText}
					</p>}
					<div className={"d-flex flex-row ms-auto"}>
						{typeof actions === "function" ? actions(formikProps) : actions}
						<Button
							variant={variant ? variant : "outline-primary"}
							type={"submit"}
							state={state}
							disabled={(typeof preventSubmit === "function" ? preventSubmit(formikProps) : preventSubmit) || Object.values(formikProps.errors).some(v => !!v)}
						>
							{submitText}
						</Button>
					</div>
				</CardFooter>
			</Form>}
		</Formik>
	</Card>;
};

export type CardicFormProps<Values extends FormikValues> = FormikConfig<Values> & {
	className?: string,
	headerText?: React.ReactNode,
	primaryText?: React.ReactNode,
	subsidiaryText?: React.ReactNode,
	footerText?: React.ReactNode,
	submitText?: React.ReactNode,
	actions?: ((props: FormikProps<Values>) => React.ReactNode) | React.ReactNode,
	variant?: Variant,
	state?: "none" | "loading",
	preventSubmit?: ((props: FormikProps<Values>) => boolean) | boolean,
};
