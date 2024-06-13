import React from "react";

export const Section: React.FunctionComponent<React.PropsWithChildren<{ noSep?: boolean }>> = ({ noSep, children }) => {
	return (
		<>
			{children}
			{!noSep && <hr className="my-5" />}
		</>
	);
};

export const Lead: React.FunctionComponent<React.PropsWithChildren<React.AllHTMLAttributes<HTMLElement>>> = ({
	children,
	...rest
}) => {
	return (
		<h3 className="mb-3" {...rest}>
			{children}
		</h3>
	);
};

export const Proposition: React.FunctionComponent<React.PropsWithChildren<React.AllHTMLAttributes<HTMLElement>>> = ({
	children,
	...rest
}) => {
	return <div {...rest}>{children}</div>;
};

export const QAndA: React.FunctionComponent<
	React.PropsWithChildren<{ question: React.ReactNode; answer: React.ReactNode }>
> = ({ question, answer }) => {
	return (
		<>
			<h4 className="mt-5 mb-3">{question}</h4>
			<div>{answer}</div>
		</>
	);
};
