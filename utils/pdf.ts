const PDFJS_VERSION = "4.8.69";

export function canInitPdfWorker() {
	return typeof window !== "undefined";
}

function initPdfWorker0(pdfjs: PdfJs) {
	pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.mjs`;
}

export function initPdfWorker(): Promise<PdfJs> | undefined {
	if (!canInitPdfWorker()) return undefined;

	const loadPdfjs = new Promise<PdfJs>((res, rej) => {
		const { pdfjsLib } = window;
		if (pdfjsLib) return res(pdfjsLib);
	
		const script = document.createElement("script");
		script.src = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.mjs`;
		script.type = "module";
		script.onload = () => {
			console.debug("pdfjs loaded successfully.");
			initPdfWorker0(window.pdfjsLib);
			res(window.pdfjsLib);
		};
		script.onerror = (error) => {
			console.error(error);
			rej(new Error("Can't load pdfjs from CDN. Check logs."));
		}
	
		document.body.appendChild(script);
	});

	return loadPdfjs;
}

export type PdfJs = typeof window.pdfjsLib;
