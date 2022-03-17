import { getAnalytics, logEvent } from "firebase/analytics";
import { nanoid } from "nanoid";
import type { AppProps, NextWebVitalsMetric } from "next/app";
import Head from "next/head";
import Image from "next/image";
import Script from "next/script";
import React, { useEffect, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Toast from "react-bootstrap/Toast";
import ToastBody from "react-bootstrap/ToastBody";
import ToastContainer from "react-bootstrap/ToastContainer";
import ToastHeader from "react-bootstrap/ToastHeader";
import { QueryClient, QueryClientProvider } from "react-query";
import "../styles/global.scss";
import { KEY_EID, KEY_SID } from "../utils/analytics";
import { init } from "../utils/init";

init();
const queryClient = new QueryClient();

export const ToastContext = React.createContext<ToastContextInterface>({
	makeToast: () => console.warn("toast failed [cause: context not provided]"),
});

const toastBgMapping: Record<ToastType, string | undefined> = {
	info: undefined,
	warning: "warning",
	error: "danger",
};

function MyApp({ Component, pageProps }: AppProps) {
	const [toast, setToast] = useState<React.ReactNode>();
	const [toastType, setToastType] = useState<ToastType>("info");
	
	const [showToast, setShowToast] = useState(false);

	const makeToast = (mssg: string, type: ToastType = "info") => {
		setToast(mssg);
		setToastType(type);
		setShowToast(true);
	};

	useEffect(() => {
		let eid = localStorage.getItem(KEY_EID);
		if (!eid) {
			eid = nanoid(10);
			localStorage.setItem(KEY_EID, eid);
		}

		let sid = sessionStorage.getItem(KEY_SID);
		if (!sid) {
			sid = nanoid();
			sessionStorage.setItem(KEY_SID, sid);
		}
		
		window.clarity("identify", eid, sid);
	}, []);

	return <>
		<QueryClientProvider client={queryClient}>
			<ToastContext.Provider value={{ makeToast }}>
				<Head>
					<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				</Head>
				<Script id="init-clarity" type="text/javascript" strategy="afterInteractive">{`
					(function(c,l,a,r,i,t,y){
					c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
					t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
					y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
					})(window, document, "clarity", "script", "b215twzvnz");
				`}</Script>
				<ToastContainer className="toast-container position-fixed p-3" position="bottom-end">
					<Toast 
						className={toastBgMapping[toastType] && `border border-${toastBgMapping[toastType]}`}
						show={showToast} 
						onClose={() => setShowToast(!showToast)} 
						autohide 
						delay={5000}
					>
						<ToastHeader>
							<Image 
								src="/favicon-32x32.png" 
								height={20} 
								width={20} 
								alt="Get-Link logo" />
							<strong className="ms-2 me-auto">Get-Link</strong>
						</ToastHeader>
						<ToastBody>
							{toast}
						</ToastBody>
					</Toast>
				</ToastContainer>
				{process.env.NODE_ENV === "production" && <Alert className="mb-0" variant="warning">
					This is a state of the art build. Features may be incomplete and you&apos;re likely to face bugs.
				</Alert>}
				<Component {...pageProps} />
			</ToastContext.Provider>
		</QueryClientProvider>
	</>;
}

export function reportWebVitals({ id, name, label, value }: NextWebVitalsMetric) {
	logEvent(getAnalytics(), name, {
		event_category: label === "web-vital" ? "Web Vitals" : "Next.js custom metric",
		value: Math.round(name === "CLS" ? value * 1000 : value), // values must be integers
		event_label: id, // id unique to current page load
		non_interaction: true, // avoids affecting bounce rate.
	});
}

export default MyApp;

export interface ToastContextInterface {
	makeToast: (message: string, type?: ToastType) => void,
}

export type ToastType = "warning" | "error" | "info";