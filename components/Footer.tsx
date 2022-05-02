import dynamic from "next/dynamic";
import React, { useState } from "react";
import Container from "react-bootstrap/Container";
import { Button, ButtonProps } from "./Button";
import { Loading } from "./Loading";

const ReportDialog = dynamic(() => import("./ReportDialog"), { 
	loading: () => <Loading /> 
});

const FooterAction: React.FunctionComponent<React.PropsWithChildren<ButtonProps>> = (props) => {
	return <Button className="text-muted" variant="link" size="sm" {...props}/>;
};

export const Footer: React.FunctionComponent<React.PropsWithChildren<unknown>> = () => {
	const [showReport, setShowReport] = useState(false);

	return <footer id="footer" className="mt-auto py-4">
		<Container id="footer-container" className="d-flex flex-column">
			<div className="d-flex flex-row mx-auto">
				<FooterAction onClick={() => setShowReport(true)}>
					Feedback
				</FooterAction>
				<div className="vr" />
				<FooterAction href="/policies" target="_blank">
					Policies
				</FooterAction>
				<div className="vr" />
				<FooterAction href="https://www.facebook.com/getlinksoft" target="_blank">
					Facebook
				</FooterAction>
			</div>
			<small className="text-center text-muted">Author <a className="text-reset" href="https://github.com/azraftaohid" target="_blank" rel="noreferrer">Azraf Taohid</a></small>
		</Container>
		<ReportDialog show={showReport} onHide={() => setShowReport(false)} />
	</footer>;
};