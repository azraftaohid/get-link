/**
 * Copies {@code text} into clipboard
 * @param text the content to copy
 * @returns a promise fulfilled when {@code text} is copied successfully or rejects otherwise
 */
 export async function copyToClipboard(text: string): Promise<boolean> {
    if (navigator.clipboard) {
        try {
            await navigator.clipboard.writeText(text);
            console.debug("Text copied to clipboard");
            return true;
        } catch (error) {
            console.error("Failed to copy text to clipboard via navigator", error);
            return copyToClipboardFallback(text);
        }
    } else {
        return copyToClipboardFallback(text);
    }
}

function copyToClipboardFallback(text: string): boolean {
    const textElement = document.createElement("textarea");
    textElement.value = text;

    textElement.style.top = "0";
    textElement.style.left = "0";
    textElement.style.position = "fixed";

    document.body.appendChild(textElement);
    textElement.focus();
    textElement.select();
    
    let success = false;
    try {
        const successful = document.execCommand("copy");
        if (successful) {
            console.debug("Text copied to clipboard");
            success = true;
        } else {
            console.error("Failed to copy text to clipboard");
        }
    } catch (error) {
        console.error(`Failed to copy text to clipboard [cause: ${error}]`);
    }

    document.body.removeChild(textElement);
    return success;
}