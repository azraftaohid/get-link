"use client";

export function initModernizr() {
	if (typeof window === "undefined") return;
	require("./modernizr-custom");
}

export function getModernizr(): ModernizrStatic | undefined {
	return typeof Modernizr === "undefined" ? undefined : Modernizr;
}
