import React from "react";
import styles from "../styles/page-container.module.scss";
import { mergeNames } from "../utils/mergeNames";

export const PageContainer: React.FunctionComponent<React.PropsWithChildren<PageContainerProps>> = ({ className, children, ...rest }) => {
	return <div id="root" className={mergeNames(styles.pageContainer, "d-flex flex-column min-vh-100 h-100", className)} {...rest}>
		{children}
	</div>;
};

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {

}