import { getAnalytics, logEvent } from "firebase/analytics";
import type { AppProps, NextWebVitalsMetric } from "next/app";
import Head from "next/head";
import Image from "next/image";
import React, { useState } from "react";
import Alert from "react-bootstrap/Alert";
import Toast from "react-bootstrap/Toast";
import ToastBody from "react-bootstrap/ToastBody";
import ToastContainer from "react-bootstrap/ToastContainer";
import ToastHeader from "react-bootstrap/ToastHeader";
import { QueryClient, QueryClientProvider } from "react-query";
import "../styles/global.scss";
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

	return <>
		<QueryClientProvider client={queryClient}>
			<ToastContext.Provider value={{ makeToast }}>
				<Head>
					<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				</Head>
				<ToastContainer className="toast-container position-fixed p-3" position="bottom-end">
					<Toast 
						className={toastBgMapping[toastType] && `border border-${toastBgMapping[toastType]}`}
						show={showToast} 
						onClose={() => setShowToast(!showToast)} 
						autohide 
						delay={3000}
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