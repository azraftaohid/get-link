"use client";

import { RecentFiles } from "@/components/list/RecentFiles";
import { RecentLinks } from "@/components/list/RecentLinks";
import { RecentListPlaceholder } from "@/components/list/RecentListPlaceholder";
import { useUser } from "@/utils/useUser";
import { useEffect, useState } from "react";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import ToggleButton from "react-bootstrap/ToggleButton";
import ToggleButtonGroup from "react-bootstrap/ToggleButtonGroup";
import { EmptyView, ErrorView, detnModeFromHash } from "./helperComponents";

export default function Page() {
	const { user, isLoading } = useUser();
	const [mode, setMode] = useState(detnModeFromHash(typeof window !== "undefined" ? window.location.hash : "", "links"));

	useEffect(() => {
		const handler = (evt: HashChangeEvent) => {
			const url = new URL(evt.newURL);
			setMode(c => detnModeFromHash(url.hash, c));
		};

		window.addEventListener("hashchange", handler);
		return () => window.removeEventListener("hashchange", handler);
	}, []);

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
					onChange={(value) => window.location.hash = "#" + value}
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
