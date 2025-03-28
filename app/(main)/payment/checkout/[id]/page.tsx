"use client";

import { Conditional } from "@/components/Conditional";
import { CostTable } from "@/components/CostTable";
import { ExpandButton } from "@/components/ExpandButton";
import TextField from "@/components/forms/TextField";
import { TickField } from "@/components/forms/TickField";
import { TickItem } from "@/components/forms/TickItem";
import Link from "@/components/Link";
import { Loading } from "@/components/Loading";
import { Required } from "@/components/Required";
import { BillingAddressField } from "@/models/billings/billingAddress";
import { ComputedInvoiceData, InvoiceField, InvoicePaymentObjField, updateInvoice } from "@/models/billings/invoice";
import { getPaymentUrl } from "@/models/billings/payment";
import { PaymentMethod } from "@/models/billings/paymentMethod";
import { strPrice } from "@/models/billings/price";
import { UserSnapshotField } from "@/models/users";
import { AppError } from "@/utils/errors/AppError";
import { requireInvoice } from "@/utils/invoices";
import { useToast } from "@/utils/useToast";
import { useUser } from "@/utils/useUser";
import { FirebaseError } from "firebase/app";
import { Formik } from "formik";
import { notFound } from "next/navigation";
import { useRef, useState } from "react";
import Alert from "react-bootstrap/Alert";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import * as yup from "yup";
import { Kv, KvItem } from "./Kv";
import { PaymentOption } from "./PaymentOption";
import { Section } from "./Section";

const schema = yup.object().shape({
	email: yup.string()
		.email("Must be a valid email address.")
		.optional()
		.trim(),
	method: yup.string()
		.oneOf(Object.values(PaymentMethod))
		.required("This is a required field."),
	acceptance: yup.boolean()
		.isTrue("You must agree to this before proceeding.")
		.required("You must agree to this before proceeding."),
});

const getInvoiceData = async (invoiceId: string) => {
	let invoiceData: ComputedInvoiceData;

	try {
		invoiceData = (await requireInvoice(invoiceId)).data;
	} catch (error) {
		if (error instanceof FirebaseError && error.code === "functions/not-found") {
			throw new AppError("not_found", "Invoice does not exist!");
		}

		throw error;
	}

	return invoiceData;
};

export default function Page({ params }: Readonly<{ params: { id: string } }>) {
	const { makeToast } = useToast();
	const { isLoading: isUserLoading, user } = useUser();

	const [{ isLoading: isDataLoading, error: dataError, data }, setData] = useState<{
		isLoading: boolean | null,
		error?: unknown,
		data?: ComputedInvoiceData,
	}>({
		isLoading: null,
	});

	// we won't use init values from database to protect user privacy
	const inputState = useRef({
		email: "",
		method: PaymentMethod.BKASH,
		acceptance: false,
	});

	const initErrors = useRef({
		email: "x",
		method: "",
		acceptance: "x",
	});

	const invoiceId = params.id;
	if (isDataLoading === null) {
		getInvoiceData(invoiceId)
			.then(value => setData({ isLoading: false, data: value }))
			.catch(error => {
				console.error("Invoice fetch failed:", error);
				setData({ isLoading: false, error });
			});

		setData({ isLoading: true });
	}

	if (isDataLoading || isDataLoading === null) return <Loading />;
	if (!data) {
		if (dataError instanceof AppError && dataError.code === "not_found") return notFound();
		throw dataError || new Error("Unable to fetch invoice.");
	}

	const userAccount = data[InvoiceField.USER]?.[UserSnapshotField.UID];
	const status = data[InvoiceField.PAYMENT]?.[InvoicePaymentObjField.STATUS] || "pending";

	return <>
		<h1>Checkout</h1>
		<small>Review your orders before making payment.</small>
		<Row xs={1} lg={2}>
			<Col>
				<Kv className="mt-3">
					<KvItem name="Invoice ID" value={invoiceId} />
					<KvItem name="User account" value={isUserLoading
						? "Please wait"
						: user && user.uid === userAccount && user.email || userAccount || "N/A"} />
				</Kv>
				<Conditional in={status === "pending"}>
					<Alert className="mt-3 d-flex flex-row" variant="info">
						<div className="">
							<p className="mb-n1"><strong>Payment amount</strong></p>
							<small>Total amount to be paid today</small>
						</div>
						<div className="ms-auto my-auto">
							<strong className="fs-4 fw-medium">{strPrice(data[InvoiceField.PAYMENT])}</strong>
						</div>
					</Alert>
				</Conditional>
				<Conditional in={status === "paid"}>
					<Alert className="mt-3 text-center" variant="success">
						<strong className="text-uppercase fs-5">Paid!</strong>
					</Alert>
				</Conditional>
				<Section className="mt-3" title="Invoice breakdown">
					<div className="table-rounded border-secondary">
						<CostTable data={data} totalText="Payable amount" />
					</div>
				</Section>
			</Col>
			<Col>
				<Section className="mt-3" title="Billing details">
					<Formik
						validationSchema={schema}
						initialValues={inputState.current}
						initialErrors={initErrors.current}
						onSubmit={async (values, actions) => {
							actions.setSubmitting(true);

							try {
								await updateInvoice(invoiceId, {
									billing_address: { [BillingAddressField.EMAIL]: values.email },
								});
							} catch (error) {
								console.error("Unable to update invoice:", error);

								actions.setSubmitting(false);
								actions.setStatus("error");

								makeToast("Failed to update invoice. Please try again later.", "error");
								return;
							}

							try {
								const url = await getPaymentUrl(invoiceId, values.method);
								window.open(url.data.paymentUrl, "_blank");
							} catch (error) {
								console.error("Unable to get payment URL for method " + values.method + ":", error);
								actions.setSubmitting(false);
								actions.setStatus("error");

								makeToast("Failed to get payment URL. Please try again later.", "error");
								return;
							}

							actions.setSubmitting(false);
							actions.setStatus("submitted");
						}}
					>{({ handleSubmit, errors, isSubmitting, status: formStatus, handleChange }) => <Form noValidate onSubmit={handleSubmit}>
						<fieldset disabled={isSubmitting || formStatus === "submitted" || status !== "pending"}>
							<div className="card border-secondary">
								<div className="card-body">
									<TextField
										name="email"
										label="Billing email address"
										placeholder="username@example.com"
										helperText="Payment receipt will be sent to user email address and CC'd to this address."
									/>
									<TickField
										className="mt-3"
										label={<>Payment method <Required /></>}
									>
										<TickItem
											id="payment-method-bKash"
											className="mt-2"
											type="radio"
											name="method"
											value={PaymentMethod.BKASH}
										>
											<PaymentOption
												logo="bKash_bird"
												title="bKash"
												caption="Checkout with bKash."
											/>
										</TickItem>
										<TickItem
											id="payment-method-card"
											className="mt-3"
											type="radio"
											name="method"
											value={PaymentMethod.CARD}
											disabled
										>
											<PaymentOption
												icon="credit_card"
												title="Credit / Debit card"
												caption="Secure payment with SSLCOMMERZ."
											/>
										</TickItem>
										{process.env.NODE_ENV === "development" && <TickItem
											id="payment-method-emulator"
											className="mt-3"
											type="radio"
											name="method"
											value={PaymentMethod.EMULATOR}
										>
											<PaymentOption
												icon="code"
												title="Emulator"
												caption="Test payment with emulator."
											/>
										</TickItem>}
									</TickField>
								</div>
							</div>
							<ExpandButton
								type="submit"
								className="mt-4"
								state={isSubmitting ? "loading" : "none"}
								disabled={Object.values(errors).some(err => !!err)}
							>
								Make payment
							</ExpandButton>
							<TickItem
								id="acceptance-checkbox"
								className="w-fit mx-md-auto text-md-center mt-3" // text-center is used to center feedback
								name="acceptance"
								onChange={(evt) => {
									console.log("User " + (evt.currentTarget.checked ? "accepted" : "declined")
										+ " the TOS at " + new Date().toISOString());

									handleChange(evt);
								}}
							>
								I have read and agree to the <Link href="/policies#tos" newTab>Terms & Conditions</Link>,{" "}
								<Link href="/policies#privacy-policy" newTab>Privacy Policy</Link>, and{" "}
								<Link href="/policies#refund-policy" newTab>Refund Policy</Link>.
							</TickItem>
						</fieldset>
					</Form>}</Formik>
				</Section>
			</Col>
		</Row>
	</>;
}
