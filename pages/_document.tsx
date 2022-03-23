import Document, { Head, Html, Main, NextScript } from "next/document";

export class AppDocument extends Document {
	render(): JSX.Element {
		return <Html lang="en">
			<Head>
				<base href="/" />
				<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
				<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
				<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
				<link rel="icon" type="image/svg+xml" sizes="any" href="/vector.svg" />
				<link rel="shortcut icon" type="image/svg+xml" href="/vector.svg" />
				<link rel="shortcut icon" type="image/png" href="/favicon-32x32.png" />
				<link rel="manifest" href="/site.webmanifest" />
				<link rel="mask-icon" href="/safari-pinned-tab.svg" color="#0078d4" />
				<meta name="msapplication-TileColor" content="#2d89ef" />
				<meta name="theme-color" content="#ffffff" />
    			<link href="https://fonts.googleapis.com/icon?family=Material+Icons+Outlined" rel="stylesheet"></link>
			</Head>
			<body>
				<Main />
				<NextScript />
			</body>
		</Html>;
	}
}

export default AppDocument;