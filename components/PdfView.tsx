"use client";

import React, { useState } from "react";
import Pagination from "react-bootstrap/Pagination";
import { Document as Pdf, Page as PdfPage, DocumentProps as PdfProps, pdfjs } from "react-pdf";
import styles from "../styles/pdf-view.module.scss";
import { mergeNames } from "../utils/mergeNames";
import { initPdfWorker } from "../utils/pdf";
import { useNumber } from "../utils/useNumber";
import { DownloadProgress } from "./DownloadProgress";

initPdfWorker(pdfjs);

export const PdfView: React.FunctionComponent<React.PropsWithChildren<PdfViewProps>> = ({
	file,
	onLoadSuccess,
	size: initSize,
	width,
	height,
	...rest
}) => {
	const [pageCount, setPageCount] = useState(0);
	const [activePage, page] = useNumber(0);
	const [size, setSize] = useState(initSize || 0);
	const [loadedSize, setLoadedSize] = useState(0);

	return (
		<Pdf
			file={file}
			className={mergeNames(styles.pdfView, "mw-100")}
			externalLinkTarget="_blank"
			onLoadProgress={({ loaded, total }) => {
				if (size !== total) setSize(total);
				setLoadedSize(loaded);
			}}
			onLoadSuccess={(pdf) => {
				setPageCount(pdf.numPages);
				onLoadSuccess?.(pdf);
			}}
			loading={<div className="d-flex justify-content-center mw-100">
				<DownloadProgress as="div" label="Loading PDF" size={size} loaded={loadedSize} style={{ width, height }} />
			</div>}
			onLoadError={error => {
				console.error("Error loading PDF:", error);
			}}
			error={<div>
				<p>Unable to display the PDF file.</p>
			</div>}
			{...rest}
		>
			<div className="position-relative h-100">
				<PdfPage
					key={`page-${activePage}`}
					className="d-flex justify-content-center mw-100 overflow-hidden"
					pageIndex={activePage}
					renderAnnotationLayer={false}
					renderTextLayer={false} 
					onLoadError={console.error}
					onRenderError={console.error}
				/>
				{pageCount > 1 && (
					<Pagination className="position-absolute bottom-0 start-50 translate-middle-x opacity-75" size="sm">
						<Pagination.First onClick={() => page.to(0)} disabled={activePage === 0} />
						<Pagination.Item onClick={page.decrease} disabled={activePage <= 0}>
							Prev
						</Pagination.Item>
						<Pagination.Item active>{activePage + 1}</Pagination.Item>
						<Pagination.Item onClick={page.increase} disabled={activePage + 1 >= pageCount}>
							Next
						</Pagination.Item>
						<Pagination.Last onClick={() => page.to(pageCount - 1)} disabled={activePage === pageCount - 1} />
					</Pagination>
				)}
			</div>
		</Pdf>
	);
};

export default PdfView;

export interface PdfViewProps extends PdfProps {
	width?: number;
	height?: number;
	size?: number;
}
