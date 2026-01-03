const STORAGE_PREFIX = "dt3d-ha-";

const getStorage = (): Storage | null => {
	if (typeof window === "undefined" || !window.localStorage) {
		return null;
	}

	return window.localStorage;
};

const withPrefix = (key: string) => `${STORAGE_PREFIX}${key}`;

export const writeLocalStorageObject = (key: string, value: unknown): void => {
	const storage = getStorage();
	if (!storage) {
		return;
	}

	try {
		storage.setItem(withPrefix(key), JSON.stringify(value));
	} catch (error) {
		// eslint-disable-next-line no-console
		console.warn("DT3D: Unable to store data in localStorage", error);
	}
};

export const readLocalStorageObject = <T>(
	key: string,
	defaultValue: T | null = null,
): T | null => {
	const storage = getStorage();
	if (!storage) {
		return defaultValue;
	}

	try {
		const value = storage.getItem(withPrefix(key));
		return value ? (JSON.parse(value) as T) : defaultValue;
	} catch (error) {
		// eslint-disable-next-line no-console
		console.warn("DT3D: Unable to read data from localStorage", error);
		return defaultValue;
	}
};
