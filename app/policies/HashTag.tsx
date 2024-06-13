"use client";

import { Icon } from "@/components/Icon";
import { copyToClipboard } from "@/utils/system";
import { DOMAIN, createAbsoluteUrl } from "@/utils/urls";
import { useToast } from "@/utils/useToast";

export const HashTag: React.FunctionComponent<React.PropsWithChildren<{ tag: string }>> = ({ tag }) => {
	const { makeToast } = useToast();

	return (
		<Icon
			role="button"
			className="alive ms-2 d-print-none"
			name="link"
			size="lg"
			tabIndex={1}
			onClick={async () => {
				try {
					await copyToClipboard(createAbsoluteUrl(DOMAIN, `policies#${tag}`));
					makeToast("Url with hash copied.");
				} catch (error) {
					makeToast("Failed to copy Url", "error");
				}
			}}
		/>
	);
};
