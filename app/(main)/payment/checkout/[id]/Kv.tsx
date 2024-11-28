import { mergeNames } from "@/utils/mergeNames";
import React, { PropsWithChildren } from "react";

export const KvItem: React.FunctionComponent<KvItemProps> = ({ name, value }) => {
	return <p className="mb-0">
		<strong>{name}:</strong> {value}
	</p>;
};

export const Kv: React.FunctionComponent<KvProps> = ({ children, className, ...rest }) => {
	return <div className={mergeNames("d-grid gap-0 row-gap-1", className)} {...rest}>
		{children}
	</div>;
};

export interface KvItemProps {
	name: string,
	value: React.ReactNode,
}

export type KvProps = PropsWithChildren<React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>>
