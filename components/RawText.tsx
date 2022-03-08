import React, { useEffect, useState } from "react";

export const RawText: React.FunctionComponent<RawTextProps> = ({ className, src, initData, errorData, ...rest }) => {
	const [data, setData] = useState(initData || "Loading text...");

	useEffect(() => {
		fetch(src).then(async res => {
			const text = await res.text();
			setData(text);
		}).catch(err => {
			console.error(`error fetching raw data [cause: ${err}]`);
			setData(errorData || "Failed to fetch text.");
		});
	}, [src, errorData]);

	return <pre className={className} {...rest}>
		{data}
	</pre>;
};

export interface RawTextProps extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLPreElement>, HTMLPreElement> {
	src: string,
	initData?: React.ReactNode,
	errorData?: React.ReactNode,
}