import React from "react";
import Placeholder, { PlaceholderProps } from "react-bootstrap/Placeholder";
import { mergeNames } from "../utils/mergeNames";

export const Shimmer: React.FunctionComponent<ShimmerProps> = ({
	className,
	direction = "horizontal",
	gap = 1,
	pattern,
	size,
	children,
	...rest
}) => {
	return (
		<Placeholder
			className={mergeNames(
				direction === "vertical" ? "vstack" : "hstack",
				`overflow-hidden gap-${gap}`,
				className
			)}
			animation="glow"
			{...rest}
		>
			{Array.isArray(pattern)
				? pattern.map((p, i) =>
						typeof p === "number" ? <Placeholder key={`${i}-${p}`} xs={p} size={size} /> : p
				  )
				: pattern}
			{children}
		</Placeholder>
	);
};

export interface ShimmerProps extends PlaceholderProps {
	direction?: "vertical" | "horizontal";
	gap?: number;
	pattern?: (number | React.ReactNode)[] | React.ReactNode;
	size?: PlaceholderProps["size"];
}
