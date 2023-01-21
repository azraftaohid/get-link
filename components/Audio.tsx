import React from "react";
import { mergeNames } from "../utils/mergeNames";

export const Audio: React.FunctionComponent<React.PropsWithChildren<AudioProps>> = ({
	className,
	src,
	type,
	children,
	...rest
}) => {
	return (
		<audio className={mergeNames("w-100", className)} controls muted={false} autoPlay={false} {...rest}>
			<source src={src} type={type} />
			{children}
			Playback not available for this audio.
		</audio>
	);
};

export interface AudioProps
	extends React.DetailedHTMLProps<React.AudioHTMLAttributes<HTMLAudioElement>, HTMLAudioElement> {
	type?: string;
}
