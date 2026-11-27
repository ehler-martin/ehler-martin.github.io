import * as THREE from './vendor/three.module.js';

// Read the static GLB subset produced by this project's PRC converter.
export function createModel(buffer){
 const view=new DataView(buffer);
 if(view.getUint32(0,true)!==0x46546c67)throw Error('Invalid model');
 const jsonLength=view.getUint32(12,true);
 const gltf=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,jsonLength)));
 const binStart=28+jsonLength;
 const access=i=>{
  const a=gltf.accessors[i],b=gltf.bufferViews[a.bufferView];
  return new (a.componentType===5126?Float32Array:Uint32Array)(buffer,binStart+(b.byteOffset||0)+(a.byteOffset||0),a.count*(a.type==='VEC3'?3:1));
 };
 const root=new THREE.Group();
 for(const node of gltf.nodes){
  if(node.extras?.layer==='axes')continue;
  for(const primitive of gltf.meshes[node.mesh].primitives){
   const geometry=new THREE.BufferGeometry();
   geometry.setAttribute('position',new THREE.BufferAttribute(access(primitive.attributes.POSITION),3));
   if(primitive.attributes.NORMAL!==undefined)geometry.setAttribute('normal',new THREE.BufferAttribute(access(primitive.attributes.NORMAL),3));
   geometry.setIndex(new THREE.BufferAttribute(access(primitive.indices),1));
   const rgba=gltf.materials[primitive.material].pbrMetallicRoughness.baseColorFactor;
   const color=new THREE.Color().setRGB(rgba[0],rgba[1],rgba[2],THREE.SRGBColorSpace);
   const properties={color,opacity:rgba[3],transparent:rgba[3]<1,depthWrite:rgba[3]>=1};
   const mesh=primitive.mode===1
    ?new THREE.LineSegments(geometry,new THREE.LineBasicMaterial(properties))
    :new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({...properties,roughness:.48,metalness:0,side:THREE.DoubleSide}));
   mesh.name=node.name;mesh.userData.layer=node.extras?.layer;
   mesh.renderOrder=rgba[3]<1?2:0;
   root.add(mesh);
  }
 }
 const bounds=new THREE.Box3().setFromObject(root),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
 const scale=2.65/Math.max(size.x,size.y,size.z);
 root.position.copy(center).multiplyScalar(-scale);root.scale.setScalar(scale);
 return root;
}
