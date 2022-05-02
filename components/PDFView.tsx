import React, { useState } from "react";
import { Pagination } from "react-bootstrap";
import { DocumentProps as PDFProps } from "react-pdf";
import { Document as PDF, Page as PDFPage, pdfjs } from "react-pdf/dist/esm/entry.webpack";
import styles from "../styles/pdf-view.module.scss";
import { mergeNames } from "../utils/mergeNames";
import { initPdfWorker } from "../utils/pdf";
import { useNumber } from "../utils/useNumber";

initPdfWorker(pdfjs);

export const PDFView: React.FunctionComponent<React.PropsWithChildren<PDFProps>> = ({ file, onLoadSuccess, ...rest }) => {
	const [pageCount, setPageCount] = useState(0);
	const [activePage, page] = useNumber(0);
	
	return <PDF 
		file={file} 
		className={mergeNames(styles.pdfView, "mw-100")}
		externalLinkTarget="_blank" 
		onLoadSuccess={(pdf) => {
			setPageCount(pdf.numPages);
			onLoadSuccess?.(pdf);
		}} 
		{...rest}
	>
		<PDFPage 
			key={`page-${activePage}`} 
			className="mw-100 overflow-hidden" 
			pageIndex={activePage} 
		/>
		{pageCount > 1 && <Pagination className="justify-content-center mt-3 mb-2" size="sm">
			<Pagination.First onClick={() => page.to(0)} disabled={activePage === 0} />
			<Pagination.Item onClick={page.decrease} disabled={activePage <= 0}>Prev</Pagination.Item>
			<Pagination.Item active>{activePage + 1}</Pagination.Item>
			<Pagination.Item onClick={page.increase} disabled={activePage + 1 >= pageCount }>Next</Pagination.Item>
			<Pagination.Last onClick={() => page.to(pageCount - 1)} disabled={activePage === pageCount - 1} />
		</Pagination>}
	</PDF>;
};

export default PDFView;

export interface PdfViewProps extends PDFProps {

}