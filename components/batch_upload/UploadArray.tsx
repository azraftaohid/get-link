import React, { useContext } from "react";
import Stack from "react-bootstrap/Stack";
import { shallowHash } from "../../utils/files";
import { FileUpload } from "../FileUpload";
import { BatchUploadConfigContext, BatchUploadContext } from "./BatchUpload";

export const UploadArray: React.FunctionComponent<UploadArrayProps> = () => {
	const { files } = useContext(BatchUploadContext);
	const { link, method, startOrder = 0 } = useContext(BatchUploadConfigContext);

	return <>
		<Stack direction="vertical" gap={3}>
			{files.map((file, i) => <FileUpload
				key={shallowHash(file)}
				link={link}
				file={file}
				method={method}
				order={startOrder + i}
			/>)}
		</Stack>
	</>;
};

export type UploadArrayProps = Record<string, never>;
