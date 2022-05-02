import React from "react";
import Collapse, { CollapseProps } from "react-bootstrap/Collapse";

export const Conditional: React.FunctionComponent<React.PropsWithChildren<ConditionalProps>> = ({ direction = "vertical", children, ...rest }) => {
	return <Collapse dimension={direction === "horizontal" ? "width" : "height"} {...rest}><div>
		{children}
	</div></Collapse>;
};

export interface ConditionalProps extends Omit<CollapseProps, "children" | "dimension"> {
	direction?: "horizontal" | "vertical",
}