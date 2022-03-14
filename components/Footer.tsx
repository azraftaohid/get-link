import dynamic from "next/dynamic";
import React, { useState } from "react";
import Container from "react-bootstrap/Container";
import { Button } from "./Button";
import { Loading } from "./Loading";

const ReportDialog = dynamic(() => import("./ReportDialog"), { 
	loading: () => <Loading /> 
});

export const Footer: React.FunctionComponent = () => {
	const [showReport, setShowReport] = useState(false);

	return <footer id="footer" className="mt-auto py-4">
		<Container id="footer-container" className="d-flex flex-column">
			<Button className="text-muted mx-auto" variant="link" size="sm" onClick={() => setShowReport(true)}>
				Report a problem
			</Button>
			<small className="text-center text-muted">Author <a className="text-reset" href="https://github.com/azraftaohid" target="_blank" rel="noreferrer">Azraf Taohid</a></small>
		</Container>
		<ReportDialog show={showReport} onHide={() => setShowReport(false)} />
	</footer>;
};