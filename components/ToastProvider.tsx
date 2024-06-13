"use client";

import { Image } from "@/components/Image";
import { WithChildren } from "@/utils/children";
import React, { useMemo, useState } from "react";
import Toast from "react-bootstrap/Toast";
import ToastBody from "react-bootstrap/ToastBody";
import ToastContainer from "react-bootstrap/ToastContainer";
import ToastHeader from "react-bootstrap/ToastHeader";

const toastBgMapping: Record<ToastType, string | undefined> = {
	info: undefined,
	warning: "warning",
	error: "danger",
};

export const ToastContext = React.createContext<ToastContextInterface>({
	makeToast: () => console.warn("toast failed [cause: context not provided]"),
});

export default function ToastProvider({ children }: WithChildren) {
	const [toast, setToast] = useState<React.ReactNode>();
	const [toastType, setToastType] = useState<ToastType>("info");

	const [showToast, setShowToast] = useState(false);

	const toaster = useMemo(() => ({
		makeToast: (mssg: string, type: ToastType = "info") => {
			setToast(mssg);
			setToastType(type);
			setShowToast(true);
		}
	}), []);

	return <ToastContext.Provider value={toaster}>
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
		{children}
	</ToastContext.Provider>;
}

export type ToastType = "warning" | "error" | "info";

export interface ToastContextInterface {
	makeToast: (message: string, type?: ToastType) => void;
}
