import React from "react";

export default function Layout({ children }: Readonly<React.PropsWithChildren>) {
	return <div className="my-2 mx-3">
		{children}
	</div>;
}
