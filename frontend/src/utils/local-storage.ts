
export const STORAGE_PREFIX = "dt3d-ha-";

/**
 * Localstgorage util to read and write data from local storage.
 */
export class LocalStorage {
	/**
	 * Get local storage object.
	 */
	public static storage = (): Storage | null => {
		if (typeof window === "undefined" || !window.localStorage) {
			return null;
		}

		return window.localStorage;
	};

	/**
	 * Add prefix to a key before read/write to storage.
	 * 
	 * @param key - Key to store value
	 * @returns - Key with prefix
	 */
	public static prefix = (key: string) => `${STORAGE_PREFIX}${key}`;

	/**
	 * Write a value to local storage.
	 * 
	 * @param key - Key to store value
	 * @param value - Value to store.
	 */
	public static write(key: string, value: unknown): void {
		const storage = this.storage();
		storage.setItem(this.prefix(key), JSON.stringify(value));
	};

	/**
	 * Read a object from storage.
	 * @param key - Key to read value from.
	 * @param defaultValue - Default value in case key does not exist.
	 * @returns Value read from the storage.
	 */
	public static read(key: string, defaultValue: any = null): any {
		const storage = this.storage();
		const value = storage.getItem(this.prefix(key));
		return value ? (JSON.parse(value)) : defaultValue;
	};

}

