import React from "react";
import Container, { ContainerProps } from "react-bootstrap/Container";
import styles from "../styles/page-content.module.scss";
import { mergeNames } from "../utils/mergeNames";

export const PageContent: React.FunctionComponent<PageContentProps> = ({ className, size="xl", children, ...rest }) => {
	return <Container className={mergeNames("page-content", styles.pageContent, `py-4 mw-${size}`, className)} fluid={size} {...rest}>
		{children}
	</Container>;
};

export interface PageContentProps extends ContainerProps {
	size?: "xl" | "lg" | "md",
}