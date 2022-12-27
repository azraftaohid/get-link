import Document, { Head, Html, Main, NextScript } from "next/document";

export class AppDocument extends Document {
	render(): JSX.Element {
		return <Html lang="en">
			<Head>
				<base href="/" />
				<meta content="en_US" property="og:locale" />
				<meta content="getlink.vercel.app" property="og:site_name" />
				<meta apple-mobile-web-app-title={"true"} content="Get-Link" />
				<link rel="icon" type="image/svg+xml" sizes="any" href="/vector.svg" />
				<link rel="alternate icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
				<link rel="alternate icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
				<link rel="alternate icon" type="image/png" sizes="72x72" href="/favicon-72x72.png" />
				<link rel="alternate icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
				<link rel="alternate icon" type="image/png" sizes="144x144" href="/favicon-144x144.png" />
				<link rel="alternate icon" type="image/png" sizes="192x192" href="/favicon-192x192.png" />
				<link rel="shortcut icon" type="image/svg+xml" sizes="any" href="/vector.svg" />
				<link rel="shortcut icon" sizes="16x16 32x32 48x48" href="/favicon.ico" />
				<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
				<link rel="mask-icon" href="/safari-pinned-tab.svg" color="#0078d4" />
				<link rel="manifest" href="/site.webmanifest" />
				<meta name="msapplication-config" content="/browserconfig.xml" />
				<meta name="msapplication-TileColor" content="#2d89ef" />
				<meta name="theme-color" content="#f5f6f7" media="(prefers-color-scheme: light)" />
				<meta name="theme-color" content="#141516" media="(prefers-color-scheme: dark)" />
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