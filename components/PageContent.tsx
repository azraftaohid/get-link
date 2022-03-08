import React from "react";
import Container, { ContainerProps } from "react-bootstrap/Container";
import styles from "../styles/page-content.module.scss";
import { mergeNames } from "../utils/mergeNames";

export const PageContent: React.FunctionComponent<PageContentProps> = ({ className, children, ...rest }) => {
	return <Container className={mergeNames("page-content py-4", styles.pageContent, className)} fluid="xl" {...rest}>
		{children}
	</Container>;
};

export interface PageContentProps extends Omit<ContainerProps, "fluid"> {

}