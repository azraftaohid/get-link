import React from "react";

export const ViewHeader: React.FunctionComponent<ViewHeaderProps> = ({
	primaryText,
	secondaryText,
	tertiaryText,
	actions,
}) => {
	return <>
		<div className="vstack">
			<h1 className="text-break">{primaryText}</h1>
			<div className="d-flex align-items-top">
				<div>
					<p className="text-wrap mb-0">{secondaryText}</p>
					<small className="text-muted mb-0">{tertiaryText}</small>
				</div>
				<div className="d-flex flex-row ms-auto my-auto ps-2">
					{actions}
				</div>
			</div>
		</div>
		<hr className="mb-4" />
	</>;
};

export interface ViewHeaderProps {
	primaryText: React.ReactNode,
	secondaryText: React.ReactNode,
	tertiaryText: React.ReactNode,
	actions: React.ReactNode,
}
