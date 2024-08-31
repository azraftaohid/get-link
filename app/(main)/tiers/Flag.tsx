import React from "react";
import Badge from "react-bootstrap/Badge";

export const Tba: React.FunctionComponent = () => {
	return <abbr title="To be announced">TBA</abbr>;
};

export const Flag: React.FunctionComponent<FlagProps> = ({
	children
}) => {
	return <Badge bg="secondary" pill>{children}</Badge>;
};

export type FlagProps = React.PropsWithChildren;
