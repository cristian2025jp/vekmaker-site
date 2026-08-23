import * as THREE from '../../libs/three/three.module.js';
import { OrbitControls } from '../../libs/three/OrbitControls.js';
import { exportSTL } from '../../js/core/stl-exporter.js';

const T={
 en:{ok:'Favor box generated successfully.',first:'Generate the box before downloading.',base:'Favor box STL downloaded.',lid:'Lid STL downloaded.',bad:'Check the highlighted dimensions.'},
 pt:{ok:'Caixa de lembrancinha gerada com sucesso.',first:'Gere a caixa antes de baixar.',base:'STL da caixa baixado.',lid:'STL da tampa baixado.',bad:'Confira as dimensões informadas.'},
 ja:{ok:'ギフトボックスを生成しました。',first:'ダウンロードする前にボックスを生成してください。',base:'ボックスSTLをダウンロードしました。',lid:'ふたSTLをダウンロードしました。',bad:'入力寸法を確認してください。'}
};
const LANG=['en','pt','ja'].includes(document.documentElement.lang)?document.documentElement.lang:'en';
const TXT=T[LANG];
const e={}; let scene,camera,renderer,controls,root,boxGroup,lidGroup;

document.addEventListener('DOMContentLoaded',()=>{cache();init();bind();toggleFields();generate();});
function cache(){['shape','width','depth','hex','height','wall','bottom','radius','lidStyle','clearance','lidThickness','lipHeight','lipWall','rectFields','hexField','radiusField','preview','message','extW','extD','extH','lidSize','generate','downloadBase','downloadLid'].forEach(k=>e[k]=document.getElementById('fb-'+k));}
function init(){scene=new THREE.Scene();scene.background=new THREE.Color(0xf8f9fa);camera=new THREE.PerspectiveCamera(45,1,.1,5000);renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));e.preview.replaceChildren(renderer.domElement);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;scene.add(new THREE.AmbientLight(0xffffff,1.6));const l=new THREE.DirectionalLight(0xffffff,1.3);l.position.set(140,180,160);scene.add(l);new ResizeObserver(resize).observe(e.preview);resize();animate();}
function bind(){Object.values(e).filter(x=>x&&['INPUT','SELECT'].includes(x.tagName)).forEach(x=>{x.addEventListener('input',change);x.addEventListener('change',change)});e.generate.addEventListener('click',generate);e.downloadBase.addEventListener('click',()=>download('base'));e.downloadLid.addEventListener('click',()=>download('lid'));}
function change(){toggleFields();generate();}
function toggleFields(){const h=e.shape.value==='hexagon';e.rectFields.classList.toggle('hidden-field',h);e.hexField.classList.toggle('hidden-field',!h);e.radiusField.classList.toggle('hidden-field',h);}
function p(){return{shape:e.shape.value,w:+e.width.value,d:+e.depth.value,hex:+e.hex.value,h:+e.height.value,wall:+e.wall.value,bottom:+e.bottom.value,r:+e.radius.value,lidStyle:e.lidStyle.value,clear:+e.clearance.value,lidT:+e.lidThickness.value,lipH:+e.lipHeight.value,lipW:+e.lipWall.value};}
function calc(a){if(a.shape==='hexagon'){const of=a.hex+2*a.wall, oc=of/Math.cos(Math.PI/6), lf=of+(a.lidStyle==='overhang'?4:0);return{ow:oc,od:of,oh:a.h+a.bottom,lw:lf/Math.cos(Math.PI/6),ld:lf,of};}const ow=a.w+2*a.wall,od=a.d+2*a.wall,o=a.lidStyle==='overhang'?4:0;return{ow,od,oh:a.h+a.bottom,lw:ow+o,ld:od+o};}
function valid(a,d){if(a.shape==='hexagon'&&!(a.hex>=35&&a.hex<=180))return false;if(a.shape!=='hexagon'&&(!(a.w>=30&&a.w<=180)||!(a.d>=30&&a.d<=180)))return false;return a.h>=15&&a.h<=120&&a.wall>=1.2&&a.wall<=5&&a.bottom>=1&&a.bottom<=6&&a.clear>=.1&&a.clear<=1.5&&a.lidT>=1.2&&a.lidT<=6&&a.lipH>=1&&a.lipH<=8&&a.lipW>=1&&a.lipW<=4&&(a.shape==='hexagon'||(a.r>=0&&a.r<Math.min(d.ow,d.od)/2));}
function generate(){const a=p(),d=calc(a);results(d);if(!valid(a,d)){msg(TXT.bad,'error');enable(false);return;}remove();const m=new THREE.MeshStandardMaterial({color:0x3b82f6,roughness:.58,side:THREE.DoubleSide}),ml=new THREE.MeshStandardMaterial({color:0x60a5fa,roughness:.55,side:THREE.DoubleSide});boxGroup=makeBox(a,d,m);lidGroup=makeLid(a,d,ml);root=new THREE.Group();root.add(boxGroup,lidGroup);lidGroup.position.set(d.ow*.75,0,d.oh+8);scene.add(root);fit(d);msg(TXT.ok,'success');enable(true);}
function makeBox(a,d,m){
const g=new THREE.Group();

if(a.shape==='hexagon'){
    const outer=hexShape(d.of);
    outer.holes.push(hexPath(a.hex));

    const wg=new THREE.ExtrudeGeometry(outer,{
        depth:a.h,
        bevelEnabled:false,
        curveSegments:28,
        steps:1
    });
    wg.translate(0,0,a.bottom);
    wg.computeVertexNormals();
    g.add(new THREE.Mesh(wg,m.clone()));

    const bottom=hexShape(d.of);
    const bg=new THREE.ExtrudeGeometry(bottom,{
        depth:a.bottom,
        bevelEnabled:false,
        curveSegments:28,
        steps:1
    });
    bg.computeVertexNormals();
    g.add(new THREE.Mesh(bg,m.clone()));
    return g;
}

/*
 * Rounded rectangular favor box:
 * build the wall as a true ring using a Shape plus a centered Path hole.
 * The previous inner rounded path could be interpreted as a filled face.
 */
const outer=rrShape(d.ow,d.od,a.r);

const innerRadius=Math.max(0,a.r-a.wall);
const inner=rrHolePath(
    a.w,
    a.d,
    Math.min(innerRadius,a.w/2,a.d/2),
    (d.ow-a.w)/2,
    (d.od-a.d)/2
);
outer.holes.push(inner);

const wg=new THREE.ExtrudeGeometry(outer,{
    depth:a.h,
    bevelEnabled:false,
    curveSegments:32,
    steps:1
});
wg.translate(-d.ow/2,-d.od/2,a.bottom);
wg.computeVertexNormals();
g.add(new THREE.Mesh(wg,m.clone()));

const bottom=rrShape(d.ow,d.od,a.r);
const bg=new THREE.ExtrudeGeometry(bottom,{
    depth:a.bottom,
    bevelEnabled:false,
    curveSegments:32,
    steps:1
});
bg.translate(-d.ow/2,-d.od/2,0);
bg.computeVertexNormals();
g.add(new THREE.Mesh(bg,m.clone()));

return g;
}

function rrHolePath(w,h,r,ox,oy){
    const q=new THREE.Path();
    r=Math.min(Math.max(r,0),w/2,h/2);

    q.moveTo(ox+r,oy);

    // Top-left corner
    if(r) q.quadraticCurveTo(ox,oy,ox,oy+r);
    else q.lineTo(ox,oy);

    // Left side + bottom-left corner
    q.lineTo(ox,oy+h-r);
    if(r) q.quadraticCurveTo(ox,oy+h,ox+r,oy+h);

    // Bottom side + bottom-right corner
    q.lineTo(ox+w-r,oy+h);
    if(r) q.quadraticCurveTo(ox+w,oy+h,ox+w,oy+h-r);

    // Right side + top-right corner
    q.lineTo(ox+w,oy+r);
    if(r) q.quadraticCurveTo(ox+w,oy,ox+w-r,oy);

    // Top side
    q.lineTo(ox+r,oy);

    return q;
}
function makeLid(a,d,m){
const g=new THREE.Group();

let top;
if(a.shape==='hexagon'){
    top=hexShape(a.lidStyle==='overhang'?d.of+4:d.of);
}else{
    top=rrShape(
        d.lw,
        d.ld,
        Math.max(0,a.r+(a.lidStyle==='overhang'?2:0))
    );
}

const tg=new THREE.ExtrudeGeometry(top,{
    depth:a.lidT,
    bevelEnabled:false,
    curveSegments:32,
    steps:1
});
if(a.shape!=='hexagon')tg.translate(-d.lw/2,-d.ld/2,0);
tg.computeVertexNormals();
g.add(new THREE.Mesh(tg,m.clone()));

if(a.shape==='hexagon'){
    const lo=Math.max(5,a.hex-2*a.clear);
    const li=Math.max(2,lo-2*a.lipW);
    const s=hexShape(lo);
    s.holes.push(hexPath(li));

    const lg=new THREE.ExtrudeGeometry(s,{
        depth:a.lipH,
        bevelEnabled:false,
        steps:1
    });
    lg.translate(0,0,-a.lipH);
    lg.computeVertexNormals();
    g.add(new THREE.Mesh(lg,m.clone()));
}else{
    const ow=Math.max(5,a.w-2*a.clear);
    const od=Math.max(5,a.d-2*a.clear);
    const iw=Math.max(2,ow-2*a.lipW);
    const id=Math.max(2,od-2*a.lipW);
    const or=Math.max(0,a.r-a.wall-a.clear);
    const ir=Math.max(0,or-a.lipW);

    const s=rrShape(
        ow,
        od,
        Math.min(or,ow/2,od/2)
    );

    /*
     * Use the same proven centered clockwise inner contour used by
     * the corrected rectangular box body. This creates a true annular
     * locating lip and avoids the old rrPath() open-edge issue.
     */
    const hole=rrHolePath(
        iw,
        id,
        Math.min(ir,iw/2,id/2),
        (ow-iw)/2,
        (od-id)/2
    );
    s.holes.push(hole);

    const lg=new THREE.ExtrudeGeometry(s,{
        depth:a.lipH,
        bevelEnabled:false,
        curveSegments:32,
        steps:1
    });
    lg.translate(-ow/2,-od/2,-a.lipH);
    lg.computeVertexNormals();
    g.add(new THREE.Mesh(lg,m.clone()));
}

return g;
}
function rrShape(w,h,r){const s=new THREE.Shape();rounded(s,w,h,r,false);return s;} function rrPath(w,h,r){const s=new THREE.Path();rounded(s,w,h,r,true);return s;}
function rounded(q,w,h,r,cw){r=Math.min(Math.max(r,0),w/2,h/2);if(!cw){q.moveTo(r,0);q.lineTo(w-r,0);if(r)q.quadraticCurveTo(w,0,w,r);q.lineTo(w,h-r);if(r)q.quadraticCurveTo(w,h,w-r,h);q.lineTo(r,h);if(r)q.quadraticCurveTo(0,h,0,h-r);q.lineTo(0,r);if(r)q.quadraticCurveTo(0,0,r,0);}else{q.moveTo(r,0);q.lineTo(0,r);q.lineTo(0,h-r);if(r)q.quadraticCurveTo(0,h,r,h);q.lineTo(w-r,h);if(r)q.quadraticCurveTo(w,h,w,h-r);q.lineTo(w,r);if(r)q.quadraticCurveTo(w,0,w-r,0);q.lineTo(r,0);}}
function hexPts(f){const R=f/(2*Math.cos(Math.PI/6)),a=[];for(let i=0;i<6;i++){const t=Math.PI/6+i*Math.PI/3;a.push(new THREE.Vector2(Math.cos(t)*R,Math.sin(t)*R));}return a;} function hexShape(f){const a=hexPts(f),s=new THREE.Shape();s.moveTo(a[0].x,a[0].y);for(let i=1;i<6;i++)s.lineTo(a[i].x,a[i].y);s.closePath();return s;} function hexPath(f){const a=hexPts(f).reverse(),s=new THREE.Path();s.moveTo(a[0].x,a[0].y);for(let i=1;i<6;i++)s.lineTo(a[i].x,a[i].y);s.closePath();return s;}
function results(d){e.extW.textContent=fmt(d.ow)+' mm';e.extD.textContent=fmt(d.od)+' mm';e.extH.textContent=fmt(d.oh)+' mm';e.lidSize.textContent=fmt(d.lw)+' × '+fmt(d.ld)+' mm';}
function download(which){const a=p(),d=calc(a);if(!valid(a,d)){msg(TXT.bad,'error');return;}const obj=(which==='base'?boxGroup:lidGroup);if(!obj){msg(TXT.first,'error');return;}const x=obj.clone(true);x.position.set(0,0,0);if(which==='lid'){x.position.z=a.lidT;x.rotation.x=Math.PI;}x.updateMatrix();x.updateMatrixWorld(true);exportSTL(x,which==='base'?`vekmaker-favor-box-${a.shape}.stl`:`vekmaker-favor-box-lid-${a.shape}.stl`,{rotateForPrint:false});msg(which==='base'?TXT.base:TXT.lid,'success');}
function remove(){if(!root)return;scene.remove(root);root.traverse(o=>{if(o.isMesh){o.geometry?.dispose();o.material?.dispose();}});root=boxGroup=lidGroup=null;}
function fit(d){const s=Math.max(d.ow*1.8,d.od,d.oh,d.lw),z=Math.max(110,s*1.25);camera.position.set(z,-z,z*.9);camera.aspect=(e.preview.clientWidth||1)/(e.preview.clientHeight||420);camera.updateProjectionMatrix();controls.target.set(d.ow*.2,0,d.oh*.45);controls.update();}
function resize(){const w=Math.max(e.preview.clientWidth,1),h=Math.max(e.preview.clientHeight,320);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
function animate(){requestAnimationFrame(animate);controls?.update();renderer?.render(scene,camera);} function fmt(v){return Number(v).toFixed(2).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1');} function msg(s,t){e.message.textContent=s;e.message.className='validation-message active '+t;} function enable(v){e.downloadBase.disabled=!v;e.downloadLid.disabled=!v;}
