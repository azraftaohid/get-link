import FirebaseProvider from "@/components/FirebaseProvider";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { PageContainer } from "@/components/PageContainer";
import RouteIndicatorProvider from "@/components/RouteIndicatorProvider";
import ToastProvider from "@/components/ToastProvider";
import { init } from "@/utils/init";
import { DOMAIN } from "@/utils/urls";
import { Metadata, Viewport } from "next";
import Script from "next/script";
import React from "react";
import "../styles/global.scss";

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
};

export const metadata: Metadata = {
	metadataBase: new URL(DOMAIN),
	title: {
		default: "Get-Link",
		template: "%s | Get-Link",
	},
	appleWebApp: {
		title: "Get-Link",
	},
	openGraph: {
		type: "website",
		locale: "en-US",
		siteName: "Get-Link",
		images: "/image/cover.png",
	},
	twitter: {
		site: "@getlinksoft",
		card: "summary_large_image",
		images: "/image/cover.png",
	},
	icons: {
		other: {
			rel: "mask-icon",
			url: "/safari-pinned-tab.svg",
			color: "#0078d4",
		},
	},
};

export default function RootLayout({ children }: Readonly<React.PropsWithChildren>) {
	init();

	return <html lang="en" data-bs-theme="system">
		<body>
			<FirebaseProvider>
				<RouteIndicatorProvider>
					<ToastProvider>
						<main>
							<PageContainer>
								<Header />
								{children}
								<Footer />
							</PageContainer>
						</main>
					</ToastProvider>
				</RouteIndicatorProvider>
			</FirebaseProvider>
		</body>
		<Script id="init-clarity" type="text/javascript" strategy="afterInteractive">
			{`(function(c,l,a,r,i,t,y){
				c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
				t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
				y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
			})(window, document, "clarity", "script", "b215twzvnz");`}
		</Script>
	</html>;
}
