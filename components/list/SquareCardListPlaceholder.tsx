import React from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { SquareCardPlaceholder } from "../cards/SquareCard";

export const SquareCardListPlaceholder: React.FunctionComponent<{ limit?: number }> = ({ limit = 12 }) => {
	return (
		<Row className="g-4" xs={1} sm={2} md={3} lg={4}>
			{new Array(limit).fill(null).map((_v, i) => (
				<Col key={`col-ph-${i}`}>
					<SquareCardPlaceholder />
				</Col>
			))}
		</Row>
	);
};
