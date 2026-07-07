
/**
 * Read a file as a data URL.
 * 
 * @param file The file to read.
 * @returns A promise that resolves with the data URL of the file.
 */
export function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => {
            if (typeof reader.result === "string") {
                resolve(reader.result);
            } else {
                reject(new Error("Unable to read image file."));
            }
        });
        reader.addEventListener("error", () => reject(reader.error ?? new Error("Unable to read image file.")));
        reader.readAsDataURL(file);
    });
}

/**
 * Check if a file is an image file based on its MIME type.
 * 
 * @param file - File to check 
 * @returns True if the file is an image file, false otherwise.
 */
export function isImageFile(file: File): boolean {
    const imageFilePattern = /^image\//;
    return imageFilePattern.test(file.type);
}
