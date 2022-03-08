export function canInitPdfWorker() {
	return typeof window !== "undefined";
}

function initPdfWorker0(pdfjs: PdfJs) {
	pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
}

export function initPdfWorker<T extends PdfJs | undefined>(pdfjs?: T): undefined extends T ? Promise<PdfJs | undefined> : PdfJs {
	if (!pdfjs) {
		if (!canInitPdfWorker()) return Promise.resolve(undefined) as any;
		return import("react-pdf/dist/esm/entry.webpack").then(value => {
			initPdfWorker0(value.pdfjs);
			return value.pdfjs;
		}) as any;
	}

	pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
	return pdfjs as any;
}

export type PdfJs = typeof import("C:/Users/azraf/codes/get-link/node_modules/@types/react-pdf/node_modules/pdfjs-dist/types/src/pdf");