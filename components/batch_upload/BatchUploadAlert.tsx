import React, { useContext } from "react";
import Alert, { AlertProps } from "react-bootstrap/Alert";
import { StatusCode } from "../../utils/common";
import { Conditional } from "../Conditional";
import Link from "../Link";
import { BatchUploadContext } from "./BatchUploadWrapper";

export const BatchUploadAlert: React.FunctionComponent<BatchUploadAlertProps> = () => {
	const { status } = useContext(BatchUploadContext);
	
	return <Conditional
		in={status.some((s) =>
			(
				[
					"files:unknown-error",
					"files:capture-error",
					"files:upload-error",
					"auth:sign-in-error",
					"files:too-large",
					"links:create-failed"
				] as StatusCode[]
			).includes(s)
		)}
	>
		<Alert variant="danger">
			There were errors for some or all of your files. Please try again!
			<br />
			Code:{" "}
			{status.map((s, i, arr) => (
				<>
					<Link
						key={s}
						className="alert-link"
						href={`/technical#${encodeURIComponent(s)}`}
						newTab
					>
						{s}
					</Link>
					{i < arr.length - 1 && ", "}
				</>
			))}
			.
		</Alert>
	</Conditional>;
};

export type BatchUploadAlertProps = AlertProps;
