import Head from "next/head";
import { useRouter } from "next/router";
import React from "react";
import { Falsy } from "../utils/falsy";
import { DOMAIN } from "../utils/urls";

export const Metadata: React.FunctionComponent<React.PropsWithChildren<MetadataProps>> = ({
	title,
	description: _description,
	image: _image,
	tags,
	children
}) => {
	const router = useRouter();

	const image = _image ? _image.startsWith("/") ? `${DOMAIN}${_image}` : _image : "https://getlink.vercel.app/image/preview.png";
	const description = _description || "The easiest way to create shareable links of files and images.";

	return <Head>
		<meta charSet="utf-8" />
		<title>{title}</title>
		<meta name="description" content={description} />
		{/* for google search results */}
		<meta itemProp="name" content={title} />
		<meta itemProp="description" content={description} />
		{image && <meta itemProp="image" content={image} />}
		{/* for facebook snippets */}
		<meta property="og:url" content={`${DOMAIN}${router.asPath}`} />
		<meta property="og:type" content="website" />
		<meta property="og:title" content={title} />
		<meta property="og:description" content={description} />
		{image && <meta property="og:image" content={image} />}
		{/* for twitter snippets */}
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:site" content="@getlinksoft" />
		{tags?.map((tag) => <meta key={tag} property="tag" content={tag} />)}
		{children}
	</Head>;
};

export interface MetadataProps {
	title: string,
	description?: string | Falsy,
	image?: string | Falsy,
	tags?: string[],
}