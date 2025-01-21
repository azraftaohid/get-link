"use client";

import { Conditional } from "@/components/Conditional";
import { Loading } from "@/components/Loading";
import { ReportField, getReportRef } from "@/models/report";
import { deleteField, updateDoc } from "firebase/firestore";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Alert from "react-bootstrap/Alert";

export default function Page() {
	const search = useSearchParams();

	// services:report:report_id,newsletter:newsletter_id:email_address
	const services = search?.get("services");
	const origin = search?.get("origin");

	const [result, setResult] = useState<Result>();

	useEffect(() => {
		if (typeof services !== "string" || typeof origin !== "string") {
			setResult({ error: "invalid_query" });
			return;
		}

		const waits: Promise<unknown>[] = [];

		const newResult: Required<Omit<Result, "error">> = { failed: [], skipped: [], succeeded: [] };

		const serviceList = new Set(services.split(","));
		serviceList.forEach(service => {
			if (service.startsWith("report:")) {
				const reportId = service.slice("report:".length);
				const report = getReportRef(reportId);

				waits.push(updateDoc(report, { [ReportField.EMAIL]: deleteField() }).then(() => {
					newResult.succeeded.push(service);
				}).catch(err => {
					console.error(`error updating report [id: ${reportId}; cause: ${err}]`);
					newResult.failed.push(service);
				}));
			} else {
				newResult.skipped.push(service);
			}
		});

		let continueWithSet = true;
		Promise.all(waits).then(() => {
			if (continueWithSet) setResult(newResult);
		});

		return () => {
			continueWithSet = false;
			setResult(undefined);
		};
	}, [origin, services]);

	return <>
		<Conditional in={!result}>
			<Loading />
		</Conditional>
		<Conditional in={result && (Object.keys(result) as (keyof Result)[]).every((key) => !result[key]?.length)}>
			<Alert className="mt-3" variant="warning">
				No changes were made.
			</Alert>
		</Conditional>
		<Conditional in={!!result?.succeeded?.length}>
			<Alert className="mt-3" variant="success">
				You are successfully unsubscribed from <b>{result?.succeeded?.join(", ")}</b>.
			</Alert>
		</Conditional>
		<Conditional in={!!result?.skipped?.length}>
			<Alert className={"mt-3"} variant="info">
				We couldn&apos;t understand and skipped <b>{result?.skipped?.join(",")}</b>.
			</Alert>
		</Conditional>
		<Conditional in={!!result?.failed?.length}>
			<Alert className={"mt-3"} variant="danger">
				Sorry, we couldn&apos;t unsubscribe you from <b>{result?.failed?.join(", ")}</b>.
				It is likely that no such subscription exists.
			</Alert>
		</Conditional>
		<Conditional in={result?.error === "invalid_query"}>
			<Alert className="mt-3" variant="danger">
				Invalid query.
			</Alert>
		</Conditional>
	</>;
}

type Result = {
	succeeded?: string[],
	skipped?: string[],
	failed?: string[],
	error?: "invalid_query",
};
