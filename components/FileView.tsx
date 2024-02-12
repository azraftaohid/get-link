import dynamic from "next/dynamic";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import styles from "../styles/file-view.module.scss";
import { getBlob } from "../utils/downloads";
import { mergeNames } from "../utils/mergeNames";
import { getSolidStallImage } from "../visuals/stallData";
import { Audio } from "./Audio";
import { Icon } from "./Icon";
import { Link } from "./Link";
import { RawText } from "./RawText";
import { Video } from "./Video";

const PDF = dynamic(() => import("./PDFView"), { ssr: false });

const NoPreview: React.FunctionComponent<React.PropsWithChildren<{ src: string; name?: string | null, type?: string | null }>> = ({
	type,
	src,
	name,
}) => {
	return (
		<div className="d-flex flex-column justify-content-center align-items-center p-2">
			<Icon
				className="d-block"
				name={
					type?.startsWith("audio") ? "audio_file" : type?.startsWith("video") ? "video_file" : "description"
				}
				size="lg"
			/>
			<p className="mb-0">Preview not available.</p>
			{name && <p className="mb-0">{name}</p>}
			<p>
				<Link href={src} newTab download>
					Download
				</Link>{" "}
				({type}).
			</p>
		</div>
	);
};

export const FileView: React.FunctionComponent<React.PropsWithChildren<FileViewProps>> = ({
	className,
	src,
	size,
	name,
	type,
	width: _width,
	height: _height,
	placeholderUrl,
	fileCount = 1,
	...rest
}) => {
	const [imageLoaded, setImageLoaded] = useState(false);
	const [useFallback, setUseFallback] = useState(false);

	const [placeholderDataUrl, setPlaceholderDataUrl] = useState<string>();

	const width = _width || 480;
	const height = _height || width;

	useEffect(() => {
		if (!placeholderUrl) return;

		console.debug("loading thumbnail");
		getBlob(placeholderUrl).then((blob) => {
			const reader = new FileReader();
			reader.onloadend = () => {
				console.debug("thumbnail data url loaded");
				const result = reader.result;
				if (typeof result !== "string") setPlaceholderDataUrl(undefined);
				else setPlaceholderDataUrl(result);
			};

			reader.onerror = () => {
				console.warn(`thumbnail data url load failed [status: ${reader.error}]`);
			};

			reader.readAsDataURL(blob);
		});
	}, [placeholderUrl]);

	return (
		<div
			className={mergeNames(
				styles.fileView,
				"w-100 text-muted ratio overflow-hidden", // hide overflow caused by ratio (img w less than view w)
				className
			)}
			style={{
				"--bs-aspect-ratio": `${((height / width) * 100).toFixed(2)}%`,
				"maxHeight": `${height}px`,
			}} 
			{...rest}
		>
			{(!useFallback &&
				((type?.startsWith("image/") && (
					<a className="mx-auto" href={src} title={name || "Orginal image"} target="_blank" rel="noreferrer">
						<Image
							src={src}
							alt={name || "Image"}
							placeholder={imageLoaded ? "empty" : "blur"}
							width={width}
							height={height}
							sizes={`(max-width: 576px) 100vw, (max-width: 992px) ${100 / Math.min(fileCount, 2)}vw, ${Math.ceil(100 / Math.min(fileCount, 3))}vw`}
							objectFit="contain"
							blurDataURL={placeholderDataUrl || getSolidStallImage()}
							onLoadingComplete={() => {
								setImageLoaded(true);
								setUseFallback(false);
							}}
							priority
							onError={() => setUseFallback(true)}
						/>
					</a>
				)) ||
					(type?.startsWith("video/") && <Video 
						src={src} type={type} 
						width={width} 
					/>) || (type?.startsWith("audio/") && <Audio 
						src={src} 
						type={type} 
					/>) || ((type?.startsWith("text/") || ["application/json", "application/xml", "application/x-dotenv"].includes(type || "")) && (
						<RawText
							className={mergeNames("w-100 mb-0 px-3 py-3", type === "text/plain" && "text-wrap")}
							src={src}
						/>
					)) || (type === "application/pdf" && (
						<PDF file={src} width={width} height={height} size={size} />
					)))) || <NoPreview src={src} name={name} type={type} />}
		</div>
	);
};

export interface FileViewProps extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
	src: string;
	size: number;
	name?: string | null;
	type?: string | null;
	width?: number | null;
	height?: number | null;
	placeholderUrl?: string;
	fileCount?: number,
}
