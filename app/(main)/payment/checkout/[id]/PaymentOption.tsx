import { Icon } from "@/components/Icon";
import { Image } from "@/components/Image";
import React from "react";
import Stack from "react-bootstrap/Stack";

export const PaymentOption: React.FunctionComponent<PaymentOptionProps> = ({
	logo,
	icon,
	title,
	caption
}) => {
	return <div className="d-flex align-items-start gap-3">
		{logo && <Image
			srcLight={`/image/payment-vendor/${logo}-dark.svg`}
			srcDark={`/image/payment-vendor/${logo}-light.svg`}
			width={24}
			height={24}
			alt={`${title}-icon`}
			style={{
				width: "auto",
				height: 24,
			}}
		/>}
		{icon && <Icon name={icon} />}
		<Stack direction="vertical" gap={0}>
			<p className="mb-0 mt-n1 lead">{title}</p>
			<p className="mb-0">{caption}</p>
		</Stack>
	</div>;
};

export type PaymentOptionProps = {
	title: React.ReactNode,
	caption?: React.ReactNode
} & ({
	logo: string,
	icon?: never,
} | {
	logo?: never,
	icon: string,
})
