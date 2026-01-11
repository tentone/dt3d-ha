export type MeshOption = {
	type: string;
	label: string;
};

export const MESH_OPTIONS: MeshOption[] = [
	{ type: "cube", label: "Cube" },
	{ type: "sphere", label: "Sphere" },
	{ type: "plane", label: "Plane" },
	{ type: "capsule", label: "Capsule" },
	{ type: "circle", label: "Circle" },
	{ type: "cone", label: "Cone" },
	{ type: "cylinder", label: "Cylinder" },
	{ type: "dodecahedron", label: "Dodecahedron" },
	{ type: "icosahedron", label: "Icosahedron" },
	{ type: "lathe", label: "Lathe" },
	{ type: "octahedron", label: "Octahedron" },
	{ type: "polyhedron", label: "Polyhedron" },
	{ type: "ring", label: "Ring" },
	{ type: "shape", label: "Shape" },
	{ type: "extrude", label: "Extrude" },
	{ type: "tetrahedron", label: "Tetrahedron" },
	{ type: "torus", label: "Torus" },
	{ type: "torusKnot", label: "Torus Knot" },
	{ type: "tube", label: "Tube" },
];
