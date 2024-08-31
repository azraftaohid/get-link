import { mergeNames } from "@/utils/mergeNames";
import { HashTag } from "./HashTag";

export const Heading: React.FunctionComponent<React.PropsWithChildren<React.AllHTMLAttributes<HTMLElement>>> = ({
	children,
}) => {
	return <h1 className="text-uppercase">{children}</h1>;
};

export const Topic: React.FunctionComponent<React.PropsWithChildren<React.AllHTMLAttributes<HTMLElement>>> = ({
	id,
	children,
	...rest
}) => {
	return (
		<div id={id} className="d-flex flex-row align-items-center mt-5">
			<h2 className="text-uppercase my-0" {...rest}>
				{children}
			</h2>
			{id && <HashTag tag={id} />}
		</div>
	);
};

export const Lead: React.FunctionComponent<React.PropsWithChildren<React.AllHTMLAttributes<HTMLElement>>> = ({
	id,
	children,
	...rest
}) => {
	return (
		<div id={id} className="d-flex flex-row align-items-center mt-5">
			<h3 className="text-uppercase my-0" {...rest}>
				{children}
			</h3>
			{id && <HashTag tag={id} />}
		</div>
	);
};

export const Proposition: React.FunctionComponent<React.PropsWithChildren<React.AllHTMLAttributes<HTMLElement>>> = ({
	className,
	children,
	...rest
}) => {
	return (
		<div className={mergeNames("mt-3", className)} {...rest}>
			{children}
		</div>
	);
};
