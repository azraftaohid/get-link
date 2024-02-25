import React, { useContext } from "react";
import Stack from "react-bootstrap/Stack";
import { shallowHash } from "../../utils/files";
import { FileUpload, FileUploadProps } from "../FileUpload";
import { BatchUploadConfigContext, BatchUploadContext } from "./BatchUpload";

export const UploadArray: React.FunctionComponent<UploadArrayProps> = () => {
	const { files, pushOrders } = useContext(BatchUploadContext);
	const { link, method } = useContext(BatchUploadConfigContext);

	const logError: FileUploadProps["onError"] = (file, err) => {
		console.error(`error uploading file [filename: ${file.name}; cause: ${err}]`);
	};

	return <>
		<Stack direction="vertical" gap={3}>
			{files.map((file, i) => <FileUpload
				key={shallowHash(file)}
				link={link}
				file={file}
				method={method}
				order={pushOrders.has(file) ? pushOrders.get(file) : i}
				onError={logError}
			/>)}
		</Stack>
	</>;
};

export type UploadArrayProps = Record<string, never>;
