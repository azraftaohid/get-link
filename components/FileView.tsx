import dynamic from "next/dynamic";
import Image from "next/image";
import React from "react";
import { mergeNames } from "../utils/mergeNames";
import { getSolidStallImage } from "../visuals/stallData";
import { Audio } from "./Audio";
import { Icon } from "./Icon";
import { Link } from "./Link";
import { RawText } from "./RawText";
import { Video } from "./Video";

const PDF = dynamic(() => import("./PDFView"), { ssr: false });

export const FileView: React.FunctionComponent<FileViewProps> = ({ className, src, type, size, width, height, placeholderDataUrl, ...rest }) => {
	return <div className={mergeNames("border border-secondary rounded d-flex flex-column align-items-center w-100 p-2 text-muted", className)} {...rest}>
		{(type?.startsWith("image/") && <Image 
			src={src} 
			alt="Image"
			placeholder={"blur"}
			width={width || 480}
			height={height || 480}
			objectFit="contain"
			blurDataURL={placeholderDataUrl || getSolidStallImage()}
			priority
		/>) || (type?.startsWith("video/") && <Video
			src={src}
			type={type}
			width={width || undefined}
		/>) || (type?.startsWith("audio/") && <Audio 
			src={src}
			type={type}
		/>) || ((type?.startsWith("text/") || ["application/json", "application/xml"].includes(type || "")) && <RawText 
			className={mergeNames("w-100 mb-0 px-3 py-3", type === "text/plain" && "text-wrap")}
			src={src}
		/>) || (type === "application/pdf" && <PDF file={src} />) || <>
			<Icon 
				className="d-block"
				name={type?.startsWith("audio") ? "audio_file" : type?.startsWith("video") ? "video_file" : "description"} 
				size="lg"
			/>
			<p className="mb-0">Preview not available.</p> 
			<p><Link href={src} newTab download>Download</Link> ({type}).</p>
		</>}
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