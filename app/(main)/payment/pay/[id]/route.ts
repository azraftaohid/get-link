import { getPaymentUrl } from "@/models/billings/payment";
import { initFirebase } from "@/utils/firebase";
import { FirebaseError } from "firebase/app";
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 10;

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
	initFirebase();
	const invoiceId = params.id;
	
	let paymentUrl: string;
	try {
		const res = await getPaymentUrl(invoiceId);
		paymentUrl = res.data.paymentUrl;
	} catch (error) {
		if (error instanceof FirebaseError && error.code === "functions/not-found")
			return NextResponse.json({ code: "not_found", message: "Invoice doesn't exist!" });

		return NextResponse.json({ code: "internal_error", message: "Something went wrong internally! Please try again." });
	}

	return NextResponse.redirect(paymentUrl);
}
