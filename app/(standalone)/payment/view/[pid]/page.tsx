"use client";

import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { Loading } from "@/components/Loading";
import { useUser } from "@/utils/useUser";
import { ReceiptView } from "./ReceiptView";

export default function Page({ params }: Readonly<{ params: { pid: string } }>) {
	const { isLoading: isAuthLoading, user } = useUser();

	if (isAuthLoading) return <Loading />;

	return <>
		<ReceiptView user={user} paymentId={params.pid} />
		<Button
			className="d-print-none mx-auto"
			variant="outline-secondary"
			left={<Icon name="print" size="sm" />}
			onClick={() => window.print()}
		>
			Print
		</Button>
	</>;
}
