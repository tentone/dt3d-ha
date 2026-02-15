import type {Material} from "three";
import {BoxGeometry, CapsuleGeometry, CircleGeometry, ConeGeometry, CylinderGeometry, DodecahedronGeometry, IcosahedronGeometry, Mesh, OctahedronGeometry, PlaneGeometry, RingGeometry, SphereGeometry, TetrahedronGeometry, TorusGeometry, TorusKnotGeometry} from "three";

export type MeshOption = {
	type: string;
	label: string;
};

export const MESH_OPTIONS: MeshOption[] = [
	{type: "cube", label: "Cube"},
	{type: "sphere", label: "Sphere"},
	{type: "plane", label: "Plane"},
	{type: "capsule", label: "Capsule"},
	{type: "circle", label: "Circle"},
	{type: "cone", label: "Cone"},
	{type: "cylinder", label: "Cylinder"},
	{type: "dodecahedron", label: "Dodecahedron"},
	{type: "icosahedron", label: "Icosahedron"},
	{type: "octahedron", label: "Octahedron"},
	{type: "ring", label: "Ring"},
	{type: "tetrahedron", label: "Tetrahedron"},
	{type: "torus", label: "Torus"},
	{type: "torusKnot", label: "Torus Knot"},
];


export function createMeshObject(type: string, material: Material): Mesh {
	let object: Mesh = null;

	switch (type) {
		case "cube": {
			object = new Mesh(new BoxGeometry(), material);
			object.name = "Cube";
			break;
		}
		case "sphere": {
			object = new Mesh(new SphereGeometry(0.6, 32, 16), material);
			object.name = "Sphere";
			break;
		}
		case "plane": {
			object = new Mesh(new PlaneGeometry(1, 1, 1), material);
			object.rotation.x = -Math.PI / 2;
			object.position.y = -1;
			object.name = "Plane";
			break;
		}
		case "capsule": {
			object = new Mesh(new CapsuleGeometry(0.4, 1, 6, 12), material);
			object.name = "Capsule";
			break;
		}
		case "circle": {
			object = new Mesh(new CircleGeometry(0.6, 32), material);
			object.name = "Circle";
			break;
		}
		case "cone": {
			object = new Mesh(new ConeGeometry(0.5, 1, 32), material);
			object.name = "Cone";
			break;
		}
		case "cylinder": {
			object = new Mesh(new CylinderGeometry(0.4, 0.4, 1, 32), material);
			object.name = "Cylinder";
			break;
		}
		case "dodecahedron": {
			object = new Mesh(new DodecahedronGeometry(0.6), material);
			object.name = "Dodecahedron";
			break;
		}
		case "icosahedron": {
			object = new Mesh(new IcosahedronGeometry(0.6), material);
			object.name = "Icosahedron";
			break;
		}
		case "octahedron": {
			object = new Mesh(new OctahedronGeometry(0.6), material);
			object.name = "Octahedron";
			break;
		}
		case "ring": {
			object = new Mesh(new RingGeometry(0.3, 0.6, 32), material);
			object.name = "Ring";
			break;
		}
		case "tetrahedron": {
			object = new Mesh(new TetrahedronGeometry(0.6), material);
			object.name = "Tetrahedron";
			break;
		}
		case "torus": {
			object = new Mesh(new TorusGeometry(0.5, 0.2, 16, 60), material);
			object.name = "Torus";
			break;
		}
		case "torusKnot": {
			object = new Mesh(new TorusKnotGeometry(0.4, 0.15, 80, 12), material);
			object.name = "Torus Knot";
			break;
		}
		default:
			break;
	}

	return object;
}
