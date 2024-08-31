"use client";

import { AlertArray, AlertArraySource } from "@/components/AlertArray";
import { Conditional } from "@/components/Conditional";
import { ExpandButton } from "@/components/ExpandButton";
import { Loading } from "@/components/Loading";
import { processPayment } from "@/models/billings/payment";
import { contactEmail } from "@/utils/configs";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export const dynamic = "force-dynamic";

const alertSource: AlertArraySource<Exclude<Status, "none" | "processing" | "success">> = {
	"payment-failed": {
		variant: "danger",
		body: "Sorry, but your payment was failed!",
	},
	"payment-canceled": {
		variant: "info",
		body: "We understand that you've chose not to continue with the payment but we appreciate your interest.",
	},
	"precondition-failed": {
		variant: "danger",
		body: <>Request is invalid. Please make sure that you&apos;ve entered the right URL. If this issue continue to 
			exist, please file a report using the <i>Feedback</i> button in page footer.</>,
	},
	"process-failed": {
		variant: "danger",
		body: <>Something went wrong from our end. Please try again after sometime. You shouldn&apos;t be charged for 
			this payment. However, if you do, a refund is on its way; if you don&apos;t receive it within 30 
			minutes, please contact us at <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</>,
	},
};

export default function Page() {
	const search = useSearchParams();
	const paymentId = search?.get("paymentID");
	const paymentStatus = search?.get("status");

	const lock = useRef(false);
	const [status, setStatus] = useState<Status>("none");

	useEffect(() => {
		if (lock.current) return;
		if (paymentStatus === "cancel") return setStatus("payment-canceled");
		if (paymentStatus === "failure") return setStatus("payment-failed");

		if (!paymentId) return setStatus("precondition-failed");
		setStatus("processing");

		lock.current = true;
		processPayment(paymentId).then(() => {
			setStatus("success");
		}).catch(error => {
			console.error("Unable to process payment:", error);
			setStatus("process-failed");
		}).finally(() => {
			lock.current = false;
		});
	}, [paymentId, paymentStatus]);

	return <div>
		<Conditional in={status === "success"}>
			<p className="fs-3">Payment complete.</p>
			<ExpandButton href="/">Continue to website</ExpandButton>
		</Conditional>
		<Conditional in={status === "none" || status === "processing"}>
			<Loading />
		</Conditional>
		<AlertArray source={alertSource} present={[status as keyof typeof alertSource]} />
	</div>;
}

type Status = "none" | "processing" | "payment-failed" | "payment-canceled" | "process-failed" 
	| "precondition-failed" | "success";
