import {
	CanvasTexture,
	LinearFilter,
	LinearMipMapLinearFilter,
	Sprite,
	SpriteMaterial,
	SRGBColorSpace,
} from "three";

/**
 * Options to configure the text sprite.
 */
type TextSpriteOptions = {
	fontFamily?: string;
	fontWeight?: string; // e.g. "normal" | "bold" | "600"
	color?: string; // fill style
	background?: string; // background fill (optional)
	padding?: number; // in CSS px
	borderRadius?: number;
	borderColor?: string;
	borderWidth?: number; // in CSS px
	align?: CanvasTextAlign; // "left" | "center" | "right"
	baseline?: CanvasTextBaseline; // "top" | "middle" | etc
};

export class TextSprite extends Sprite {
	private readonly canvas: HTMLCanvasElement;

	private readonly ctx: CanvasRenderingContext2D;

	private readonly texture: CanvasTexture;

	private text: string;

	private resolution: number; // font size in CSS px

	private options: Required<TextSpriteOptions>;

	public constructor(text: string,resolution: number = 64,options: TextSpriteOptions = {},) {
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			throw new Error("2D canvas context not available");
		}

		const texture = new CanvasTexture(canvas);
		texture.colorSpace = SRGBColorSpace;
		texture.magFilter = LinearFilter;
		texture.minFilter = LinearMipMapLinearFilter;
		texture.generateMipmaps = true;

		const material = new SpriteMaterial({
			map: texture,
			transparent: true,
			depthWrite: false,
		});

		super(material);

		this.canvas = canvas;
		this.ctx = ctx;
		this.texture = texture;

		this.text = text;
		this.resolution = resolution;

		this.options = {
			fontFamily: options.fontFamily ?? "sans-serif",
			fontWeight: options.fontWeight ?? "normal",
			color: options.color ?? "#ffffff",
			background: options.background ?? "",
			padding: options.padding ?? 4,
			borderRadius: options.borderRadius ?? 0,
			borderColor: options.borderColor ?? "",
			borderWidth: options.borderWidth ?? 0,
			align: options.align ?? "left",
			baseline: options.baseline ?? "top",
		};
        
		this.setText(text);
	}

    /**
     * Change text on the sprite.
     * 
     * @param text - New text to be presented.
     */
	public setText(text: string) {
		this.text = text;
		this.redraw();
	}

    /**
     * Redraw the content of the sprite.
     */
	private redraw() {
		const ctx = this.ctx;
		const canvas = this.canvas;

		const {
			fontFamily,
			fontWeight,
			color,
			background,
			padding,
			borderRadius,
			borderColor,
			borderWidth,
			align,
			baseline,
		} = this.options;

		// Configure font for measuring
		const font = `${fontWeight} ${this.resolution}px ${fontFamily}`;
		ctx.font = font;
		ctx.textAlign = align;
		ctx.textBaseline = baseline;

		// Measure text width (in CSS px)
		const metrics = ctx.measureText(this.text);

		// Prefer bounding boxes if available; otherwise estimate from font size
		const textWidth = Math.ceil((metrics.actualBoundingBoxLeft ?? 0) + (metrics.actualBoundingBoxRight ?? metrics.width),);
		const ascent = metrics.actualBoundingBoxAscent ?? this.resolution * 0.8;
		const descent = metrics.actualBoundingBoxDescent ?? this.resolution * 0.2;
		const textHeight = Math.ceil(ascent + descent);

		const pad = padding;
		const bw = borderWidth;

		// Final canvas size in CSS px
		const cssW = Math.max(1, textWidth + 2 * (pad + bw));
		const cssH = Math.max(1, textHeight + 2 * (pad + bw));

		// Set backing store size in real pixels for crisp rendering
		canvas.width = Math.max(1, Math.ceil(cssW));
		canvas.height = Math.max(1, Math.ceil(cssH));

		// Clear
		ctx.clearRect(0, 0, cssW, cssH);

		// Background (optional)
		if (background) {
			ctx.fillStyle = background;
			if (borderRadius > 0) {
				this.roundRect(ctx, 0, 0, cssW, cssH, borderRadius);
				ctx.fill();
			} else {
				ctx.fillRect(0, 0, cssW, cssH);
			}
		}

		// Border (optional)
		if (bw > 0 && borderColor) {
			ctx.strokeStyle = borderColor;
			ctx.lineWidth = bw;
			if (borderRadius > 0) {
				this.roundRect(
					ctx,
					bw / 2,
					bw / 2,
					cssW - bw,
					cssH - bw,
					Math.max(0, borderRadius - bw / 2),
				);
				ctx.stroke();
			} else {
				ctx.strokeRect(bw / 2, bw / 2, cssW - bw, cssH - bw);
			}
		}

		// Text position based on alignment/baseline
		const x =
			align === "left"
				? pad + bw
				: align === "center"
					? cssW / 2
					: cssW - (pad + bw);

		const y =
			baseline === "top"
				? pad + bw
				: baseline === "middle"
					? cssH / 2
					: baseline === "bottom"
						? cssH - (pad + bw)
						: // common default if someone sets baseline="alphabetic"
							pad + bw + ascent;

		// Draw text
		ctx.font = font;
		ctx.fillStyle = color;
		ctx.textAlign = align;
		ctx.textBaseline = baseline;
		ctx.fillText(this.text, x, y);

		// Update texture and sprite scale
		this.texture.needsUpdate = true;

		// Sprite scale in world units
		this.scale.set(cssW, cssH, 1);
		this.scale.multiplyScalar(0.005);
	}

    /**
     * Draw a rounded rectangle into the canvas.
     * 
     * @param ctx - Canvas context
     * @param x - x
     * @param y - y
     * @param w - Width
     * @param h - Height
     * @param r - Radius of the corners
     */
	private roundRect(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		w: number,
		h: number,
		r: number,
	) {
		const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
		ctx.beginPath();
		ctx.moveTo(x + radius, y);
		ctx.arcTo(x + w, y, x + w, y + h, radius);
		ctx.arcTo(x + w, y + h, x, y + h, radius);
		ctx.arcTo(x, y + h, x, y, radius);
		ctx.arcTo(x, y, x + w, y, radius);
		ctx.closePath();
	}
}
