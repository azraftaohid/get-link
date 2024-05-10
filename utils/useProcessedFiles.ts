import { useEffect, useMemo, useRef, useState } from "react";
import { FileData, FileField } from "../models/files";
import { ProcessedFileData, makeProcessedFile } from "./processedFiles";

export const useProcessedFiles = (docs: FileData[], lid?: string): UseProcessedFiles => {
	const [status, setStatus] = useState<UseProcessedFiles["status"]>("none");

	const [mapping, setMapping] = useState<Record<string, ProcessedFileData>>({ });
	const mappingRef = useRef(mapping);
	mappingRef.current = mapping;

	useEffect(() => {
		setStatus("loading");

		let hasInturrputed = false;
		const tasks: Promise<unknown>[] = [];

		const newMapping: Record<string, ProcessedFileData> = { };
		docs.forEach(doc => {
			const fid = doc[FileField.FID];
			if (!fid) {
				console.warn("fid not present on file doc; skipping to process file");
				return;
			}
			
			const current = mappingRef.current[fid];
			if (current) {
				newMapping[fid] = current;
				return;
			}

			tasks.push(makeProcessedFile(fid, lid, doc).then(value => {
				newMapping[fid] = value;
			}).catch(err => {
				if (err.code === "storage/object-not-found") return;
				throw err;
			}));
		});

		Promise.all(tasks)
			.then(() => {
				if (hasInturrputed) return;

				setMapping(newMapping);
				setStatus("success");
			}).catch(err => {
				if (hasInturrputed) return;

				console.error(`error processing files [cause: ${err}]`);
				setStatus("error");
			});

		return () => { hasInturrputed = true; };
	}, [docs, lid]);

	return {
		status,
		files: useMemo(() => Object.values(mapping), [mapping]).sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0)),
	};
};

export interface UseProcessedFiles {
	files: ProcessedFileData[],
	status: "none" | "success" | "error" | "loading",
}


