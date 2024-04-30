import NextImage, { ImageProps as NextImageProps } from "next/image";
import React from "react";

export const Image: React.FunctionComponent<ImageProps> = ({
	src,
	srcDark,
	srcLight,
	...rest
}) => {
	if (src) return <NextImage src={src} {...rest} />;

	// allegedly, chrome doesn't load images if parent is hidden (display:none)
	// however, that behavior is not tested.
	// reference: https://stackoverflow.com/questions/12158540/does-displaynone-prevent-an-image-from-loading
	return <>
		<div data-display-theme="light">
			<NextImage
				src={srcLight as NonNullable<typeof srcLight>}
				loading="lazy"
				{...rest}
			/>
		</div>
		<div data-display-theme="dark">
			<NextImage
				src={srcDark as NonNullable<typeof srcDark>}
				loading="lazy"
				{...rest}
			/>
		</div>
	</>;
};

export interface StaticSource {
	src: NextImageProps["src"],
	srcLight?: never,
	srcDark?: never,
}

export interface DynamicSource {
	src?: never,
	srcLight: NextImageProps["src"],
	srcDark: NextImageProps["src"],
}

export type ImageProps = (StaticSource | DynamicSource) & Omit<NextImageProps, "src">;
