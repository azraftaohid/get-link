import React from "react";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { Shimmer } from "../Shimmer";
import Placeholder from "react-bootstrap/Placeholder";
import { SquareCardListPlaceholder } from "./SquareCardListPlaceholder";

export const RecentListPlaceholder: React.FunctionComponent<RecentListPlaceholderProps> = ({ limit }) => {
	return (
		<div>
			<SquareCardListPlaceholder limit={limit} />
			<Row className="mt-4">
				<Col className="mx-auto" md={5}>
					<Shimmer
						pattern={
							<Placeholder.Button
								className="w-100 justify-content-center placeholder"
								variant="outline-secondary"
								disabled
							/>
						}
					/>
				</Col>
			</Row>
		</div>
	);
};

export interface RecentListPlaceholderProps {
	limit?: number,
}
