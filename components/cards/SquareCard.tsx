import cloudflareLoader from "@/utils/images/cloudflareLoader";
import { Timestamp } from "@firebase/firestore";
import { formatDate } from "@thegoodcompany/common-utils-js";
import Image, { ImageProps } from "next/legacy/image";
import React from "react";
import Card from "react-bootstrap/Card";
import Placeholder from "react-bootstrap/Placeholder";
import styles from "../../styles/cards/square-card.module.scss";
import { logClick } from "../../utils/analytics";
import { hasExpired } from "../../utils/dates";
import { mergeNames } from "../../utils/mergeNames";
import { getSolidStallImage } from "../../visuals/stallData";
import { Button } from "../Button";
import { CopyButton } from "../CopyButton";
import { Icon } from "../Icon";
import Link from "../Link";
import { Shimmer } from "../Shimmer";
import { ShortLoading } from "../ShortLoading";

const NoPreview: React.FunctionComponent<
	React.PropsWithChildren<
		React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> & { icon?: string }
	>
> = ({ className, icon = "description", ...rest }) => {
	return (
		<div
			className={mergeNames(
				styles.noPreview,
				"d-flex flex-column align-items-center justify-content-center text-muted",
				className,
			)}
			{...rest}
		>
			<Icon name={icon} size="lg" />
			<p className="fs-5">Preview unavailable!</p>
		</div>
	);
};

const LoadingPreview: React.FunctionComponent<
	React.PropsWithChildren<React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>>
> = ({ className, ...rest }) => {
	return (
		<div className={mergeNames(styles.loadingPreview, className)} {...rest}>
			<ShortLoading />
		</div>
	);
};

export const SquareCardPlaceholder: React.FunctionComponent = () => {
	return (
		<Card className={mergeNames(styles.squareCard, "border-feedback")}>
			<Card.Header>
				<Link className="stretched-link text-decoration-none text-reset" href="#">
					<Shimmer className="w-100 py-1" xs={1} pattern={<Placeholder className="w-75" />} size="lg" />
				</Link>
			</Card.Header>
			<div className={mergeNames(styles.cardPreview)}>
				<div className={styles.cardImg} />
			</div>
			<Card.Footer className="d-flex flex-row align-items-center">
				<span className="d-block text-muted text-truncate w-50">
					<Shimmer className="w-100 py-1" pattern={<Placeholder className="w-100" />} size="lg" />
				</span>
				<Button
					className={mergeNames(styles.btnShare, "ms-auto")}
					variant="outline-secondary"
					left={<Icon name="" size="sm" />}
					disabled
				/>
			</Card.Footer>
		</Card>
	);
};

export const SquareCard: React.FunctionComponent<SquareCardProps> = ({
		title,
		href,
		thumbnail,
		createTime,
		expireTime,
		onThumbnailError,
	}) => {
	return (
		<Card className={mergeNames(styles.squareCard, "border-feedback")}>
			<Card.Header>
				<Link className="stretched-link text-decoration-none text-reset" href={href}>
					<span className="d-block text-truncate">
						{title}
					</span>
				</Link>
			</Card.Header>
			<div className={mergeNames(styles.cardPreview)}>
				{thumbnail ? (
					<Image
						className={styles.cardImg}
						placeholder="blur"
						src={thumbnail}
						alt="link preview"
						objectFit="cover"
						layout="fill"
						sizes="(max-width: 576px) 100vw, (max-width: 768px) 50vw, (max-width: 992px) 33vw, 25vw"
						quality={50}
						loader={cloudflareLoader}
						blurDataURL={getSolidStallImage()}
						onError={onThumbnailError}
					/>
				) : thumbnail === null ? (
					<NoPreview />
				) : (
					<LoadingPreview />
				)}
			</div>
			<Card.Footer className="d-flex flex-row align-items-center">
				<span className="d-block text-muted text-truncate">
					{createTime && formatDate(createTime.toDate(), "short", "year", "month", "day")}
					{hasExpired(expireTime, createTime) && (
						<>
							{" "}
							(<em>expired</em>)
						</>
					)}
				</span>
				<CopyButton
					className={mergeNames(styles.btnShare, "ms-auto")}
					variant="outline-secondary"
					content={href}
					left={<Icon name="link" size="sm" />}
					onClick={() => logClick("share_file_card")}
				/>
			</Card.Footer>
		</Card>
	);
};

export interface SquareCardProps {
	title: string,
	thumbnail?: string | null,
	createTime?: Timestamp,
	expireTime?: Timestamp | null,
	href: string,
	onThumbnailError?: ImageProps["onError"],
}
