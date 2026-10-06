import * as THREE from '../../libs/three/three.module.js';
import { OrbitControls } from '../../libs/three/OrbitControls.js';
import { exportSTL } from '../../js/core/stl-exporter.js';

const LANG = ['en', 'pt', 'ja'].includes(document.documentElement.lang)
    ? document.documentElement.lang
    : 'en';

const T = {
    en: {
        ok: 'Open storage box generated successfully.',
        first: 'Generate the box before downloading.',
        downloaded: 'Box STL downloaded successfully.'
    },
    pt: {
        ok: 'Caixa organizadora gerada com sucesso.',
        first: 'Gere a caixa antes de baixar.',
        downloaded: 'STL da caixa baixado com sucesso.'
    },
    ja: {
        ok: 'オープン収納ボックスを生成しました。',
        first: 'ダウンロードする前にボックスを生成してください。',
        downloaded: 'ボックスのSTLをダウンロードしました。'
    }
}[LANG];

const RELIEF_DEPTH = 0.65;
const FIXED_CORNER_RADIUS = 2.0;
const HANDLE_TOP_MARGIN = 15;
const HANDLE_MIN_W = 30;
const HANDLE_MAX_W = 48;
const HANDLE_H = 14;

const E = {};
let scene, camera, renderer, controls, root = null, boxGroup = null;

const COLORS = {
    box: 0x8b9491
};

document.addEventListener('DOMContentLoaded', () => {
    [
        'preview', 'width', 'depth', 'height', 'wall', 'bottom', 'decor',
        'outer-size', 'handle-size', 'message', 'download'
    ].forEach(key => E[key] = document.getElementById('osb-' + key));

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

    scene.add(new THREE.AmbientLight(0xffffff, 1.65));
    const key = new THREE.DirectionalLight(0xffffff, 1.25);
    key.position.set(190, -230, 220);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.48);
    fill.position.set(-150, 170, 120);
    scene.add(fill);

    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(E.preview);
    else window.addEventListener('resize', resize);

    resize();
    animate();
}

function bind() {
    ['width', 'depth', 'height', 'wall', 'bottom', 'decor'].forEach(key => {
        E[key].addEventListener('input', generate);
        E[key].addEventListener('change', generate);
    });
    E.download.addEventListener('click', downloadSTL);
}

function params() {
    return {
        width: +E.width.value,
        depth: +E.depth.value,
        height: +E.height.value,
        wall: +E.wall.value,
        bottom: +E.bottom.value,
        radius: FIXED_CORNER_RADIUS,
        decor: E.decor.value
    };
}

function calc(a) {
    const outerW = a.width + a.wall * 2;
    const outerD = a.depth + a.wall * 2;
    const outerH = a.height + a.bottom;
    const handleW = clamp(a.depth * 0.32, HANDLE_MIN_W, HANDLE_MAX_W);
    const handleH = HANDLE_H;
    const handleCenterZ = outerH - HANDLE_TOP_MARGIN - handleH / 2;

    return {
        outerW,
        outerD,
        outerH,
        handleW,
        handleH,
        handleCenterZ
    };
}

function generate() {
    const a = params();
    const d = calc(a);
    removeModel();

    boxGroup = makeBox(a, d);
    root = cloneForPreview(boxGroup, COLORS.box);
    scene.add(root);

    updateResults(d);
    fitCamera(d);
    msg(T.ok, 'success');
}

function makeBox(a, d) {
    const group = new THREE.Group();

    // Bottom plate with 90-degree corners. Keeping the floor fully rectangular
    // avoids the curved internal wedge that appeared where the walls meet it.
    group.add(boxMesh(
        d.outerW,
        d.outerD,
        a.bottom,
        0,
        0,
        a.bottom / 2
    ));

    // Front wall: local thickness grows from the inner face toward the outside.
    const front = makeFaceWall({
        faceWidth: d.outerW,
        height: a.height,
        thickness: a.wall,
        cornerRadius: a.radius,
        decor: a.decor,
        handle: null,
        outerAtStart: false
    });
    orientFrontBack(front, -d.outerD / 2 + a.wall, a.bottom);
    group.add(front);

    // Back wall: local zero starts at the exterior face, so the decorative skin stays outside.
    const back = makeFaceWall({
        faceWidth: d.outerW,
        height: a.height,
        thickness: a.wall,
        cornerRadius: a.radius,
        decor: a.decor,
        handle: null,
        outerAtStart: true
    });
    orientFrontBack(back, d.outerD / 2, a.bottom);
    group.add(back);

    const handle = {
        width: d.handleW,
        height: d.handleH,
        centerZ: d.handleCenterZ - a.bottom
    };

    // Left side wall with handle opening.
    const left = makeFaceWall({
        faceWidth: d.outerD,
        height: a.height,
        thickness: a.wall,
        cornerRadius: a.radius,
        decor: a.decor,
        handle,
        // For the left wall local Z=0 is the exterior face.
        outerAtStart: true
    });
    orientLeft(left, -d.outerW / 2, a.bottom);
    group.add(left);

    // Right side wall with handle opening.
    const right = makeFaceWall({
        faceWidth: d.outerD,
        height: a.height,
        thickness: a.wall,
        cornerRadius: a.radius,
        decor: a.decor,
        handle,
        // For the right wall local Z=0 is also the exterior face after mirroring.
        outerAtStart: true
    });
    orientRight(right, d.outerW / 2, a.bottom);
    group.add(right);

    return group;
}

function makeFaceWall({ faceWidth, height, thickness, cornerRadius, decor, handle, outerAtStart }) {
    const group = new THREE.Group();
    const relief = decor === 'smooth' ? 0 : Math.min(RELIEF_DEPTH, Math.max(0.35, thickness * 0.32));
    const coreT = Math.max(0.8, thickness - relief);

    if (decor === 'smooth') {
        const shape = faceShape(faceWidth, height, cornerRadius, handle, 'smooth');
        group.add(meshFromShape(shape, thickness, 0));
        return group;
    }

    const coreShape = faceShape(faceWidth, height, cornerRadius, handle, 'smooth');
    const skinShape = faceShape(faceWidth, height, cornerRadius, handle, decor);

    if (outerAtStart) {
        group.add(meshFromShape(skinShape, relief, 0));
        group.add(meshFromShape(coreShape, coreT, relief));
    } else {
        group.add(meshFromShape(coreShape, coreT, 0));
        group.add(meshFromShape(skinShape, relief, coreT));
    }

    return group;
}

function faceShape(width, height, radius, handle, decor) {
    // Keep all wall faces completely square. The 2 mm corner radius is applied
    // only to the floor footprint. This prevents rounded wall profiles from
    // creating visible curved wedges where the walls meet the bottom plate.
    const shape = wallFaceShape(width, height, 0);

    if (handle) {
        // Real through-hole. This hole is included in every thickness layer of
        // the wall, so it remains open in both preview and exported STL.
        shape.holes.push(roundedRectPathAt(
            handle.width,
            handle.height,
            Math.min(4.0, handle.height * 0.30),
            0,
            handle.centerZ
        ));
    }

    if (decor === 'panel') addPanelRecess(shape, width, height, handle);

    return shape;
}

function wallFaceShape(width, height, topRadius = 0) {
    const hw = width / 2;
    const s = new THREE.Shape();
    s.moveTo(-hw, 0);
    s.lineTo(hw, 0);
    s.lineTo(hw, height);
    s.lineTo(-hw, height);
    s.closePath();
    return s;
}

function addPanelRecess(shape, width, height, handle) {
    const sideMargin = Math.min(16, width * 0.12);
    const bottom = 13;
    let top = height - 13;

    if (handle) {
        const handleBottom = handle.centerZ - handle.height / 2;
        top = Math.min(top, handleBottom - 8);
    }

    const panelW = width - sideMargin * 2;
    const panelH = top - bottom;
    if (panelW < 20 || panelH < 18) return;

    shape.holes.push(roundedRectPathAt(
        panelW,
        panelH,
        Math.min(7, panelH * 0.16),
        0,
        bottom + panelH / 2
    ));
}

function orientFrontBack(group, y, z) {
    group.rotation.x = Math.PI / 2;
    group.position.set(0, y, z);
}

function orientLeft(group, x, z) {
    // ExtrudeGeometry is created in local XY with thickness in local Z.
    // For the left wall we map:
    // local X -> world Y (depth)
    // local Y -> world Z (height)
    // local Z -> world X (thickness, growing inward)
    const basis = new THREE.Matrix4().makeBasis(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(1, 0, 0)
    );
    const translation = new THREE.Matrix4().makeTranslation(x, 0, z);
    applyGeometryTransform(group, translation.clone().multiply(basis));
}

function orientRight(group, x, z) {
    // Mirrored mapping for the right wall. Thickness grows inward in -X.
    // local X is reversed along world Y so the transform remains a proper
    // rotation and the face normals stay consistent.
    const basis = new THREE.Matrix4().makeBasis(
        new THREE.Vector3(0, -1, 0),
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(-1, 0, 0)
    );
    const translation = new THREE.Matrix4().makeTranslation(x, 0, z);
    applyGeometryTransform(group, translation.clone().multiply(basis));
}

function applyGeometryTransform(group, matrix) {
    group.traverse(o => {
        if (!o.isMesh || !o.geometry) return;
        o.geometry.applyMatrix4(matrix);
        o.geometry.computeVertexNormals();
    });
}

function meshFromShape(shape, depth, zOffset) {
    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: false,
        curveSegments: 18
    });
    geometry.translate(0, 0, zOffset);
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry);
}

function boxMesh(width, depth, height, x = 0, y = 0, z = 0) {
    const geometry = new THREE.BoxGeometry(width, depth, height);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry);
    mesh.position.set(x, y, z);
    return mesh;
}

function roundedBox(width, depth, height, radius, x = 0, y = 0, z = 0) {
    const shape = roundedRectShapeAt(width, depth, radius, 0, 0);
    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: height,
        bevelEnabled: false,
        curveSegments: 22
    });
    geometry.translate(0, 0, -height / 2);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry);
    mesh.position.set(x, y, z);
    return mesh;
}

function roundedRectShapeAt(width, height, radius, cx, cy) {
    const s = new THREE.Shape();
    drawRoundedRect(s, width, height, radius, cx, cy, false);
    return s;
}

function roundedRectPathAt(width, height, radius, cx, cy) {
    const p = new THREE.Path();
    drawRoundedRect(p, width, height, radius, cx, cy, true);
    return p;
}

function drawRoundedRect(path, width, height, radius, cx, cy, reverse) {
    const w = width / 2;
    const h = height / 2;
    const r = Math.max(0.01, Math.min(radius, w - 0.01, h - 0.01));

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

function cloneForPreview(source, color) {
    const clone = source.clone(true);
    clone.traverse(o => {
        if (!o.isMesh) return;
        o.geometry = o.geometry.clone();
        o.material = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.60,
            metalness: 0.02,
            side: THREE.DoubleSide
        });
    });
    return clone;
}

function downloadSTL() {
    if (!boxGroup) return msg(T.first, 'error');
    const a = params();
    const obj = boxGroup.clone(true);
    obj.updateMatrix();
    obj.updateMatrixWorld(true);

    exportSTL(
        obj,
        `vekmaker-open-storage-box-${a.width}x${a.depth}x${a.height}mm-${a.decor}.stl`,
        { rotateForPrint: false, centerXY: true, placeOnBed: true }
    );
    msg(T.downloaded, 'success');
}

function updateResults(d) {
    E['outer-size'].textContent = `${fmt(d.outerW)} × ${fmt(d.outerD)} × ${fmt(d.outerH)} mm`;
    E['handle-size'].textContent = `${fmt(d.handleW)} × ${fmt(d.handleH)} mm`;
}

function fitCamera(d) {
    const size = Math.max(d.outerW, d.outerD, d.outerH * 1.35);
    const dist = size * 1.75;
    camera.position.set(dist * 0.90, -dist, dist * 0.72);
    camera.near = Math.max(0.1, dist / 100);
    camera.far = Math.max(5000, dist * 20);
    camera.updateProjectionMatrix();
    controls.target.set(0, 0, d.outerH * 0.42);
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
    boxGroup = null;
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
