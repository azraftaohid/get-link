import React, { useState } from "react";
import Pagination from "react-bootstrap/Pagination";
import { DocumentProps as PDFProps } from "react-pdf";
import { Document as PDF, Page as PDFPage, pdfjs } from "react-pdf/dist/esm/entry.webpack";
import styles from "../styles/pdf-view.module.scss";
import { mergeNames } from "../utils/mergeNames";
import { initPdfWorker } from "../utils/pdf";
import { useNumber } from "../utils/useNumber";
import { DownloadProgress } from "./DownloadProgress";

initPdfWorker(pdfjs);

export const PDFView: React.FunctionComponent<React.PropsWithChildren<PdfViewProps>> = ({
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
		<PDF
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
			loading={
				<DownloadProgress as="div" label="Loading PDF" size={size} loaded={loadedSize} style={{ width, height }} />
			}
			{...rest}
		>
			<div className="position-relative">
				<PDFPage
					key={`page-${activePage}`}
					className="mw-100 overflow-hidden"
					pageIndex={activePage}
					renderAnnotationLayer={false}
					renderTextLayer={false} />
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
		</PDF>
	);
};

export default PDFView;

export interface PdfViewProps extends PDFProps {
	width?: number;
	height?: number;
	size?: number;
}
