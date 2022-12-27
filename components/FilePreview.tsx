import React, { useRef } from "react";
import { mergeNames } from "../utils/mergeNames";
import { formatSize } from "../utils/strings";
import { CloseButton } from "./CloseButton";

export const FilePreview: React.FunctionComponent<React.PropsWithChildren<FilePreviewProps>> = ({
	className,
	file,
	onClose,
	closable,
	...rest
}) => {
	const { current: initClosable } = useRef(closable);

	return (
		<div className={mergeNames("file-preview hstack gap-3 px-3 py-2 rounded", className)} {...rest}>
			<div className="overflow-hidden">
				<p className="d-block text-truncate mw-100 mb-0">{file?.name}</p>
				<small className="text-muted">{formatSize(file?.size || 0)}</small>
			</div>
			{(closable || initClosable) && (
				<div className="d-flex ms-auto">
					<CloseButton className="my-auto" onClick={onClose} disabled={!closable} />
				</div>
			)}
		</div>
	);
};

export interface FilePreviewProps
	extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
	file?: File | null;
	closable?: boolean;
	onClose?: () => unknown;
}
