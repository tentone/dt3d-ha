export type EditorActionType =
	| "add-object"
	| "update-object"
	| "delete-object"
	| "move-object";

/**
 * A reversible editor mutation. The scene mutation is synchronous so the
 * editor responds immediately; sync persists the resulting state afterwards.
 */
export type EditorAction = {
	type: EditorActionType;
	label: string;
	undo: () => void;
	redo: () => void;
	sync: (operation: "record" | "undo" | "redo") => Promise<unknown> | void;
};

type ActionStackOptions = {
	onSyncError?: (error: unknown, action: EditorAction) => void;
};

/**
 * Linear undo/redo history whose server writes are committed in action order.
 */
export class ActionStack {
	private undoActions: EditorAction[] = [];

	private redoActions: EditorAction[] = [];

	private syncQueue: Promise<void> = Promise.resolve();

	private readonly onSyncError: (
		error: unknown,
		action: EditorAction,
	) => void;

	public constructor(options: ActionStackOptions = {}) {
		this.onSyncError =
			options.onSyncError ??
			((error, action) => {
				console.error(`DT3D: Failed to sync ${action.type} action`, error);
			});
	}

	public get canUndo(): boolean {
		return this.undoActions.length > 0;
	}

	public get canRedo(): boolean {
		return this.redoActions.length > 0;
	}

	/**
	 * Record a mutation that has already been applied locally.
	 */
	public record(action: EditorAction): void {
		this.undoActions.push(action);
		this.redoActions = [];
		this.commit(action, "record");
	}

	public undo(): boolean {
		const action = this.undoActions.pop();
		if (!action) {
			return false;
		}

		action.undo();
		this.redoActions.push(action);
		this.commit(action, "undo");
		return true;
	}

	public redo(): boolean {
		const action = this.redoActions.pop();
		if (!action) {
			return false;
		}

		action.redo();
		this.undoActions.push(action);
		this.commit(action, "redo");
		return true;
	}

	/**
	 * Start a new history without cancelling writes already queued for the
	 * previous space.
	 */
	public clear(): void {
		this.undoActions = [];
		this.redoActions = [];
	}

	/**
	 * Exposed for tests and callers that need to await persistence.
	 */
	public flush(): Promise<void> {
		return this.syncQueue;
	}

	private commit(
		action: EditorAction,
		operation: "record" | "undo" | "redo",
	): void {
		this.syncQueue = this.syncQueue.then(async () => {
			try {
				await action.sync(operation);
			} catch (error) {
				this.onSyncError(error, action);
			}
		});
	}
}
