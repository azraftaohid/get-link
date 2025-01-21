import { DEFAULT_LINK_VALIDITY_MS } from "@/models/links";
import { quantityString } from "@/utils/quantityString";
import { Millis } from "@thegoodcompany/common-utils-js";
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
		<ProgressBar now={(storageCurrent / (storageLimit || 1)) * 100} />
		<small>{formatSize(storageCurrent)} of {formatSize(storageLimit)} used</small>
		<hr />
		<p className="fs-5 fw-bold">Limits</p>
		<p className="mb-0">File size: {interpretlimit(quotas.storage?.filesize?.limit, n => `${formatSize(n)} per file`)}</p>
		<p className="mb-0">File limit: {quotas.filedocs?.write?.limit ? "No limits" : interpretlimit(quotas.links?.inlinefids?.limit, n => `${n} files per link`)}</p>
		<p>Link validity: {interpretlimit(quotas.links?.validity?.limit || DEFAULT_LINK_VALIDITY_MS, (n => {
			const days = new Millis(n).toDays().value;
			return `${days} ${quantityString("day", "days", days)}`;
		}))}</p>
	</div>;
};

export interface QuotaOverviewProps extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
	quotas: Quotas,
}
