import { NextPage } from "next";
import React, { useState } from "react";
import Alert from "react-bootstrap/Alert";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import ToggleButton from "react-bootstrap/ToggleButton";
import ToggleButtonGroup from "react-bootstrap/ToggleButtonGroup";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { Link } from "../components/Link";
import { Metadata } from "../components/Meta";
import { PageContainer } from "../components/PageContainer";
import { PageContent } from "../components/PageContent";
import { useUser } from "../utils/useUser";
import { RecentLinks } from "../components/list/RecentLinks";
import { RecentFiles } from "../components/list/RecentFiles";
import { RecentListPlaceholder } from "../components/list/RecentListPlaceholder";

const EmptyView: React.FunctionComponent<React.PropsWithChildren<{ mode: Mode }>> = ({ mode }) => {
	return (
		<Alert>
			<Alert.Heading>No {mode} generated yet!</Alert.Heading>
			Upload your first file{" "}
			<Link variant="alert" href="/">
				here
			</Link>{" "}
			then comeback.
		</Alert>
	);
};

const ErrorView: React.FunctionComponent<React.PropsWithChildren<unknown>> = () => {
	return (
		<Alert variant="danger">
			<Alert.Heading>Something went wrong!</Alert.Heading>
			We couldn&apos;t fetch display you the data you&apos;re looking for. Please try again later, or if this
			issue persist, file a report.
		</Alert>
	);
};

const Dashboard: NextPage = () => {
	const { user, isLoading } = useUser();
	const [mode, setMode] = useState<Mode>("links");

	return (
		<PageContainer>
			<Metadata title="Dashboard - Get Link" description="See your upload history and more." />
			<Header />
			<PageContent>
				<Row>
					<Col className="me-auto" xs="auto">
						<h1 className="mb-4">Recents</h1>
					</Col>
					<Col xs="auto">
						<ToggleButtonGroup className="ms-auto" name="mode-btn-radio" value={mode} onChange={setMode} type="radio">
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
			</PageContent>
			<Footer />
		</PageContainer>
	);
};

export default Dashboard;

type Mode = "files" | "links";
