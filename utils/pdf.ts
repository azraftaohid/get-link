/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

export function canInitPdfWorker() {
	return typeof window !== "undefined";
}

function initPdfWorker0(pdfjs: PdfJs) {
	pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
}

export function initPdfWorker<T extends PdfJs | undefined>(
	pdfjs?: T
): undefined extends T ? Promise<PdfJs | undefined> : PdfJs {
	if (!pdfjs) {
		if (!canInitPdfWorker()) return Promise.resolve(undefined) as any;
		return import("react-pdf").then((value) => {
			initPdfWorker0(value.pdfjs);
			return value.pdfjs;
		}) as any;
	}

	initPdfWorker0(pdfjs);
	return pdfjs as any;
}

export type PdfJs = typeof import("pdfjs-dist/types/src/pdf");
