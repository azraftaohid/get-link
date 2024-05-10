"use client";

import { WithChildren } from "@/utils/children";
import { usePathname, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect, useRef, useState } from "react";
import { ShortLoading } from "./ShortLoading";

const notImplemented = () => { throw Error("Function not implemented!"); };

export const RouteIndicatorContext = React.createContext<RouteIndicatorContextInterface>({
	start: notImplemented,
	stop: notImplemented,
});

function RouteIndicatorProviderInternal({ children }: WithChildren) {
	const pathname = usePathname();
	const search = useSearchParams();

	const [show, setShow] = useState(false);
	const [iteration, setIteration] = useState(0);

	const value = useRef({
		start: () => {
			setIteration(c => Math.min(0, --c));
			setShow(true);
		},
		stop: () => setShow(false),
	});

	useEffect(() => {
		setIteration(c => Math.max(1, ++c));
		const timer = setTimeout(() => value.current.stop(), 250); // progress bar transition time set to .3s via css
		
		return () => clearTimeout(timer);
	}, [pathname, search]);

	return <RouteIndicatorContext.Provider value={value.current}>
		{show && <ShortLoading 
			className="position-fixed top-0 start-0 w-100 z-10000" 
			initPercentage={iteration > 0 ? 100 : iteration} 
		/>}
		{children}
	</RouteIndicatorContext.Provider>;
}

export default function RouteIndicatorProvider(props : WithChildren) {
	return <Suspense>
		<RouteIndicatorProviderInternal {...props} />
	</Suspense>;
}

export interface RouteIndicatorContextInterface {
	start: () => void,
	stop: () => void,
}
