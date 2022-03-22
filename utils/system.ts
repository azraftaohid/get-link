/**
 * Copies {@code text} into clipboard
 * @param text the content to copy
 * @returns a promise fulfilled when {@code text} is copied successfully or rejects otherwise
 */
 export async function copyToClipboard(text: string): Promise<void> {
    if (navigator.clipboard) {
        try {
            await navigator.clipboard.writeText(text);
            console.debug("Text copied to clipboard");
        } catch (error) {
            console.error("Failed to copy text to clipboard via navigator", error);
            copyToClipboardFallback(text);
        }
    } else {
        copyToClipboardFallback(text);
    }
}

function copyToClipboardFallback(text: string) {
    const textElement = document.createElement("textarea");
    textElement.value = text;

    textElement.style.top = "0";
    textElement.style.left = "0";
    textElement.style.position = "fixed";

    document.body.appendChild(textElement);
    textElement.focus();
    textElement.select();
    
    const successful = document.execCommand("copy");
    document.body.removeChild(textElement);

    if (!successful) {
        throw new Error("failed to copy text using fallback method");
    } else {
        console.debug("Text copied with fallback method");
    }
}