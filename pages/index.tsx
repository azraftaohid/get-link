import { useAuthUser } from "@react-query-firebase/auth";
import { getAuth, signInAnonymously } from "firebase/auth";
import { uploadBytesResumable, UploadMetadata } from "firebase/storage";
import { nanoid } from "nanoid";
import type { NextPage } from "next";
import { useRouter } from "next/router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Alert from "react-bootstrap/Alert";
import FormLabel from "react-bootstrap/FormLabel";
import ProgressBar from "react-bootstrap/ProgressBar";
import { DropzoneOptions, useDropzone } from "react-dropzone";
import { Conditional } from "../components/Conditional";
import { FilePreview } from "../components/FilePreview";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { Icon } from "../components/Icon";
import { Link } from "../components/Link";
import { Metadata } from "../components/Meta";
import { PageContainer } from "../components/PageContainer";
import { PageContent } from "../components/PageContent";
import { captureFile, createFID, getFileContentRef } from "../models/files";
import styles from "../styles/home.module.scss";
import { StatusCode } from "../utils/common";
import { acceptedFileFormats, createFileLink, FileCustomMetadata, getFileType, getImageDimension, getPdfDimension, getVideoDimension } from "../utils/files";
import { mergeNames } from "../utils/mergeNames";
import { formatSize } from "../utils/strings";
import { useToast } from "../utils/useToast";

const Home: NextPage = () => {
  const router = useRouter();
  const { makeToast } = useToast();
  const { data: user } = useAuthUser(["user"], getAuth());

  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [url, setUrl] = useState<string>();
  const [statuses, setStatuses] = useState<StatusCode[]>([]);

  const resetState = useRef(() => {
    setFile(null);
    setProgress(0);
  });

  const appendStatus = useRef((status: StatusCode) => {
    setStatuses(c => {
      if (c.includes(status)) return [...c];
      return [...c, status];
    });
  });

  const handleDrop = useCallback<NonNullable<DropzoneOptions["onDrop"]>>((dropped, rejects) => {
    if (!dropped.length) {
      if (!rejects.length) return;

      let errMssg: string;
      if (rejects.length === 1 && rejects[0].errors.length === 1) {
        const err = rejects[0].errors[0];
        errMssg = `Upload cancelled: ${err.code}`;
        console.debug(`actual type: ${rejects[0].file.type}`);
      } else {
        errMssg = `Upload cancelled for the following files\n${rejects.map(reject => {
          return `${reject.file.name}: ${reject.errors.map(err => err.code).join(", ")}`;
        }).join("\n")}`;
      }

      makeToast(errMssg, "error");

      return;
    }

    setFile(dropped[0]);
  }, [makeToast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    accept: acceptedFileFormats,
    onDrop: handleDrop,
    maxFiles: 1,
    maxSize: (100 * 1024 * 1024) - 1,
    multiple: false,
  });

  const uid = user?.uid;
  useEffect(() => {
    if (!file) return;
    if (!uid) {
      console.debug("signing in user anonymously");
      signInAnonymously(getAuth()).catch(err => {
        console.error(`error signing in user [cause: ${err}]`);
        appendStatus.current("auth:sign-in-error");
      });

      return;
    }

    if (file.size >= 100 * 1024 * 1024) {
      console.warn(`file too large [accepted: 100 MB, actual: ${formatSize(file.size)}]`);
      appendStatus.current("files:too-large");
      resetState.current();

      return;
    }

    const task = (async () => {
      const [mime, ext] = await getFileType(file); // respect user specified extension
      console.debug(`mime: ${mime}; ext: ${ext}`);

      const fid = createFID(nanoid(12) + ext, uid);
      const ref = getFileContentRef(fid);
      const metadata: UploadMetadata = { contentType: mime };

      try {
        let localUrl: string | undefined;
        let dimension: [number | undefined, number | undefined] | undefined;

        if (mime?.startsWith("image")) {
          localUrl = URL.createObjectURL(file);
          dimension = await getImageDimension(localUrl);
        } else if (mime?.startsWith("video")) {
          localUrl = URL.createObjectURL(file);
          dimension = await getVideoDimension(localUrl);
        } else if (mime === "application/pdf") {
          localUrl = URL.createObjectURL(file);
          dimension = await getPdfDimension(localUrl);
        }

        if (localUrl) URL.revokeObjectURL(localUrl);
        if (dimension) {
          metadata.customMetadata = { width: dimension[0], height: dimension[1] } as FileCustomMetadata;
        }
      } catch (error) {
          console.error(`error getting dimension from selected file [cause: ${error}]`);
      }

      const upload = uploadBytesResumable(ref, file, metadata);
      const unsubscribe = upload.on("state_changed", async snapshot => {
        setProgress(Math.floor((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
      }, err => {
        if (err.code === "storage/canceled") {
          console.info("upload cancelled");
          appendStatus.current("files:upload-cancelled");
        } else {
          console.error(`upload failed [code: ${err.code}; cause: ${err.message}]`);
          appendStatus.current("files:upload-error");
        }

        resetState.current();
      }, async () => {
        appendStatus.current("files:creating-link");

        try {
          const doc = await captureFile(fid, uid);
          console.debug(`file captured at ${doc.path}`);

          setUrl(createFileLink(doc.id));
          setStatuses(["page:redirecting"]);
        } catch (error) {
          console.debug(`capture failed [cause; ${error}]`);
          appendStatus.current("files:capture-error");
        }
      });

      return { upload, unsubscribe };
    })();

    return () => {
      task.then(({ upload, unsubscribe }) => {
        if (upload.snapshot.state === "running" || upload.snapshot.state === "paused") {
          upload.snapshot.task.cancel();
          // eslint-disable-next-line react-hooks/exhaustive-deps
          appendStatus.current("files:upload-cancelled");
          console.log(`upload cancelled [from_state: ${upload.snapshot.state}]`);
        }

        unsubscribe();
      });
    };
  }, [file, uid]);

  useEffect(() => {
    if (url) router.push(url);
  }, [router, url]);

  return <PageContainer>
    <Metadata 
      title="Get Link" 
      description="Create and instantly share link of files and images."
      image="https://firebasestorage.googleapis.com/v0/b/project-hubble.appspot.com/o/system%2Fcover.png?alt=media&token=69155660-7770-4749-8525-df707b46f4c8" 
    />
    <Header />
    <PageContent>
      <Conditional in={statuses.includes("files:upload-cancelled")}>
        <Alert variant="warning" dismissible onClose={() => setStatuses(c => {
          const i = c.indexOf("files:upload-cancelled");
          if (i === -1) return c;

          return [...c.slice(0, i), ...c.slice(i + 1)];
        })}>
          Upload cancelled.
        </Alert>
      </Conditional>
      <Conditional in={statuses.some(s => (["files:unknown-error", "files:capture-error", "files:upload-error", "auth:sign-in-error", "files:too-large"] as StatusCode[]).includes(s))}>
        <Alert variant="danger">
          There was an error. Please try again!<br /> 
          Code: {statuses.map((s, i, arr) => <Link key={s} className="alert-link" href={`/technical#${encodeURIComponent(s)}`} newTab>
            {s}{i < arr.length - 1 && ", "}
          </Link>)}.
        </Alert>
      </Conditional>
      <Conditional in={!!file}>
        <FormLabel aria-label="file-upload-progress">
          Uploading
        </FormLabel>
        <FilePreview className="mb-3" file={file} onClose={() => setFile(null)} closable={progress < 100} />
        <ProgressBar id="file-upload-progress" animated now={progress}/>
        <small className="text-muted">
          {(statuses.includes("page:redirecting")) 
            ? <><Link variant="reset" href={url || "#"}>Redirecting</Link>&hellip;</>
            : statuses.includes("files:creating-link") 
            ? <>Creating link.</> 
            : <>{progress}% completed.</>}
        </small>
      </Conditional>
      <Conditional in={!file}>
        <button {...getRootProps({
          id: "upload-area", 
          type: "button", 
          className: mergeNames(styles.uploadArea, "btn btn-outline-secondary", isDragActive && "active"),
        })}>
          <input {...getInputProps()}/>
          <Icon name="file_upload" size="lg" />
          <p className="fs-5 mb-0">{!isDragActive ? "Upload file" : "Drop to upload"}</p>
          <small className="text-mute">(Expires after 14 days)</small>
        </button>
      </Conditional>
    </PageContent>
    <Footer />
  </PageContainer>;
};

export default Home;