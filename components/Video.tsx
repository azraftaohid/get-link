import React from "react";
import { mergeNames } from "../utils/mergeNames";

export const Video: React.FunctionComponent<React.PropsWithChildren<VideoProps>> = ({
	className,
	src,
	type,
	children,
	...rest
}) => {
	return (
		<video className={mergeNames("mw-100", className)} controls muted={false} autoPlay={false} {...rest}>
			<source src={src} type={type} />
			{children}
			Playback not available for this video.
		</video>
	);
};

export interface VideoProps
	extends React.DetailedHTMLProps<React.VideoHTMLAttributes<HTMLVideoElement>, HTMLVideoElement> {
	type?: string;
}
