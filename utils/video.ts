
export async function extractFrame(video: HTMLVideoElement, at: number, type?: "image/png"): Promise<Blob | undefined> {
    console.debug(`extracting frame from video [at: ${at}, duration: ${video.duration}]`);
    return new Promise((res, rej) => {
        video.addEventListener("seeked", () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) return rej(new Error("cavas context is undefined"));

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);

            canvas.toBlob((blob => {
                if (blob) res(blob);
                else rej(new Error("canvas could not be transformed into Blob"));
            }), type || "image/png");
        }, { once: true });

        video.currentTime = at;
    });
}

export async function generateThumbnailFromVideo(src: string, type?: Parameters<typeof extractFrame>[2]): Promise<Blob | undefined> {
    const element = document.createElement("video");

    return new Promise((res, rej) => {
        element.onloadeddata = async () => {
            try {
                const url = await extractFrame(element, element.duration / 3 | 0, type);
                res(url);
            } catch (error) {
                rej(error);
            }
        };
        element.onerror = (_evt, _src, _lineno, _colno, err) => rej(err);
        
        element.src = src;
    });
}