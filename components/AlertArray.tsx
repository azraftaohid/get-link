import React from "react";
import Alert, { AlertProps } from "react-bootstrap/Alert";
import { Conditional } from "./Conditional";

export const AlertArray: <KEY extends string> (props: AlertArrayProps<KEY>) => React.JSX.Element = ({
	source,
	present,
	onDismiss,
}) => {
	const entries = Object.entries(source) as [typeof present[0], AlertArrayItem][];
	return <>{entries.map(([key, value]) => <Conditional key={key} in={present.includes(key)}>
		<Alert
			className={"mt-3 mb-0"}
			variant={value.variant}
			onClose={() => onDismiss?.(key)}
			dismissible={value.dismissible}
		>
			{value.body}
		</Alert>
	</Conditional>)}</>;
};

export interface AlertArrayItem {
	variant: AlertProps["variant"],
	body: React.ReactNode,
	dismissible?: boolean,
}

export type AlertArraySource<KEY extends string> = Record<KEY, AlertArrayItem>;

export interface AlertArrayProps<KEY extends string> {
	source: AlertArraySource<KEY>,
	present: KEY[],
	onDismiss?: (key: KEY) => unknown,
}
