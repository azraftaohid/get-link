import React, { useContext } from "react";
import { mergeNames } from "../../utils/mergeNames";
import { Conditional } from "../Conditional";
import Link from "../Link";
import { BatchUploadContext } from "./BatchUploadWrapper";

export const BatchUploadProgress: React.FunctionComponent<BatchUploadProgressProps> = ({
	className,
	redirectUrl,
	...rest
}) => {
	const { status, completedCount, files } = useContext(BatchUploadContext);
	
	return <Conditional in={files.length > 0}>
		<p className={mergeNames("mb-2", className)} {...rest}>
			{redirectUrl ? <Link variant="reset" href={redirectUrl}>Redirecting&hellip;</Link>
			: status?.includes("auth:signing-in")
			? <>Signing in&hellip;</>
			: `Uploading (${completedCount}/${files.length})`}
		</p>
		<hr className="mt-1 mb-3" />
	</Conditional>;
};

export type BatchUploadProgressProps = React.DetailedHTMLProps<React.HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement> & {
	redirectUrl?: string,
};
