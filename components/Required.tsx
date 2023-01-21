import React from "react";

export const Required: React.FunctionComponent<React.PropsWithChildren<unknown>> = () => {
	return <span className="text-danger fst-italic">*</span>;
};
