import React from "react";
import Card from "react-bootstrap/Card";
import { FileControl, FileControlProps } from "./FileControl";
import { FileView, FileViewProps } from "./FileView";

export const FileCard: React.FunctionComponent<FileCardProps> = ({
	directLink,
	placeholderUrl,
	size,
	type,
	width,
	height,
	name,
	isOwner,
	stepOutDownload
}) => {
	return <Card className="border-feedback">
		<FileView
			src={directLink}
			placeholderUrl={placeholderUrl}
			size={size}
			type={type}
			width={width}
			height={height}
		/>
		<FileControl
			className="card-footer"
			directLink={directLink}
			name={name}
			isOwner={isOwner}
			size={size}
			stepOutDownload={stepOutDownload} />
	</Card>;
};

export type FileCardProps = Pick<FileViewProps, "placeholderUrl" | "size" | "type" | "width" | "height"> &
	Pick<FileControlProps, "directLink" | "name" | "isOwner" | "stepOutDownload">;
