import { Button, ButtonProps } from "@/components/Button";
import { Tier, friendlyTier } from "@/utils/tiers";
import React, { useState } from "react";
import Card from "react-bootstrap/Card";
import CardBody from "react-bootstrap/CardBody";
import CardFooter from "react-bootstrap/CardFooter";
import CardHeader from "react-bootstrap/CardHeader";
import CardSubtitle from "react-bootstrap/CardSubtitle";
import CardTitle from "react-bootstrap/CardTitle";

export const TierCard: React.FunctionComponent<TierCardProps> = ({
	id,
	subtitle,
	features,
	limits,
	pricing,
	isCurrent,
	onChose,
	disabled,
	children,
}) => {
	const [btnState, setBtnState] = useState<ButtonProps["state"]>("none");

	return <>
		<Card>
			<CardHeader>
				<CardTitle>{friendlyTier[id]}</CardTitle>
				<CardSubtitle>{subtitle}</CardSubtitle>
			</CardHeader>
			<CardBody>
				Feature list includes:
				<ul>{features.map((feat, i) => <li key={`feat-${i}`}>{feat}</li>)}</ul>
				{limits && <>
					Limitations:
					<ul>{limits.map((limit, i) => <li key={`limit-${i}`}>{limit}</li>)}</ul>
				</>}
				{children}
			</CardBody>
			<CardFooter className="d-flex flex-row align-items-center">
				<span>{pricing}</span>
				<Button 
					className="ms-auto" 
					state={btnState} 
					disabled={isCurrent || disabled}
					onClick={() => {
						setBtnState("loading");
						Promise.resolve(onChose?.(id)).finally(() => {
							setBtnState("none");
						});
					}}
				>
					{isCurrent ? "Current" : "Choose"}
				</Button>
			</CardFooter>
		</Card>
	</>;
};

export interface TierCardProps {
	id: Tier,
	subtitle: string,
	features: React.ReactNode[],
	limits?: React.ReactNode[],
	pricing: React.ReactNode,
	onChose?: (id: Tier) => unknown,
	isCurrent?: boolean,
	disabled?: boolean,
	children?: React.ReactNode,
}
