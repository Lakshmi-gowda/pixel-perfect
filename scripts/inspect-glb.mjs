import { readFileSync } from 'node:fs';
const file = readFileSync(process.argv[2] || 'public/models/heart.glb');
if (file.toString('ascii', 0, 4) !== 'glTF') throw new Error('Not a GLB');
const length = file.readUInt32LE(12);
const data = JSON.parse(file.toString('utf8', 20, 20 + length));
const accessors = data.accessors || [];
let triangles = 0, vertices = 0;
for (const mesh of data.meshes || []) for (const primitive of mesh.primitives) {
  vertices += accessors[primitive.attributes.POSITION]?.count || 0;
  triangles += (accessors[primitive.indices]?.count || accessors[primitive.attributes.POSITION]?.count || 0) / 3;
}
console.log(JSON.stringify({ bytes: file.length, nodes: data.nodes, meshes: data.meshes?.map(m => m.name), materials: data.materials?.map(m => m.name), animations: data.animations || [], skins: data.skins || [], morphTargets: data.meshes?.flatMap(m => m.primitives.flatMap(p => p.targets || [])), triangles, vertices, bounds: data.meshes?.flatMap(m => m.primitives.map(p => ({ min: accessors[p.attributes.POSITION]?.min, max: accessors[p.attributes.POSITION]?.max }))), attribution: data.asset }, null, 2));