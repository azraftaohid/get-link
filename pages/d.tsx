import { NextPage } from "next";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { LegacyRef, useEffect, useRef, useState } from "react";
import Alert from "react-bootstrap/Alert";
import { Conditional } from "../components/Conditional";
import { DownloadProgress } from "../components/DownloadProgress";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { Loading } from "../components/Loading";
import { PageContainer } from "../components/PageContainer";
import { PageContent } from "../components/PageContent";
import { ClickEventContext } from "../utils/analytics";
import { directDownloadFromUrl } from "../utils/downloads";
import { FetchError } from "../utils/errors/FetchError";
import { compartDirectLink, isValidDirectLink, makeDirectLink } from "../utils/files";

const NLink = dynamic(() => import ("../components/Link"), { ssr: false });

export function makeDownloadParams(directLink: string, fileName: string, mechanism: ClickEventContext["mechanism"] = "browser_default") {
    try {
        const { path, token } = compartDirectLink(directLink);
        return `name=${fileName}&path=${path}&token=${token}&mechanism=${mechanism}`;
    } catch (error) {
        return `name=${fileName}&dl=${encodeURIComponent(directLink)}&mechanism=${mechanism}`;
    }
}

const Download: NextPage = () => {
    const router = useRouter();

    const aRef: LegacyRef<HTMLAnchorElement> = useRef(null);
    const hasClicked = useRef(false);
    
    const [error, setError] = useState<string>();
    const [size, setSize] = useState(0);
	const [downloaded, setDownloaded] = useState(0);
    const [eligError, setEligError] = useState(false);

    const name = router.query.name;
    const path = router.query.path;
    const token = router.query.token;
    const dl = router.query.dl;
    const mechanism = router.query.mechanism;

    let directLink: string | undefined;
    if (typeof dl === "string") directLink = decodeURIComponent(dl);
    else if (typeof path === "string" && typeof token === "string") directLink = makeDirectLink(path, token);

    useEffect(() => {
        if (hasClicked.current || !aRef.current) return;
        
        hasClicked.current = true;
        aRef.current.click();
    });

    useEffect(() => {
        setEligError(router.isReady);
    }, [router.isReady]);

    const directLinkIsValid = directLink && isValidDirectLink(directLink);
    const displayError = eligError && (!!error || !directLinkIsValid);

    return <PageContainer>
        <Header />
        <PageContent>
            <Conditional in={displayError}>
                <Alert variant="danger">
                    {error || "Invalid download link."}
                </Alert>
            </Conditional>
            <Conditional in={!displayError}><>
                <Conditional in={size === 0}><Loading /></Conditional>
                <Conditional in={size !== 0}><>
                    <DownloadProgress 
                        label={`Downloading${name ? ` ${name}` : ""}`} 
                        size={size} 
                        loaded={downloaded}
                    />
                    <NLink variant="reset" href={directLink || "#"} newTab>
                        Open instead
                    </NLink>
                </></Conditional>
                {directLinkIsValid && <a ref={aRef} 
                    className="text-reset"
                    href={directLink} 
                    tabIndex={1}
                    download={typeof name === "string" ? name : true}
                    onClick={async (evt) => {
                        if (mechanism as ClickEventContext["mechanism"]  !== "built-in") return;
                        evt.preventDefault();
                        
                        directDownloadFromUrl(evt.currentTarget.href, evt.currentTarget.download, (received, total) => {
                            if (size !== total) setSize(total);
                            setDownloaded(received);
                        }).catch(err => {
                            if (err instanceof FetchError && err.code === 404) {
                                setError("File is no longer available.");
                            } else {
                                window.open(directLink, "_blank");
                            }
                        });
                    }}
                />}
            </></Conditional>
        </PageContent>
        <Footer />
    </PageContainer>;
};

export default Download;