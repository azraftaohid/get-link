import React from "react";
import ProgressBar from "react-bootstrap/ProgressBar";
import { mergeNames } from "../utils/mergeNames";
import { formatSize } from "../utils/strings";

export const DownloadProgress: React.FunctionComponent<React.PropsWithChildren<DownloadProgressProps>> = ({
    className,
    as = "alert",
    label = "Downloading",
    loaded,
    size,
    ...rest
}) => {
    return <div 
        role="alert" 
        className={mergeNames(as === "alert" ? "alert alert-primary" : "px-2 py-3", "mw-100", className)} 
        {...rest}
    >
        <p><b>{label}:</b> {formatSize(loaded)} out of {formatSize(size)}.</p>
        <ProgressBar variant={as === "div" ? "info" : "primary"} now={(loaded / size) * 100 | 0} />
    </div>;
};

export interface DownloadProgressProps extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
    as?: "alert" | "div",
    label?: React.ReactNode,
    loaded: number,
    size: number,
}