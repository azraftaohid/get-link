import React from "react";
import Container from "react-bootstrap/Container";

export const Footer: React.FunctionComponent = () => {
	return <footer id="footer" className="mt-auto py-4">
		<Container id="footer-container" className="d-flex justify-content-center">
			<small className="text-muted">Author <a className="text-reset" href="https://github.com/azraftaohid" target="_blank" rel="noreferrer">Azraf Taohid</a></small>
		</Container>
	</footer>;
};