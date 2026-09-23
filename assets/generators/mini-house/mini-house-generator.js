import * as THREE from '../../libs/three/three.module.js';
import { OrbitControls } from '../../libs/three/OrbitControls.js';
import { exportSTL } from '../../js/core/stl-exporter.js';

const LANG = ['en', 'pt', 'ja'].includes(document.documentElement.lang)
    ? document.documentElement.lang
    : 'en';

const T = {
    en: {
        ok: 'Mini house generated successfully.',
        first: 'Generate the house before downloading.',
        base: 'Base STL downloaded successfully.',
        walls: 'Walls STL downloaded successfully.',
        roof: 'Roof STL downloaded successfully.',
        door: 'Door STL downloaded successfully.',
        window: 'Window STL downloaded successfully.'
    },
    pt: {
        ok: 'Casinha gerada com sucesso.',
        first: 'Gere a casinha antes de baixar.',
        base: 'STL da base baixado com sucesso.',
        walls: 'STL das paredes baixado com sucesso.',
        roof: 'STL do telhado baixado com sucesso.',
        door: 'STL da porta baixado com sucesso.',
        window: 'STL da janela baixado com sucesso.'
    },
    ja: {
        ok: 'ミニハウスを生成しました。',
        first: 'ダウンロードする前にミニハウスを生成してください。',
        base: 'ベースのSTLをダウンロードしました。',
        walls: '壁のSTLをダウンロードしました。',
        roof: '屋根のSTLをダウンロードしました。',
        door: 'ドアのSTLをダウンロードしました。',
        window: '窓のSTLをダウンロードしました。'
    }
}[LANG];

const WALL = 3.0;
const BASE_H = 6.0;
const BASE_MARGIN = 7.0;
const BASE_RADIUS = 7.0;
const ALIGN_POST = 7.0;
const ALIGN_POST_H = 5.0;
const ALIGN_CLEARANCE = 0.7;
const ROOF_THICK = 3.2;
const ROOF_OVERHANG = 7.0;
const INSERT_CLEARANCE = 0.35;
const INSERT_FLANGE = 3.0;
const INSERT_FLANGE_T = 1.4;
const DOOR_FACE_T = WALL + 0.7;
const WINDOW_FACE_T = WALL + 0.7;

const E = {};
let scene, camera, renderer, controls, root = null;
let printParts = null;

const COLORS = {
    base: 0x7b8490,
    walls: 0xf0e5d2,
    roof: 0x4f8f7c,
    door: 0xb96745,
    window: 0x86bdd3
};

document.addEventListener('DOMContentLoaded', () => {
    [
        'preview', 'width', 'depth', 'wall-height',
        'outer-size', 'total-height', 'message',
        'download-base', 'download-walls', 'download-roof', 'download-door', 'download-window'
    ].forEach(key => E[key] = document.getElementById('mh-' + key));

    if (!E.preview) return;
    initPreview();
    bind();
    generate();
});

function initPreview() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    E.preview.replaceChildren(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;

    scene.add(new THREE.AmbientLight(0xffffff, 1.7));
    const key = new THREE.DirectionalLight(0xffffff, 1.25);
    key.position.set(180, -220, 220);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.45);
    fill.position.set(-140, 160, 110);
    scene.add(fill);

    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(E.preview);
    else window.addEventListener('resize', resize);

    resize();
    animate();
}

function bind() {
    ['width', 'depth', 'wall-height'].forEach(key => {
        E[key].addEventListener('input', generate);
        E[key].addEventListener('change', generate);
    });

    E['download-base'].addEventListener('click', () => downloadPart('base'));
    E['download-walls'].addEventListener('click', () => downloadPart('walls'));
    E['download-roof'].addEventListener('click', () => downloadPart('roof'));
    E['download-door'].addEventListener('click', () => downloadPart('door'));
    E['download-window'].addEventListener('click', () => downloadPart('window'));
}

function params() {
    return {
        width: +E.width.value,
        depth: +E.depth.value,
        wallHeight: +E['wall-height'].value
    };
}

function dims(a) {
    const gableRise = Math.max(26, a.width * 0.28);
    const baseW = a.width + BASE_MARGIN * 2;
    const baseD = a.depth + BASE_MARGIN * 2;
    const doorW = clamp(a.width * 0.25, 22, 34);
    const doorH = clamp(a.wallHeight * 0.62, 42, 68);
    const windowW = clamp(a.width * 0.22, 20, 30);
    const windowH = clamp(a.wallHeight * 0.30, 22, 34);
    const openingCenterZ = Math.min(a.wallHeight * 0.54, doorH * 0.72);
    const doorX = a.width * 0.20;
    const windowX = -a.width * 0.22;
    const totalHeight = BASE_H + a.wallHeight + gableRise + ROOF_THICK * 1.1;

    return {
        gableRise, baseW, baseD,
        doorW, doorH, windowW, windowH,
        openingCenterZ, doorX, windowX, totalHeight
    };
}

function generate() {
    const a = params();
    const d = dims(a);
    removeModel();

    printParts = {
        base: makeBase(a, d),
        walls: makeWalls(a, d),
        roof: makeRoof(a, d),
        door: makeDoor(a, d),
        window: makeWindow(a, d)
    };

    root = new THREE.Group();

    const basePreview = clonePart(printParts.base, COLORS.base);
    basePreview.position.z = 0;
    root.add(basePreview);

    const wallsPreview = clonePart(printParts.walls, COLORS.walls);
    wallsPreview.position.z = BASE_H;
    root.add(wallsPreview);

    const doorPreview = clonePart(printParts.door, COLORS.door);
    doorPreview.rotation.x = Math.PI / 2;
    // The insert is installed from the inside. Its rear flange stays behind
    // the wall while the decorative face passes through the opening and ends
    // only slightly proud of the exterior surface.
    doorPreview.position.set(
        d.doorX,
        -a.depth / 2 + WALL,
        BASE_H + INSERT_CLEARANCE
    );
    root.add(doorPreview);

    const windowPreview = clonePart(printParts.window, COLORS.window);
    windowPreview.rotation.x = Math.PI / 2;
    windowPreview.position.set(
        d.windowX,
        -a.depth / 2 + WALL,
        BASE_H + d.openingCenterZ
    );
    root.add(windowPreview);

    const roofPreview = clonePart(printParts.roof, COLORS.roof);
    roofPreview.position.z = BASE_H + a.wallHeight;
    root.add(roofPreview);

    scene.add(root);
    updateResults(a, d);
    fitCamera(a, d);
    msg(T.ok, 'success');
}

function makeBase(a, d) {
    const group = new THREE.Group();
    group.add(roundedBox(d.baseW, d.baseD, BASE_H, BASE_RADIUS, 0, 0, BASE_H / 2));

    const innerX = a.width / 2 - WALL - ALIGN_POST / 2 - ALIGN_CLEARANCE;
    const innerY = a.depth / 2 - WALL - ALIGN_POST / 2 - ALIGN_CLEARANCE;
    for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
            group.add(roundedBox(
                ALIGN_POST, ALIGN_POST, ALIGN_POST_H, 1.5,
                sx * innerX, sy * innerY, BASE_H + ALIGN_POST_H / 2
            ));
        }
    }
    return group;
}

function makeWalls(a, d) {
    const group = new THREE.Group();

    // Front wall: one extruded shape with recessed-fit openings for door and window.
    const frontShape = frontGableWallShape(
        a.width, a.wallHeight, d.gableRise,
        d.doorW, d.doorH, d.doorX
    );
    frontShape.holes.push(roundedRectPath(d.windowW, d.windowH, 4, d.windowX, d.openingCenterZ));
    const frontGeo = new THREE.ExtrudeGeometry(frontShape, {
        depth: WALL,
        bevelEnabled: false,
        curveSegments: 24
    });
    // Keep the front wall upright. After +90° rotation the extrusion extends
    // toward negative Y, so offset it by WALL to keep the exterior face flush
    // at -depth/2 while the wall thickness projects inward.
    frontGeo.rotateX(Math.PI / 2);
    frontGeo.translate(0, -a.depth / 2 + WALL, 0);
    group.add(new THREE.Mesh(frontGeo));

    // Back gable wall.
    const backShape = gableWallShape(a.width, a.wallHeight, d.gableRise);
    const backGeo = new THREE.ExtrudeGeometry(backShape, {
        depth: WALL,
        bevelEnabled: false,
        curveSegments: 24
    });
    // Keep the back wall upright, flush with the rear edge, with thickness inward.
    backGeo.rotateX(Math.PI / 2);
    backGeo.translate(0, a.depth / 2, 0);
    group.add(new THREE.Mesh(backGeo));

    // Side walls are deliberately kept below the gable so the roof can seat cleanly.
    group.add(boxMesh(WALL, a.depth + 0.6, a.wallHeight, -a.width / 2 + WALL / 2, 0, a.wallHeight / 2));
    group.add(boxMesh(WALL, a.depth + 0.6, a.wallHeight, a.width / 2 - WALL / 2, 0, a.wallHeight / 2));

    return group;
}

function makeRoof(a, d) {
    const group = new THREE.Group();
    const roofWidth = a.width + ROOF_OVERHANG * 2;
    const roofDepth = a.depth + ROOF_OVERHANG * 2;
    const half = roofWidth / 2;
    const wallHalf = a.width / 2;
    // Preserve the same roof pitch as the gable walls even with the side overhang.
    const rise = d.gableRise * (half / wallHalf) + ROOF_THICK * 1.1;

    // A single connected V-shaped shell, extruded through the depth.
    const s = new THREE.Shape();
    s.moveTo(-half, 0);
    s.lineTo(0, rise);
    s.lineTo(half, 0);
    s.lineTo(half - ROOF_THICK * 1.25, 0);
    s.lineTo(0, rise - ROOF_THICK * 1.55);
    s.lineTo(-half + ROOF_THICK * 1.25, 0);
    s.closePath();

    const geo = new THREE.ExtrudeGeometry(s, {
        depth: roofDepth,
        bevelEnabled: false,
        curveSegments: 16
    });
    geo.rotateX(Math.PI / 2);
    geo.translate(0, roofDepth / 2, 0);
    group.add(new THREE.Mesh(geo));

    return group;
}

function makeDoor(a, d) {
    const group = new THREE.Group();
    const faceW = d.doorW - INSERT_CLEARANCE * 2;
    const faceH = d.doorH - INSERT_CLEARANCE * 2;

    const faceShape = doorShape(faceW, faceH);
    const faceGeo = new THREE.ExtrudeGeometry(faceShape, {
        depth: DOOR_FACE_T,
        bevelEnabled: true,
        bevelThickness: 0.35,
        bevelSize: 0.35,
        bevelSegments: 2,
        curveSegments: 20
    });
    group.add(new THREE.Mesh(faceGeo));

    const flangeShape = doorShape(faceW + INSERT_FLANGE * 2, faceH + INSERT_FLANGE * 2);
    const flangeGeo = new THREE.ExtrudeGeometry(flangeShape, {
        depth: INSERT_FLANGE_T,
        bevelEnabled: false,
        curveSegments: 20
    });
    flangeGeo.translate(0, 0, -INSERT_FLANGE_T);
    group.add(new THREE.Mesh(flangeGeo));

    // Small integrated knob on the visible side.
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 2.0, 20));
    knob.rotation.x = Math.PI / 2;
    knob.position.set(faceW * 0.26, faceH * 0.52, DOOR_FACE_T + 1.0);
    group.add(knob);

    return group;
}

function makeWindow(a, d) {
    const group = new THREE.Group();
    const faceW = d.windowW - INSERT_CLEARANCE * 2;
    const faceH = d.windowH - INSERT_CLEARANCE * 2;

    const outer = roundedRectShape(faceW, faceH, 4);
    const inner = roundedRectPath(faceW - 5.5, faceH - 5.5, 2.7, 0, 0);
    outer.holes.push(inner);
    const frameGeo = new THREE.ExtrudeGeometry(outer, {
        depth: WINDOW_FACE_T,
        bevelEnabled: true,
        bevelThickness: 0.25,
        bevelSize: 0.25,
        bevelSegments: 2,
        curveSegments: 18
    });
    group.add(new THREE.Mesh(frameGeo));

    // Rear flange for inside-to-outside installation.
    const flangeOuter = roundedRectShape(faceW + INSERT_FLANGE * 2, faceH + INSERT_FLANGE * 2, 5);
    const flangeInner = roundedRectPath(faceW - 3.0, faceH - 3.0, 3, 0, 0);
    flangeOuter.holes.push(flangeInner);
    const flangeGeo = new THREE.ExtrudeGeometry(flangeOuter, {
        depth: INSERT_FLANGE_T,
        bevelEnabled: false,
        curveSegments: 18
    });
    flangeGeo.translate(0, 0, -INSERT_FLANGE_T);
    group.add(new THREE.Mesh(flangeGeo));

    const barT = 2.4;
    group.add(boxMesh(barT, faceH - 5.5, WINDOW_FACE_T, 0, 0, WINDOW_FACE_T / 2));
    group.add(boxMesh(faceW - 5.5, barT, WINDOW_FACE_T, 0, 0, WINDOW_FACE_T / 2));

    return group;
}

function frontGableWallShape(width, wallHeight, gableRise, doorW, doorH, doorX) {
    const hw = width / 2;
    const cornerR = 2.5;
    const doorR = doorW / 2;
    const doorLeft = doorX - doorR;
    const doorRight = doorX + doorR;
    const spring = doorH - doorR;
    const s = new THREE.Shape();

    s.moveTo(-hw + cornerR, 0);
    s.lineTo(doorLeft, 0);
    s.lineTo(doorLeft, spring);
    s.absarc(doorX, spring, doorR, Math.PI, 0, true);
    s.lineTo(doorRight, 0);
    s.lineTo(hw - cornerR, 0);
    s.quadraticCurveTo(hw, 0, hw, cornerR);
    s.lineTo(hw, wallHeight);
    s.lineTo(0, wallHeight + gableRise);
    s.lineTo(-hw, wallHeight);
    s.lineTo(-hw, cornerR);
    s.quadraticCurveTo(-hw, 0, -hw + cornerR, 0);
    s.closePath();
    return s;
}

function gableWallShape(width, wallHeight, gableRise) {
    const hw = width / 2;
    const r = 2.5;
    const s = new THREE.Shape();
    s.moveTo(-hw + r, 0);
    s.quadraticCurveTo(-hw, 0, -hw, r);
    s.lineTo(-hw, wallHeight);
    s.lineTo(0, wallHeight + gableRise);
    s.lineTo(hw, wallHeight);
    s.lineTo(hw, r);
    s.quadraticCurveTo(hw, 0, hw - r, 0);
    s.closePath();
    return s;
}

function doorShape(width, height) {
    const s = new THREE.Shape();
    const r = width / 2;
    const spring = height - r;
    s.moveTo(-r, 0);
    s.lineTo(r, 0);
    s.lineTo(r, spring);
    s.absarc(0, spring, r, 0, Math.PI, false);
    s.lineTo(-r, 0);
    s.closePath();
    return s;
}

function roundedRectShape(width, height, radius) {
    const s = new THREE.Shape();
    drawRoundedRect(s, width, height, radius, 0, 0, false);
    return s;
}

function roundedRectPath(width, height, radius, cx = 0, cy = 0) {
    const p = new THREE.Path();
    drawRoundedRect(p, width, height, radius, cx, cy, true);
    return p;
}

function drawRoundedRect(path, width, height, radius, cx, cy, reverse) {
    const w = width / 2;
    const h = height / 2;
    const r = Math.min(radius, w - 0.01, h - 0.01);
    if (!reverse) {
        path.moveTo(cx - w + r, cy - h);
        path.lineTo(cx + w - r, cy - h);
        path.quadraticCurveTo(cx + w, cy - h, cx + w, cy - h + r);
        path.lineTo(cx + w, cy + h - r);
        path.quadraticCurveTo(cx + w, cy + h, cx + w - r, cy + h);
        path.lineTo(cx - w + r, cy + h);
        path.quadraticCurveTo(cx - w, cy + h, cx - w, cy + h - r);
        path.lineTo(cx - w, cy - h + r);
        path.quadraticCurveTo(cx - w, cy - h, cx - w + r, cy - h);
    } else {
        path.moveTo(cx - w + r, cy - h);
        path.quadraticCurveTo(cx - w, cy - h, cx - w, cy - h + r);
        path.lineTo(cx - w, cy + h - r);
        path.quadraticCurveTo(cx - w, cy + h, cx - w + r, cy + h);
        path.lineTo(cx + w - r, cy + h);
        path.quadraticCurveTo(cx + w, cy + h, cx + w, cy + h - r);
        path.lineTo(cx + w, cy - h + r);
        path.quadraticCurveTo(cx + w, cy - h, cx + w - r, cy - h);
        path.lineTo(cx - w + r, cy - h);
    }
    path.closePath();
}

function roundedBox(width, depth, height, radius, x = 0, y = 0, z = 0) {
    const s = roundedRectShape(width, depth, radius);
    const g = new THREE.ExtrudeGeometry(s, {
        depth: height,
        bevelEnabled: false,
        curveSegments: 16
    });
    g.translate(0, 0, -height / 2);
    const m = new THREE.Mesh(g);
    m.position.set(x, y, z);
    return m;
}

function boxMesh(width, depth, height, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(width, depth, height));
    m.position.set(x, y, z);
    return m;
}

function clonePart(source, color) {
    const clone = source.clone(true);
    clone.traverse(o => {
        if (!o.isMesh) return;
        o.geometry = o.geometry.clone();
        o.material = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.6,
            metalness: 0.02,
            side: THREE.DoubleSide
        });
    });
    return clone;
}

function downloadPart(name) {
    if (!printParts?.[name]) return msg(T.first, 'error');
    const a = params();
    const object = printParts[name].clone(true);
    object.updateMatrix();
    object.updateMatrixWorld(true);
    exportSTL(
        object,
        `vekmaker-mini-house-${name}-${a.width}x${a.depth}x${a.wallHeight}mm.stl`,
        { rotateForPrint: false, centerXY: true, placeOnBed: true }
    );
    msg(T[name], 'success');
}

function updateResults(a, d) {
    E['outer-size'].textContent = `${fmt(d.baseW)} × ${fmt(d.baseD)} mm`;
    E['total-height'].textContent = `${fmt(d.totalHeight)} mm`;
}

function fitCamera(a, d) {
    const size = Math.max(d.baseW, d.baseD, d.totalHeight);
    const dist = size * 2.05;
    camera.position.set(dist * 0.85, -dist, dist * 0.72);
    camera.near = Math.max(0.1, dist / 100);
    camera.far = Math.max(5000, dist * 20);
    camera.updateProjectionMatrix();
    controls.target.set(0, 0, d.totalHeight * 0.38);
    controls.update();
}

function removeModel() {
    if (!root) return;
    scene.remove(root);
    root.traverse(o => {
        if (!o.isMesh) return;
        o.geometry?.dispose();
        if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
        else o.material?.dispose();
    });
    root = null;
    printParts = null;
}

function msg(text, type = '') {
    E.message.textContent = text;
    E.message.className = 'validation-message';
    if (type) E.message.classList.add(type);
}

function resize() {
    const w = Math.max(E.preview.clientWidth, 1);
    const h = Math.max(E.preview.clientHeight, 320);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
}

function animate() {
    requestAnimationFrame(animate);
    controls?.update();
    renderer?.render(scene, camera);
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function fmt(v) { return Number(v).toFixed(1).replace(/\.0$/, ''); }
