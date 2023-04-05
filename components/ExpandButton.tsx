import React from "react";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import { mergeNames } from "../utils/mergeNames";
import { Button, ButtonProps } from "./Button";

export const ExpandButton: React.FunctionComponent<React.PropsWithChildren<ExpandButtonProps>> = ({
	className,
	children,
	...rest
}) => {
	return <Row>
		<Col className="mx-auto" md={5}>
			<Button
				className={mergeNames("w-100 justify-content-center", className)}
				variant="outline-secondary"
				{...rest}
			>
				{children}
			</Button>
		</Col>
	</Row>;
};

export interface ExpandButtonProps extends ButtonProps {

}
