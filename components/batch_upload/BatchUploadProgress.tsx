import React, { useContext } from "react";
import { mergeNames } from "../../utils/mergeNames";
import { Conditional } from "../Conditional";
import Link from "../Link";
import { BatchUploadContext } from "./BatchUpload";

export const BatchUploadProgress: React.FunctionComponent<BatchUploadProgressProps> = ({
	className,
	redirectUrl,
	...rest
}) => {
	const { status, completedCount, files } = useContext(BatchUploadContext);
	
	return <Conditional in={files.length > 0}>
		<p className={mergeNames("mb-3", className)} {...rest}>
			{redirectUrl ? <Link variant="reset" href={redirectUrl}>Redirecting&hellip;</Link>
			: status?.includes("auth:signing-in")
			? <>Signing in&hellip;</>
			: `Uploading (${completedCount}/${files.length})`}
		</p>
	</Conditional>;
};

export type BatchUploadProgressProps = React.DetailedHTMLProps<React.HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement> & {
	redirectUrl?: string,
};
