import type {Texture} from "three";
import {
	Mesh,
	OrthographicCamera,
	PlaneGeometry,
	Scene,
	ShaderMaterial,
	SRGBColorSpace,
	WebGLRenderer,
} from "three";

/** Export source pixels, independently of the material's UV and sampler settings. */
export async function downloadTextureImage(
	texture: Texture,
	fallbackName: string,
): Promise<void> {
	if (
		"isCubeTexture" in texture ||
		"isDataArrayTexture" in texture ||
		"isData3DTexture" in texture
	) {
		throw new Error("This texture cannot be exported as a single image.");
	}
	const image = texture.image as CanvasImageSource & {
		naturalWidth?: number;
		naturalHeight?: number;
		videoWidth?: number;
		videoHeight?: number;
		width?: number;
		height?: number;
	};
	const width = image?.naturalWidth || image?.videoWidth || image?.width;
	const height = image?.naturalHeight || image?.videoHeight || image?.height;
	if (!(width > 0 && height > 0))
		throw new Error("The texture image is not ready.");
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext("2d");
	if (!context) throw new Error("Unable to create the texture image.");
	if ("isCompressedTexture" in texture || "isDataTexture" in texture) {
		// A separate renderer keeps exporting from changing the live scene.
		const renderer = new WebGLRenderer({
			alpha: true,
			premultipliedAlpha: false,
		});
		const geometry = new PlaneGeometry(2, 2);
		const material = new ShaderMaterial({
			uniforms: {
				map: {value: texture},
				encodeSRGB: {value: texture.colorSpace === SRGBColorSpace},
				flipY: {value: texture.flipY},
			},
			vertexShader: `varying vec2 vUv;
				void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
			fragmentShader: `uniform sampler2D map;
				uniform bool encodeSRGB;
				uniform bool flipY;
				varying vec2 vUv;
				void main() {
					vec2 uv = vec2(vUv.x, flipY ? vUv.y : 1.0 - vUv.y);
					gl_FragColor = texture2D(map, uv);
					if (encodeSRGB) gl_FragColor = sRGBTransferOETF(gl_FragColor);
				}`,
			depthTest: false,
			depthWrite: false,
		});
		try {
			if (Math.max(width, height) > renderer.capabilities.maxTextureSize) {
				throw new Error("The texture exceeds the supported image size.");
			}
			renderer.setSize(width, height, false);
			const scene = new Scene();
			scene.add(new Mesh(geometry, material));
			renderer.render(scene, new OrthographicCamera());
			context.drawImage(renderer.domElement, 0, 0);
		} finally {
			geometry.dispose();
			material.dispose();
			renderer.dispose();
			renderer.forceContextLoss();
		}
	} else {
		context.drawImage(image, 0, 0, width, height);
	}
	const blob = await new Promise<Blob>((resolve, reject) => {
		canvas.toBlob(
			(result) =>
				result
					? resolve(result)
					: reject(new Error("Unable to encode the texture image.")),
			"image/png",
		);
	});
	const name = (texture.name || fallbackName || "texture")
		.replace(/\.[a-z0-9]+$/i, "")
		.replace(/[<>:"/\\|?*]/g, "_");
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `${name || "texture"}.png`;
	document.body.appendChild(link);
	try {
		link.click();
	} finally {
		link.remove();
		window.setTimeout(() => URL.revokeObjectURL(url), 1000);
	}
}
