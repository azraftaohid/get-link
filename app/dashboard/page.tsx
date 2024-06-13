"use client";

import { RecentFiles } from "@/components/list/RecentFiles";
import { RecentLinks } from "@/components/list/RecentLinks";
import { RecentListPlaceholder } from "@/components/list/RecentListPlaceholder";
import { useAppRouter } from "@/utils/useAppRouter";
import { useUser } from "@/utils/useUser";
import { usePathname, useSearchParams } from "next/navigation";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import ToggleButton from "react-bootstrap/ToggleButton";
import ToggleButtonGroup from "react-bootstrap/ToggleButtonGroup";
import { EmptyView, ErrorView, Mode, isValidMode } from "./helperComponents";

export default function Page() {
	const router = useAppRouter();
	const pathname = usePathname();
	const search = useSearchParams();

	const { user, isLoading } = useUser();

	const strMode = search?.get("list");
	const mode: Mode = isValidMode(strMode) ? strMode : "links";

	return <>
		<Row>
			<Col className="me-auto" xs="auto">
				<h1 className="mb-4">Recents</h1>
			</Col>
			<Col xs="auto">
				<ToggleButtonGroup
					className="ms-auto"
					name="mode-btn-radio"
					value={mode}
					onChange={(value) => {
						const params = new URLSearchParams(search?.toString());
						params.set("list", value);

						router.push(pathname + "?" + params.toString());
					}}
					type="radio"
				>
					<ToggleButton id="mode-btn-links" variant="outline-secondary" value="links">
						Links
					</ToggleButton>
					<ToggleButton id="mode-btn-files" variant="outline-secondary" value="files">
						Files
					</ToggleButton>
				</ToggleButtonGroup>
			</Col>
		</Row>
		{user?.uid ? (
			mode === "links"
				? <RecentLinks uid={user.uid} emptyView={() => <EmptyView mode={"links"} />} errorView={() => <ErrorView />} />
				: <RecentFiles uid={user.uid} emptyView={() => <EmptyView mode={"files"} />} errorView={() => <ErrorView />} />
		) : isLoading ? (
			<RecentListPlaceholder />
		) : (
			<EmptyView mode={mode} />
		)}
	</>;
}
