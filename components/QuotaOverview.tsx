import React from "react";
import ProgressBar from "react-bootstrap/ProgressBar";
import { Quotas, interpretlimit } from "../models/quotas";
import { formatSize } from "../utils/strings";

export const QuotaOverview: React.FunctionComponent<QuotaOverviewProps> = ({
	quotas,
	...rest
}) => {
	const storageCurrent = quotas.storage?.space?.current_usage || 0;
	const storageLimit = quotas.storage?.space?.limit || 0;

	return <div {...rest}>
		<p className="fs-5 fw-bold">Space</p>
		<ProgressBar now={storageCurrent / (storageLimit || 1)} />
		<small>{formatSize(storageCurrent)} of {storageLimit === -1 ? "unlimited" : formatSize(storageLimit)} used</small>
		<hr />
		<p className="fs-5 fw-bold">Limits</p>
		<p className="mb-0">File size: {interpretlimit(quotas.storage?.file_size?.limit, formatSize)}</p>
		<p>File limit: {interpretlimit(quotas.storage?.documents?.write?.limit || quotas.links?.inline_fids.limit)}</p>
	</div>;
};

export interface QuotaOverviewProps extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
	quotas: Quotas,
}
