import { getAnalytics, logEvent } from "firebase/analytics";
import type { AppProps, NextWebVitalsMetric } from "next/app";
import Image from "next/image";
import React, { useState } from "react";
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
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<QueryClientProvider client={queryClient}>
			<ToastContext.Provider value={{ makeToast }}>
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