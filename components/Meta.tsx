import Head from "next/head";
import { useRouter } from "next/router";
import React from "react";
import { Falsy } from "../utils/falsy";

export const Metadata: React.FunctionComponent<MetadataProps> = ({ title, description, image, children }) => {
    const router = useRouter();

	return <Head>
		<meta charSet="utf-8" />
		<title>{title}</title>
        {description && <meta name="description" content={description} />}
        {/* for google search results */}
        <meta itemProp="name" content={title} />
        {description && <meta itemProp="description" content={description} />}
        {image && <meta itemProp="image" content={image}/>}
        {/* for facebook snippets */}
        <meta property="og:url" content={router.pathname} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        {description && <meta property="og:description" content={description} />}
        {image && <meta property="og:image" content={image} />}
        {/* for twitter snippets */}
        <meta name="twitter:card" content="summary_large_image"/>
        <meta name="twitter:title" content={title} />
        {description && <meta name="twitter:description" content={description} />}
        {image && <meta name="twitter:image" content={image}/>}
		{children}
	</Head>;
};

export interface MetadataProps {
	title: string,
	description?: string | Falsy,
	image?: string | Falsy,
}