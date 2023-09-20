import { getAnalytics, logEvent } from "firebase/analytics";
import { getApp } from "firebase/app";
import type { AppProps, NextWebVitalsMetric } from "next/app";
import Head from "next/head";
import Image from "next/image";
import Script from "next/script";
import React, { useEffect, useState } from "react";
import Toast from "react-bootstrap/Toast";
import ToastBody from "react-bootstrap/ToastBody";
import ToastContainer from "react-bootstrap/ToastContainer";
import ToastHeader from "react-bootstrap/ToastHeader";
import { FirebaseAppProvider } from "reactfire";
import { FirebaseComponents } from "../components/FirebaseComponents";
import "../styles/global.scss";
import { acquireExperienceOptions } from "../utils/analytics";
import { init } from "../utils/init";

init();

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
		if (!window.clarity) return;

		const { eid, sid } = acquireExperienceOptions();
		window.clarity("identify", eid, sid);
	}, []);

	return (
		<>
			<FirebaseAppProvider firebaseApp={getApp()}>
				<ToastContext.Provider value={{ makeToast }}>{/* NOSONAR */}
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
								<Image src="/favicon-32x32.png" height={20} width={20} alt="Get-Link logo" />
								<strong className="ms-2 me-auto">Get-Link</strong>
							</ToastHeader>
							<ToastBody className="pre-break">{toast}</ToastBody>
						</Toast>
					</ToastContainer>
					<FirebaseComponents>
						<Component {...pageProps} />
					</FirebaseComponents>
				</ToastContext.Provider>
			</FirebaseAppProvider>
		</>
	);
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
	makeToast: (message: string, type?: ToastType) => void;
}

export type ToastType = "warning" | "error" | "info";
