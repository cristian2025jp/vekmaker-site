import * as THREE from '../../libs/three/three.module.js';
import { OrbitControls } from '../../libs/three/OrbitControls.js';
import { exportSTL } from '../../js/core/stl-exporter.js';

const MODEL_COLOR=0x3b82f6;
const CABLE_CLIP_I18N={en:{type:'Select a valid clip type.',cable:'Cable diameter must be between 2 mm and 40 mm.',clearance:'Fit clearance must be between 0 mm and 3 mm.',wall:'Clip wall thickness must be between 0.8 mm and 6 mm.',width:'Clip width must be between 3 mm and 40 mm.',opening:'Opening width must be smaller than the fitted inner diameter.',baseT:'Base thickness must be between 1 mm and 10 mm.',margin:'Base margin must be between 1 mm and 20 mm.',resolution:'Select a valid resolution.',count:'Number of cable slots must be a whole number between 2 and 12.',gap:'Gap between clips must be between 0 mm and 30 mm.',screwHole:'Screw hole diameter must be between 2 mm and 12 mm.',screwSpacing:'Screw hole spacing must be between 8 mm and 120 mm.',screwSmall:'Screw hole spacing is too small for the selected hole diameter.',screwLarge:'Screw hole diameter is too large for the base depth.',rigid:'This wall and opening combination may be too rigid. Increase the opening or reduce wall thickness.',generated:'Cable clip generated successfully.',generateFirst:'Generate the cable clip before downloading.',downloaded:'STL downloaded successfully.'},pt:{type:'Selecione um tipo de clipe válido.',cable:'O diâmetro do cabo deve estar entre 2 mm e 40 mm.',clearance:'A folga de encaixe deve estar entre 0 mm e 3 mm.',wall:'A espessura da parede do clipe deve estar entre 0,8 mm e 6 mm.',width:'A largura do clipe deve estar entre 3 mm e 40 mm.',opening:'A largura da abertura deve ser menor que o diâmetro interno ajustado.',baseT:'A espessura da base deve estar entre 1 mm e 10 mm.',margin:'A margem da base deve estar entre 1 mm e 20 mm.',resolution:'Selecione uma resolução válida.',count:'O número de encaixes para cabos deve ser inteiro entre 2 e 12.',gap:'O espaço entre clipes deve estar entre 0 mm e 30 mm.',screwHole:'O diâmetro do furo do parafuso deve estar entre 2 mm e 12 mm.',screwSpacing:'O espaçamento entre os furos deve estar entre 8 mm e 120 mm.',screwSmall:'O espaçamento entre os furos é pequeno demais para o diâmetro selecionado.',screwLarge:'O diâmetro do furo é grande demais para a profundidade da base.',rigid:'Esta combinação de parede e abertura pode ficar rígida demais. Aumente a abertura ou reduza a espessura da parede.',generated:'Clipe para cabos gerado com sucesso.',generateFirst:'Gere o clipe para cabos antes de baixar.',downloaded:'STL baixado com sucesso.'},ja:{type:'有効なクリップタイプを選択してください。',cable:'ケーブル直径は2 mmから40 mmの範囲で指定してください。',clearance:'はめ合いクリアランスは0 mmから3 mmの範囲で指定してください。',wall:'クリップ壁厚は0.8 mmから6 mmの範囲で指定してください。',width:'クリップ幅は3 mmから40 mmの範囲で指定してください。',opening:'開口幅は調整後の内径より小さくしてください。',baseT:'ベース厚は1 mmから10 mmの範囲で指定してください。',margin:'ベース余白は1 mmから20 mmの範囲で指定してください。',resolution:'有効な解像度を選択してください。',count:'ケーブルスロット数は2から12の整数で指定してください。',gap:'クリップ間隔は0 mmから30 mmの範囲で指定してください。',screwHole:'ネジ穴直径は2 mmから12 mmの範囲で指定してください。',screwSpacing:'ネジ穴間隔は8 mmから120 mmの範囲で指定してください。',screwSmall:'選択した穴径に対してネジ穴間隔が小さすぎます。',screwLarge:'ベース奥行きに対してネジ穴直径が大きすぎます。',rigid:'この壁厚と開口幅の組み合わせは硬すぎる可能性があります。開口を広げるか、壁厚を小さくしてください。',generated:'ケーブルクリップを生成しました。',generateFirst:'ダウンロードする前にケーブルクリップを生成してください。',downloaded:'STLをダウンロードしました。'}};const CABLE_CLIP_LANG=['en','pt','ja'].includes(document.documentElement.lang)?document.documentElement.lang:'en';const CABLE_CLIP_TEXT=CABLE_CLIP_I18N[CABLE_CLIP_LANG];
const e={};
let scene,camera,renderer,controls,modelGroup=null,resizeObserver=null;

document.addEventListener('DOMContentLoaded',()=>{
    cache();
    if(!e.preview){
        console.error('Cable clip preview container was not found.');
        return;
    }
    init();
    bind();
    updateVisibleFields();
    generate();
});

function cache(){
    const ids={
        preview:'cable-clip-preview',type:'cc-type',cable:'cc-cable-diameter',
        clearance:'cc-clearance',wall:'cc-wall',width:'cc-width',
        opening:'cc-opening',count:'cc-count',gap:'cc-gap',
        baseT:'cc-base-thickness',margin:'cc-base-margin',
        screwHole:'cc-screw-hole',screwSpacing:'cc-screw-spacing',
        segments:'cc-segments',multiFields:'cc-multi-fields',
        screwFields:'cc-screw-fields',innerResult:'cc-inner-result',
        outerResult:'cc-outer-result',totalResult:'cc-total-result',
        spacingResult:'cc-spacing-result',msg:'cc-message',
        generate:'cc-generate',download:'cc-download'
    };
    for(const [key,id] of Object.entries(ids)) e[key]=document.getElementById(id);
}

function init(){
    scene=new THREE.Scene();
    scene.background=new THREE.Color(0xf8f9fa);
    camera=new THREE.PerspectiveCamera(45,aspect(),0.1,5000);
    renderer=new THREE.WebGLRenderer({antialias:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    resize();
    e.preview.replaceChildren(renderer.domElement);

    controls=new OrbitControls(camera,renderer.domElement);
    controls.enableDamping=true;
    controls.dampingFactor=0.08;
    controls.enablePan=false;

    scene.add(new THREE.AmbientLight(0xffffff,1.55));
    const main=new THREE.DirectionalLight(0xffffff,1.25);
    main.position.set(120,180,140);
    scene.add(main);
    const fill=new THREE.DirectionalLight(0xffffff,0.55);
    fill.position.set(-100,70,-100);
    scene.add(fill);

    if('ResizeObserver' in window){
        resizeObserver=new ResizeObserver(resize);
        resizeObserver.observe(e.preview);
    }else{
        window.addEventListener('resize',resize);
    }
    animate();
}

function bind(){
    [e.type,e.cable,e.clearance,e.wall,e.width,e.opening,e.count,e.gap,
     e.baseT,e.margin,e.screwHole,e.screwSpacing,e.segments].forEach(el=>{
        el?.addEventListener('input',change);
        el?.addEventListener('change',change);
    });
    e.generate?.addEventListener('click',generate);
    e.download?.addEventListener('click',download);
}

function change(){
    updateVisibleFields();
    generate();
}

function updateVisibleFields(){
    const type=e.type?.value||'individual';
    e.multiFields?.classList.toggle('hidden-field',type!=='multi');
    e.screwFields?.classList.toggle('hidden-field',type!=='screw');
}

function params(){
    return{
        type:e.type.value,
        cable:+e.cable.value,
        clearance:+e.clearance.value,
        wall:+e.wall.value,
        width:+e.width.value,
        opening:+e.opening.value,
        count:parseInt(e.count.value,10),
        gap:+e.gap.value,
        baseT:+e.baseT.value,
        margin:+e.margin.value,
        screwHole:+e.screwHole.value,
        screwSpacing:+e.screwSpacing.value,
        segments:parseInt(e.segments.value,10)
    };
}

function dims(p){
    const inner=p.cable+p.clearance;
    const outer=inner+p.wall*2;
    const actualCount=p.type==='multi'?p.count:1;
    const centerSpacing=outer+p.gap;
    const clipsWidth=outer*actualCount+p.gap*Math.max(actualCount-1,0);
    let baseWidth=clipsWidth+p.margin*2;

    if(p.type==='screw'){
        baseWidth=Math.max(baseWidth,p.screwSpacing+p.screwHole+p.margin*2);
    }

    const baseDepth=p.width+p.margin*2;

    return{
        inner,outer,actualCount,centerSpacing,clipsWidth,
        baseWidth,baseDepth,totalHeight:p.baseT+outer
    };
}

const between=(v,a,b)=>Number.isFinite(v)&&v>=a&&v<=b;

function validate(p,d){
    if(!['individual','multi','screw'].includes(p.type)) return CABLE_CLIP_TEXT.type;
    if(!between(p.cable,2,40)) return CABLE_CLIP_TEXT.cable;
    if(!between(p.clearance,0,3)) return CABLE_CLIP_TEXT.clearance;
    if(!between(p.wall,0.8,6)) return CABLE_CLIP_TEXT.wall;
    if(!between(p.width,3,40)) return CABLE_CLIP_TEXT.width;
    if(!between(p.opening,1,d.inner*0.98)) return CABLE_CLIP_TEXT.opening;
    if(!between(p.baseT,1,10)) return CABLE_CLIP_TEXT.baseT;
    if(!between(p.margin,1,20)) return CABLE_CLIP_TEXT.margin;
    if(![32,64,96].includes(p.segments)) return CABLE_CLIP_TEXT.resolution;

    if(p.type==='multi'){
        if(!Number.isInteger(p.count)||p.count<2||p.count>12) return CABLE_CLIP_TEXT.count;
        if(!between(p.gap,0,30)) return CABLE_CLIP_TEXT.gap;
    }

    if(p.type==='screw'){
        if(!between(p.screwHole,2,12)) return CABLE_CLIP_TEXT.screwHole;
        if(!between(p.screwSpacing,8,120)) return CABLE_CLIP_TEXT.screwSpacing;
        if(p.screwSpacing<=p.screwHole+2) return CABLE_CLIP_TEXT.screwSmall;
        if(p.screwHole>=d.baseDepth-2) return CABLE_CLIP_TEXT.screwLarge;
    }

    if(p.wall>2.5 && p.opening<d.inner*0.65){
        return CABLE_CLIP_TEXT.rigid;
    }

    return '';
}

function generate(){
    const p=params(),d=dims(p);
    results(d);
    const error=validate(p,d);

    if(error){
        message(error,'error');
        enable(false);
        return false;
    }

    remove();
    modelGroup=new THREE.Group();

    const material=new THREE.MeshStandardMaterial({
        color:MODEL_COLOR,roughness:0.58,metalness:0.04,side:THREE.DoubleSide
    });

    addBase(p,d,material);

    const startX=-(d.actualCount-1)*d.centerSpacing/2;
    for(let i=0;i<d.actualCount;i+=1){
        addClip(p,d,startX+i*d.centerSpacing,material);
    }

    scene.add(modelGroup);
    fit(d);
    message(CABLE_CLIP_TEXT.generated,'success');
    enable(true);
    return true;
}

function addBase(p,d,material){
    const shape=new THREE.Shape();
    const w=d.baseWidth,h=d.baseDepth;
    shape.moveTo(-w/2,-h/2);
    shape.lineTo(w/2,-h/2);
    shape.lineTo(w/2,h/2);
    shape.lineTo(-w/2,h/2);
    shape.closePath();

    if(p.type==='screw'){
        for(const x of[-p.screwSpacing/2,p.screwSpacing/2]){
            const hole=new THREE.Path();
            hole.absarc(x,0,p.screwHole/2,0,Math.PI*2,false);
            shape.holes.push(hole);
        }
    }

    const geometry=new THREE.ExtrudeGeometry(shape,{
        depth:p.baseT,bevelEnabled:false,steps:1,curveSegments:p.segments
    });
    geometry.computeVertexNormals();
    const mesh=new THREE.Mesh(geometry,material);
    modelGroup.add(mesh);
}

function addClip(p,d,xOffset,material){
    /*
     * The clip bottom overlaps the base by 0.25 mm, producing a reliable
     * connection when the STL is sliced.
     */
    const finalGeometry=createClipGeometry(d.inner/2,d.outer/2,p.opening,p.width,p.segments);
    const finalMesh=new THREE.Mesh(finalGeometry,material.clone());
    finalMesh.position.set(xOffset,0,p.baseT+d.outer/2-0.25);
    modelGroup.add(finalMesh);
}

function createClipGeometry(innerR,outerR,opening,width,segments){
    const shape=createClipShape(innerR,outerR,opening,segments);
    const geometry=new THREE.ExtrudeGeometry(shape,{
        depth:width,bevelEnabled:false,steps:1,curveSegments:segments
    });
    geometry.translate(0,0,-width/2);
    geometry.rotateX(Math.PI/2);
    geometry.computeVertexNormals();
    return geometry;
}

function createClipShape(innerR,outerR,opening,segments){
    const halfAngle=Math.asin(Math.min(0.98,opening/(2*innerR)));
    const start=halfAngle;
    const end=Math.PI*2-halfAngle;
    const shape=new THREE.Shape();

    const outerStart=pointOnTopAxisArc(outerR,start);
    shape.moveTo(outerStart.x,outerStart.y);

    const arcSteps=Math.max(24,Math.round(segments*(end-start)/(Math.PI*2)));
    for(let i=1;i<=arcSteps;i+=1){
        const a=start+(end-start)*(i/arcSteps);
        const pt=pointOnTopAxisArc(outerR,a);
        shape.lineTo(pt.x,pt.y);
    }

    const innerEnd=pointOnTopAxisArc(innerR,end);
    shape.lineTo(innerEnd.x,innerEnd.y);

    for(let i=arcSteps-1;i>=0;i-=1){
        const a=start+(end-start)*(i/arcSteps);
        const pt=pointOnTopAxisArc(innerR,a);
        shape.lineTo(pt.x,pt.y);
    }

    shape.closePath();
    return shape;
}

function pointOnTopAxisArc(radius,angle){
    return new THREE.Vector2(
        Math.sin(angle)*radius,
        Math.cos(angle)*radius
    );
}

function results(d){
    e.innerResult.textContent=`${fmt(d.inner)} mm`;
    e.outerResult.textContent=`${fmt(d.outer)} mm`;
    e.totalResult.textContent=`${fmt(d.baseWidth)} mm`;
    e.spacingResult.textContent=d.actualCount>1?`${fmt(d.centerSpacing)} mm`:'—';
}

function remove(){
    if(!modelGroup)return;
    scene.remove(modelGroup);
    modelGroup.traverse(child=>{
        if(child.isMesh){
            child.geometry?.dispose();
            child.material?.dispose();
        }
    });
    modelGroup=null;
}

function fit(d){
    const largest=Math.max(d.baseWidth,d.baseDepth,d.totalHeight);
    const distance=Math.max(70,largest*1.8);
    camera.position.set(distance,-distance,distance*0.8);
    camera.near=Math.max(0.1,distance/100);
    camera.far=Math.max(5000,distance*20);
    camera.updateProjectionMatrix();
    controls.target.set(0,0,d.totalHeight/2);
    controls.update();
}

function download(){
    const p=params(),d=dims(p),error=validate(p,d);
    if(error){
        message(error,'error');
        enable(false);
        return;
    }
    if(!modelGroup){
        message(CABLE_CLIP_TEXT.generateFirst,'error');
        return;
    }

    const typeName={individual:'individual',multi:'multi',screw:'screw-base'}[p.type];
    exportSTL(
        modelGroup,
        `vekmaker-cable-clip-${typeName}-${d.actualCount}x-${fmt(d.inner)}mm.stl`,
        {rotateForPrint:false}
    );
    message(CABLE_CLIP_TEXT.downloaded,'success');
}

function message(text,type=''){
    e.msg.textContent=text;
    e.msg.classList.remove('error','success','active');
    if(text)e.msg.classList.add('active');
    if(type)e.msg.classList.add(type);
}
function enable(value){e.download.disabled=!value}
function fmt(v){return Number(v).toFixed(2).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1')}
function aspect(){return Math.max(e.preview?.clientWidth||1,1)/Math.max(e.preview?.clientHeight||420,1)}
function resize(){
    if(!renderer||!camera||!e.preview)return;
    const w=Math.max(e.preview.clientWidth,1),h=Math.max(e.preview.clientHeight,320);
    renderer.setSize(w,h,false);
    camera.aspect=w/h;
    camera.updateProjectionMatrix();
}
function animate(){
    requestAnimationFrame(animate);
    controls?.update();
    renderer?.render(scene,camera);
}
