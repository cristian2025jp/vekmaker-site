import * as THREE from '../../libs/three/three.module.js';
import { OrbitControls } from '../../libs/three/OrbitControls.js';
import { exportSTL } from '../../js/core/stl-exporter.js';

const LANG=['en','pt','ja'].includes(document.documentElement.lang)?document.documentElement.lang:'en';
const T={
 en:{ok:'Petal organizer generated successfully.',first:'Generate the organizer before downloading.',holder:'Container STL downloaded successfully.',lid:'Petal lid STL downloaded successfully.'},
 pt:{ok:'Organizador em pétalas gerado com sucesso.',first:'Gere o organizador antes de baixar.',holder:'STL do recipiente baixado com sucesso.',lid:'STL da tampa em formato de flor baixado com sucesso.'},
 ja:{ok:'花びら風オーガナイザーを生成しました。',first:'ダウンロードする前にオーガナイザーを生成してください。',holder:'本体STLをダウンロードしました。',lid:'花びら型ふたSTLをダウンロードしました。'}
}[LANG];

const WALL=2.0;
const BOTTOM=2.0;
const PETAL_DEPTH_MIN=2.2;
const PETAL_DEPTH_MAX=4.2;
const LID_WALL=2.0;
const LID_TOP=2.0;
const LID_SKIRT=6.0;
const LID_CLEARANCE=0.45;
const MAX_ARC_SEGMENT=1.15;

const E={};
let scene,camera,renderer,controls,root=null,holderMesh=null,lidMesh=null;

document.addEventListener('DOMContentLoaded',()=>{
 ['preview','type','diameter','height','petals','outer-diameter','outer-height','message','download-holder','download-lid','lid-result-row'].forEach(k=>E[k]=document.getElementById('po-'+k));
 if(!E.preview)return;
 initPreview(); bind(); applyTypeDefaults(); generate();
});

function initPreview(){
 scene=new THREE.Scene(); scene.background=new THREE.Color(0xf8f9fa);
 camera=new THREE.PerspectiveCamera(45,1,.1,5000);
 renderer=new THREE.WebGLRenderer({antialias:true}); renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
 E.preview.replaceChildren(renderer.domElement);
 controls=new OrbitControls(camera,renderer.domElement); controls.enableDamping=true; controls.dampingFactor=.08; controls.enablePan=false;
 scene.add(new THREE.AmbientLight(0xffffff,1.65));
 const key=new THREE.DirectionalLight(0xffffff,1.25); key.position.set(160,-210,180); scene.add(key);
 const fill=new THREE.DirectionalLight(0xffffff,.45); fill.position.set(-120,150,100); scene.add(fill);
 new ResizeObserver(resize).observe(E.preview); resize(); animate();
}

function bind(){
 E.type.addEventListener('change',()=>{applyTypeDefaults();generate();});
 ['diameter','height','petals'].forEach(k=>{E[k].addEventListener('input',generate);E[k].addEventListener('change',generate);});
 E['download-holder'].addEventListener('click',downloadHolder); E['download-lid'].addEventListener('click',downloadLid);
}

function applyTypeDefaults(){
 if(E.type.value==='lidded')E.height.value='80'; else if(E.type.value==='short')E.height.value='60'; else E.height.value='120';
}
function params(){return{type:E.type.value,diameter:+E.diameter.value,height:+E.height.value,petals:+E.petals.value};}
function calc(a){
 const innerR=a.diameter/2, valleyR=innerR+WALL, petalDepth=clamp(a.diameter*.04,PETAL_DEPTH_MIN,PETAL_DEPTH_MAX), maxOuterR=valleyR+petalDepth;
 return{innerR,valleyR,petalDepth,maxOuterR,outerDiameter:maxOuterR*2,holderH:a.height+BOTTOM,lidH:LID_SKIRT+LID_TOP};
}
function generate(){
 const a=params(),d=calc(a); removeModel(); const radialSegments=radialSegmentCount(d.maxOuterR,a.petals);
 holderMesh=new THREE.Mesh(makeHolderGeometry(a,d,radialSegments),material(0xf472b6)); root=new THREE.Group(); root.add(holderMesh);
 const hasLid=a.type==='lidded';
 if(hasLid){
  lidMesh=new THREE.Mesh(makeLidGeometry(a,d,radialSegments),material(0xfb9acb));
  const gap=Math.max(14,a.diameter*.16); lidMesh.position.x=d.maxOuterR+(d.maxOuterR+LID_CLEARANCE+LID_WALL)+gap; root.add(lidMesh);
 }
 scene.add(root); E['download-lid'].hidden=!hasLid; E['lid-result-row'].hidden=!hasLid; updateResults(d); fitCamera(a,d,hasLid); msg(T.ok,'success');
}
function makeHolderGeometry(a,d,radialSegments){
 const outerRows=buildRows(0,d.holderH,1.25),innerRows=buildRows(BOTTOM,d.holderH,1.25);
 const outerRadius=t=>petalOuterRadius(t,d.valleyR,d.petalDepth,a.petals),innerRadius=()=>d.innerR;
 return makeOpenContainerMesh({radialSegments,outerRows,innerRows,outerRadius,innerRadius});
}
function makeLidGeometry(a,d,radialSegments){
 const lidOuterBase=d.valleyR+LID_CLEARANCE+LID_WALL,lidInnerBase=d.valleyR+LID_CLEARANCE;
 const outerRows=buildRows(0,d.lidH,.8),innerRows=buildRows(0,LID_SKIRT,.8);
 const outerRadius=t=>petalOuterRadius(t,lidOuterBase,d.petalDepth,a.petals),innerRadius=t=>petalOuterRadius(t,lidInnerBase,d.petalDepth,a.petals);
 return makeOpenBottomLidMesh({radialSegments,outerRows,innerRows,outerRadius,innerRadius});
}
function petalOuterRadius(theta,valleyR,depth,petals){return valleyR+depth*(.5+.5*Math.cos(petals*theta));}

function makeOpenContainerMesh({radialSegments,outerRows,innerRows,outerRadius,innerRadius}){
 const vertices=[],indices=[]; const addVertex=(x,y,z)=>{const i=vertices.length/3;vertices.push(x,y,z);return i;};
 const addRing=(z,fn)=>{const ring=[];for(let i=0;i<radialSegments;i++){const t=i/radialSegments*Math.PI*2,r=fn(t,z);ring.push(addVertex(r*Math.cos(t),r*Math.sin(t),z));}return ring;};
 const quad=(a,b,c,d)=>indices.push(a,b,c,a,c,d);
 const outer=outerRows.map(z=>addRing(z,outerRadius)),inner=innerRows.map(z=>addRing(z,innerRadius));
 for(let j=0;j<outer.length-1;j++){for(let i=0;i<radialSegments;i++){const n=(i+1)%radialSegments;quad(outer[j][i],outer[j][n],outer[j+1][n],outer[j+1][i]);}}
 for(let j=0;j<inner.length-1;j++){for(let i=0;i<radialSegments;i++){const n=(i+1)%radialSegments;quad(inner[j][i],inner[j+1][i],inner[j+1][n],inner[j][n]);}}
 const obc=addVertex(0,0,outerRows[0]); for(let i=0;i<radialSegments;i++){const n=(i+1)%radialSegments;indices.push(obc,outer[0][n],outer[0][i]);}
 const ifc=addVertex(0,0,innerRows[0]); for(let i=0;i<radialSegments;i++){const n=(i+1)%radialSegments;indices.push(ifc,inner[0][i],inner[0][n]);}
 const ot=outer[outer.length-1],it=inner[inner.length-1]; for(let i=0;i<radialSegments;i++){const n=(i+1)%radialSegments;quad(ot[i],ot[n],it[n],it[i]);}
 return finishGeometry(vertices,indices);
}
function makeOpenBottomLidMesh({radialSegments,outerRows,innerRows,outerRadius,innerRadius}){
 const vertices=[],indices=[]; const addVertex=(x,y,z)=>{const i=vertices.length/3;vertices.push(x,y,z);return i;};
 const addRing=(z,fn)=>{const ring=[];for(let i=0;i<radialSegments;i++){const t=i/radialSegments*Math.PI*2,r=fn(t,z);ring.push(addVertex(r*Math.cos(t),r*Math.sin(t),z));}return ring;};
 const quad=(a,b,c,d)=>indices.push(a,b,c,a,c,d);
 const outer=outerRows.map(z=>addRing(z,outerRadius)),inner=innerRows.map(z=>addRing(z,innerRadius));
 for(let j=0;j<outer.length-1;j++){for(let i=0;i<radialSegments;i++){const n=(i+1)%radialSegments;quad(outer[j][i],outer[j][n],outer[j+1][n],outer[j+1][i]);}}
 for(let j=0;j<inner.length-1;j++){for(let i=0;i<radialSegments;i++){const n=(i+1)%radialSegments;quad(inner[j][i],inner[j+1][i],inner[j+1][n],inner[j][n]);}}
 for(let i=0;i<radialSegments;i++){const n=(i+1)%radialSegments;quad(outer[0][i],inner[0][i],inner[0][n],outer[0][n]);}
 const tc=addVertex(0,0,outerRows[outerRows.length-1]),ot=outer[outer.length-1]; for(let i=0;i<radialSegments;i++){const n=(i+1)%radialSegments;indices.push(tc,ot[i],ot[n]);}
 const cc=addVertex(0,0,innerRows[innerRows.length-1]),it=inner[inner.length-1]; for(let i=0;i<radialSegments;i++){const n=(i+1)%radialSegments;indices.push(cc,it[n],it[i]);}
 return finishGeometry(vertices,indices);
}
function finishGeometry(vertices,indices){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(vertices),3));g.setIndex(indices);g.computeVertexNormals();return g;}
function buildRows(start,end,step){const v=[start];let z=start+step;while(z<end-1e-6){v.push(z);z+=step;}if(Math.abs(v[v.length-1]-end)>1e-6)v.push(end);return v;}
function radialSegmentCount(radius,petals){const byArc=Math.ceil(Math.PI*2*radius/MAX_ARC_SEGMENT),byPetals=petals*16;return Math.max(128,Math.min(360,Math.max(byArc,byPetals)));}
function material(color){return new THREE.MeshStandardMaterial({color,roughness:.58,metalness:.02,side:THREE.DoubleSide});}
function updateResults(d){E['outer-diameter'].textContent=`${fmt(d.outerDiameter)} mm`;E['outer-height'].textContent=`${fmt(d.holderH)} mm`;}
function downloadHolder(){if(!holderMesh)return msg(T.first,'error');const a=params();exportSTL(holderMesh,`vekmaker-petal-organizer-${a.type}-${a.diameter}x${a.height}mm.stl`,{rotateForPrint:false,centerXY:true,placeOnBed:true});msg(T.holder,'success');}
function downloadLid(){if(!lidMesh)return msg(T.first,'error');const a=params(),lid=lidMesh.clone(true);lid.position.set(0,0,0);lid.updateMatrix();lid.updateMatrixWorld(true);exportSTL(lid,`vekmaker-petal-organizer-lid-${a.diameter}mm.stl`,{rotateForPrint:false,centerXY:true,placeOnBed:true});msg(T.lid,'success');}
function fitCamera(a,d,hasLid){const lr=d.maxOuterR+LID_CLEARANCE+LID_WALL,fullW=hasLid?d.maxOuterR*2+lr*2+Math.max(14,a.diameter*.16):d.maxOuterR*2,size=Math.max(fullW,d.holderH),dist=size*1.75;camera.position.set(dist*.85,-dist,dist*.64);camera.near=Math.max(.1,dist/100);camera.far=Math.max(5000,dist*20);camera.updateProjectionMatrix();controls.target.set(hasLid?lr*.35:0,0,d.holderH*.42);controls.update();}
function removeModel(){if(!root)return;scene.remove(root);root.traverse(o=>{if(!o.isMesh)return;o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose();});root=null;holderMesh=null;lidMesh=null;}
function msg(text,type=''){E.message.textContent=text;E.message.className='validation-message';if(type)E.message.classList.add(type);}
function fmt(v){return Number(v).toFixed(2).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1');}
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function resize(){const w=Math.max(E.preview.clientWidth,1),h=Math.max(E.preview.clientHeight,320);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
function animate(){requestAnimationFrame(animate);controls?.update();renderer?.render(scene,camera);}
