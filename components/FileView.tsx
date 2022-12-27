import dynamic from "next/dynamic";
import Image from "next/image";
import React, { useState } from "react";
import { mergeNames } from "../utils/mergeNames";
import { getSolidStallImage } from "../visuals/stallData";
import { Audio } from "./Audio";
import { Icon } from "./Icon";
import { Link } from "./Link";
import { RawText } from "./RawText";
import { Video } from "./Video";

const PDF = dynamic(() => import("./PDFView"), { ssr: false });

const NoPreview: React.FunctionComponent<React.PropsWithChildren<{ src: string, type?: string | null }>> = ({
	type,
	src,
}) => {
	return <>
		<Icon className="d-block"
			name={type?.startsWith("audio") ? "audio_file" : type?.startsWith("video") ? "video_file" : "description"}
			size="lg"
		/>
		<p className="mb-0">Preview not available.</p>
		<p><Link href={src} newTab download>Download</Link> ({type}).</p>
	</>;
};

export const FileView: React.FunctionComponent<React.PropsWithChildren<FileViewProps>> = ({
	className,
	src,
	size,
	type,
	width,
	height,
	placeholderDataUrl,
	...rest
}) => {
	const [imageLoaded, setImageLoaded] = useState(false);
	const [useFallback, setUseFallback] = useState(false);

	return <div className={mergeNames("border border-secondary rounded d-flex flex-column align-items-center w-100 p-2 text-muted", className)} {...rest}>
		{!useFallback && ((type?.startsWith("image/") && <Link href={src} newTab><Image
			src={src}
			alt="Image"
			placeholder={imageLoaded ? "empty" : "blur"}
			width={width || 480}
			height={height || 480}
			objectFit="contain"
			blurDataURL={placeholderDataUrl || getSolidStallImage()}
			onLoadingComplete={() => { setImageLoaded(true); setUseFallback(false); }}
			priority
			onError={() => setUseFallback(true)}
		/></Link>) || (type?.startsWith("video/") && <Video
			src={src}
			type={type}
			width={width || undefined}
		/>) || (type?.startsWith("audio/") && <Audio
			src={src}
			type={type}
		/>) || ((type?.startsWith("text/") || ["application/json", "application/xml"].includes(type || "")) && <RawText
			className={mergeNames("w-100 mb-0 px-3 py-3", type === "text/plain" && "text-wrap")}
			src={src}
		/>) || (type === "application/pdf" && <PDF
			file={src}
			width={width || undefined}
			height={height || undefined}
			size={size}
		/>)) || <NoPreview src={src} type={type} />}
	</div>;
};

export interface FileViewProps extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
	src: string,
	size: number,
	type?: string | null,
	width?: number | null,
	height?: number | null,
	placeholderDataUrl?: string,
}