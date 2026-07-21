const LOCAL_ASSET_URL_PREFIX = "dt3d-local-assets/";
const droppedFileAssetPaths = new WeakMap<File, string>();

type LocalAssetEntry = {
	file: File;
	path: string;
	url: string;
};

type DroppedFileSystemEntry = {
	isDirectory: boolean;
	isFile: boolean;
	name: string;
	createReader?: () => {
		readEntries: (
			success: (entries: DroppedFileSystemEntry[]) => void,
			failure?: (error: DOMException) => void,
		) => void;
	};
	file?: (
		success: (file: File) => void,
		failure?: (error: DOMException) => void,
	) => void;
};

export const getFileExtension = (file: File): string | null =>
	file.name.split(".").pop()?.toLowerCase() ?? null;

const normalizeAssetPath = (path: string): string => {
	let decodedPath = path;
	try {
		decodedPath = decodeURIComponent(path);
	} catch {
		// Keep malformed URI sequences unchanged so they can still be matched by name.
	}

	const segments: string[] = [];
	for (const segment of decodedPath.replace(/\\/g, "/").split("/")) {
		if (!segment || segment === ".") continue;
		if (segment === "..") segments.pop();
		else segments.push(segment);
	}
	return segments.join("/");
};

const getFileAssetPath = (file: File): string =>
	normalizeAssetPath(
		droppedFileAssetPaths.get(file) ||
			(file as File & {webkitRelativePath?: string}).webkitRelativePath ||
			file.name,
	);

const getAssetDirectory = (path: string): string => {
	const separatorIndex = path.lastIndexOf("/");
	return separatorIndex < 0 ? "" : path.slice(0, separatorIndex + 1);
};

/**
 * A selected set of local files with stable virtual URLs and relative-path lookup.
 */
export class LocalFileAssets {
	private readonly entries: LocalAssetEntry[];
	private readonly entriesByPath = new Map<string, LocalAssetEntry>();
	private readonly entriesByName = new Map<string, LocalAssetEntry | null>();

	constructor(files: File[]) {
		this.entries = files.map((file) => ({
			file,
			path: getFileAssetPath(file),
			url: URL.createObjectURL(file),
		}));

		for (const entry of this.entries) {
			this.entriesByPath.set(entry.path.toLowerCase(), entry);
			const nameKey = entry.file.name.toLowerCase();
			this.entriesByName.set(
				nameKey,
				this.entriesByName.has(nameKey) ? null : entry,
			);
		}
	}

	public getVirtualUrl(file: File): string {
		return `${LOCAL_ASSET_URL_PREFIX}${getFileAssetPath(file)}`;
	}

	public resolveUrl(url: string): string {
		if (/^(?:blob:|data:)/i.test(url)) return url;
		return this.findEntry(url)?.url ?? url;
	}

	public findReferencedFile(reference: string, sourceFile: File): File | null {
		const sourceDirectory = getAssetDirectory(getFileAssetPath(sourceFile));
		const entry =
			this.findEntry(`${sourceDirectory}${reference}`) ??
			this.findEntry(reference);
		return entry?.file ?? null;
	}

	public findSiblingFiles(sourceFile: File, extension: string): File[] {
		const sourceDirectory = getAssetDirectory(
			getFileAssetPath(sourceFile),
		).toLowerCase();
		return this.entries
			.filter(
				(entry) =>
					getAssetDirectory(entry.path).toLowerCase() === sourceDirectory &&
					getFileExtension(entry.file) === extension.toLowerCase(),
			)
			.map((entry) => entry.file);
	}

	public dispose(): void {
		for (const entry of this.entries) URL.revokeObjectURL(entry.url);
	}

	private findEntry(path: string): LocalAssetEntry | null {
		const normalizedPath = normalizeAssetPath(
			path.replace(/[?#].*$/, "").replace(LOCAL_ASSET_URL_PREFIX, ""),
		);
		const exactEntry = this.entriesByPath.get(normalizedPath.toLowerCase());
		if (exactEntry) return exactEntry;

		const name = normalizedPath.split("/").pop()?.toLowerCase();
		return name ? (this.entriesByName.get(name) ?? null) : null;
	}
}

/** Open a browser picker for multiple files or one complete directory. */
export function pickLocalFiles(
	host: HTMLElement,
	directory = false,
): Promise<File[]> {
	return new Promise((resolve) => {
		const input = document.createElement("input");
		input.type = "file";
		input.multiple = true;
		if (directory) input.setAttribute("webkitdirectory", "");
		input.style.display = "none";

		const complete = (files: File[] = []) => {
			input.remove();
			resolve(files);
		};
		input.addEventListener("change", () =>
			complete(Array.from(input.files ?? [])),
		);
		input.addEventListener("cancel", () => complete());

		host.appendChild(input);
		input.click();
	});
}

const readDroppedFile = (entry: DroppedFileSystemEntry): Promise<File> =>
	new Promise((resolve, reject) => {
		if (!entry.file) {
			reject(new Error(`Unable to read dropped file ${entry.name}`));
			return;
		}
		entry.file(resolve, reject);
	});

async function readDroppedDirectory(
	entry: DroppedFileSystemEntry,
): Promise<DroppedFileSystemEntry[]> {
	const reader = entry.createReader?.();
	if (!reader) return [];

	const entries: DroppedFileSystemEntry[] = [];
	while (true) {
		const batch = await new Promise<DroppedFileSystemEntry[]>(
			(resolve, reject) => reader.readEntries(resolve, reject),
		);
		if (batch.length === 0) return entries;
		entries.push(...batch);
	}
}

async function collectDroppedEntryFiles(
	entry: DroppedFileSystemEntry,
	parentPath = "",
): Promise<File[]> {
	const entryPath = `${parentPath}${entry.name}`;
	if (entry.isFile) {
		const file = await readDroppedFile(entry);
		droppedFileAssetPaths.set(file, entryPath);
		return [file];
	}

	if (!entry.isDirectory) return [];
	const children = await readDroppedDirectory(entry);
	const files = await Promise.all(
		children.map((child) =>
			collectDroppedEntryFiles(child, `${entryPath}/`),
		),
	);
	return files.flat();
}

/** Recursively collect files from a mixed file/directory drag selection. */
export async function collectDroppedFiles(
	dataTransfer: DataTransfer,
): Promise<File[]> {
	const items = Array.from(dataTransfer.items).filter(
		(item) => item.kind === "file",
	);
	if (items.length === 0) return Array.from(dataTransfer.files);

	const fileGroups = await Promise.all(
		items.map(async (item) => {
			const entry = (
				item as DataTransferItem & {
					webkitGetAsEntry?: () => DroppedFileSystemEntry | null;
				}
			).webkitGetAsEntry?.();
			if (entry) {
				try {
					return await collectDroppedEntryFiles(entry);
				} catch (error) {
					console.warn(`Unable to read dropped entry ${entry.name}`, error);
					return [];
				}
			}

			const file = item.getAsFile();
			return file ? [file] : [];
		}),
	);
	return fileGroups.flat();
}

/** Read a file as text. */
export function readFileAsText(file: File): Promise<string> {
	return file.text();
}

/** Read a file as a data URL. */
export function readFileAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.addEventListener("load", () => {
			if (typeof reader.result === "string") resolve(reader.result);
			else reject(new Error("Unable to read image file."));
		});
		reader.addEventListener("error", () =>
			reject(reader.error ?? new Error("Unable to read image file.")),
		);
		reader.readAsDataURL(file);
	});
}

/** Check whether a file has an image MIME type. */
export function isImageFile(file: File): boolean {
	return /^image\//.test(file.type);
}

/** Find the first image in a file selection. */
export function findImageFile(files: Iterable<File>): File | null {
	for (const file of files) {
		if (isImageFile(file)) return file;
	}
	return null;
}
