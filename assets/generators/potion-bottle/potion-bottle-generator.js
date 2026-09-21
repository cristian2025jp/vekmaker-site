import * as THREE from '../../libs/three/three.module.js';
import { OrbitControls } from '../../libs/three/OrbitControls.js';
import { exportSTL } from '../../js/core/stl-exporter.js';

const LANG = ['en', 'pt', 'ja'].includes(document.documentElement.lang)
    ? document.documentElement.lang
    : 'en';

const T = {
    en: {
        ok: 'Potion bottle generated successfully.',
        first: 'Generate the bottle before downloading.',
        bottle: 'Bottle STL downloaded successfully.',
        cap: 'Cap STL downloaded successfully.',
        invalid: 'Please choose a valid size combination.'
    },
    pt: {
        ok: 'Frasco de poção gerado com sucesso.',
        first: 'Gere o frasco antes de baixar.',
        bottle: 'STL do frasco baixado com sucesso.',
        cap: 'STL da tampa baixado com sucesso.',
        invalid: 'Escolha uma combinação de tamanho válida.'
    },
    ja: {
        ok: 'ポーションボトルを生成しました。',
        first: 'ダウンロードする前にボトルを生成してください。',
        bottle: 'ボトルのSTLをダウンロードしました。',
        cap: 'キャップのSTLをダウンロードしました。',
        invalid: '有効なサイズの組み合わせを選択してください。'
    }
}[LANG];

const CAP_HEIGHT = 20;
const BODY_SEGMENTS = 128;
const CAP_SEGMENTS = 96;
const BODY_ROWS = 60;
const CAP_ROWS = 9;
const CROSS_SECTION_POWER = 2.65;
const LABEL_RELIEF = 1.2;

const E = {};
let scene, camera, renderer, controls, root = null, bottleGroup = null, capMesh = null;

const PROFILE = [
    [0.00, 0.80, 0.78],
    [0.03, 0.87, 0.85],
    [0.08, 0.95, 0.94],
    [0.15, 0.995, 0.995],
    [0.52, 1.00, 1.00],
    [0.62, 0.99, 0.99],
    [0.69, 0.95, 0.96],
    [0.75, 0.87, 0.90],
    [0.80, 0.74, 0.80],
    [0.84, 0.58, 0.66],
    [0.87, 0.47, 0.55],
    [0.89, 0.42, 0.49],
    [0.965, 0.415, 0.485],
    [0.985, 0.405, 0.475],
    [1.00, 0.392, 0.462]
];

document.addEventListener('DOMContentLoaded', () => {
    [
        'preview', 'width', 'height', 'depth', 'front-style', 'cap-style',
        'outer-size', 'cap-height', 'message', 'download-bottle', 'download-cap'
    ].forEach(key => E[key] = document.getElementById('pb-' + key));

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
    const key = new THREE.DirectionalLight(0xffffff, 1.3);
    key.position.set(180, -220, 220);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.45);
    fill.position.set(-150, 170, 100);
    scene.add(fill);

    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(E.preview);
    else window.addEventListener('resize', resize);

    resize();
    animate();
}

function bind() {
    ['width', 'height', 'depth', 'front-style', 'cap-style'].forEach(key => {
        E[key].addEventListener('input', generate);
        E[key].addEventListener('change', generate);
    });
    E['download-bottle'].addEventListener('click', downloadBottle);
    E['download-cap'].addEventListener('click', downloadCap);
}

function params() {
    return {
        width: +E.width.value,
        height: +E.height.value,
        depth: +E.depth.value,
        frontStyle: E['front-style'].value,
        capStyle: E['cap-style'].value
    };
}

function validate(a) {
    if (!(a.width >= 80 && a.width <= 140)) return false;
    if (!(a.height >= 110 && a.height <= 190)) return false;
    if (!(a.depth >= 30 && a.depth <= 70)) return false;
    if (a.depth > a.width * 0.62) return false;
    return true;
}

function generate() {
    const a = params();
    if (!validate(a)) {
        msg(T.invalid, 'error');
        return;
    }

    removeModel();
    root = new THREE.Group();
    bottleGroup = makeBottle(a);
    root.add(bottleGroup);

    capMesh = new THREE.Mesh(makeCapGeometry(a), material(0xc89a63));
    const capDims = capDimensions(a);
    // Preview only: the cork sits slightly inside the neck to look like a real stopper.
    // Downloads remain separate, exactly as before.
    const insertDepth = a.capStyle === 'cork' ? 6 : 3;
    capMesh.position.set(0, 0, a.height - insertDepth);
    root.add(capMesh);

    scene.add(root);
    updateResults(a);
    fitCamera(a);
    msg(T.ok, 'success');
}

function makeBottle(a) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(makeBottleGeometry(a), material(0x72b7c8));
    group.add(body);

    if (a.frontStyle === 'outline') addLabelOutline(group, a);
    if (a.frontStyle === 'flat') addFlatLabel(group, a);

    return group;
}

function makeBottleGeometry(a) {
    const vertices = [];
    const indices = [];
    const rings = [];

    for (let j = 0; j <= BODY_ROWS; j++) {
        const t = j / BODY_ROWS;
        const z = t * a.height;
        const [sx, sy] = profileAt(t);
        const rx = a.width * 0.5 * sx;
        const ry = a.depth * 0.5 * sy;
        const ring = [];

        for (let i = 0; i < BODY_SEGMENTS; i++) {
            const theta = i / BODY_SEGMENTS * Math.PI * 2;
            const [x, y] = superellipsePoint(theta, rx, ry, CROSS_SECTION_POWER);
            ring.push(addVertex(vertices, x, y, z));
        }
        rings.push(ring);
    }

    for (let j = 0; j < rings.length - 1; j++) {
        for (let i = 0; i < BODY_SEGMENTS; i++) {
            const n = (i + 1) % BODY_SEGMENTS;
            quad(indices, rings[j][i], rings[j][n], rings[j + 1][n], rings[j + 1][i]);
        }
    }

    const bottomCenter = addVertex(vertices, 0, 0, 0);
    for (let i = 0; i < BODY_SEGMENTS; i++) {
        const n = (i + 1) % BODY_SEGMENTS;
        indices.push(bottomCenter, rings[0][n], rings[0][i]);
    }

    const topCenter = addVertex(vertices, 0, 0, a.height);
    const top = rings[rings.length - 1];
    for (let i = 0; i < BODY_SEGMENTS; i++) {
        const n = (i + 1) % BODY_SEGMENTS;
        indices.push(topCenter, top[i], top[n]);
    }

    return finishGeometry(vertices, indices);
}

function profileAt(t) {
    if (t <= PROFILE[0][0]) return [PROFILE[0][1], PROFILE[0][2]];
    if (t >= PROFILE[PROFILE.length - 1][0]) {
        const last = PROFILE[PROFILE.length - 1];
        return [last[1], last[2]];
    }

    let i = 0;
    for (; i < PROFILE.length - 1; i++) {
        if (t >= PROFILE[i][0] && t <= PROFILE[i + 1][0]) break;
    }

    const p0 = PROFILE[Math.max(0, i - 1)];
    const p1 = PROFILE[i];
    const p2 = PROFILE[i + 1];
    const p3 = PROFILE[Math.min(PROFILE.length - 1, i + 2)];

    const span = Math.max(1e-6, p2[0] - p1[0]);
    const u = clamp((t - p1[0]) / span, 0, 1);

    const sx = catmullRom(p0[1], p1[1], p2[1], p3[1], u);
    const sy = catmullRom(p0[2], p1[2], p2[2], p3[2], u);

    return [sx, sy];
}

function superellipsePoint(theta, rx, ry, power) {
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    const exp = 2 / power;
    const x = rx * Math.sign(c || 1) * Math.pow(Math.abs(c), exp);
    const y = ry * Math.sign(s || 1) * Math.pow(Math.abs(s), exp);
    return [x, y];
}

function addLabelOutline(group, a) {
    const dims = labelDimensions(a);
    const shape = roundedRectShape(dims.width, dims.height, dims.radius);
    const inner = roundedRectPath(dims.width - 5.2, dims.height - 5.2, Math.max(2, dims.radius - 2.6));
    shape.holes.push(inner);

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: LABEL_RELIEF,
        bevelEnabled: false,
        curveSegments: 16
    });
    geometry.rotateX(Math.PI / 2);

    const mesh = new THREE.Mesh(geometry, material(0x5ca4b8));
    const frontY = frontSurfaceY(a, dims.centerZ);
    mesh.position.set(0, frontY + 0.45, dims.centerZ);
    group.add(mesh);
}

function addFlatLabel(group, a) {
    const dims = labelDimensions(a);
    const shape = roundedRectShape(dims.width, dims.height, dims.radius);
    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 2.2,
        bevelEnabled: true,
        bevelThickness: 0.35,
        bevelSize: 0.35,
        bevelSegments: 2,
        curveSegments: 18
    });
    geometry.rotateX(Math.PI / 2);

    const mesh = new THREE.Mesh(geometry, material(0x5ca4b8));
    const frontY = frontSurfaceY(a, dims.centerZ);
    mesh.position.set(0, frontY + 0.65, dims.centerZ);
    group.add(mesh);
}

function labelDimensions(a) {
    return {
        width: a.width * 0.52,
        height: Math.min(a.height * 0.30, 48),
        radius: Math.max(5, a.width * 0.055),
        centerZ: a.height * 0.38
    };
}

function frontSurfaceY(a, z) {
    const t = clamp(z / a.height, 0, 1);
    const [, sy] = profileAt(t);
    return -a.depth * 0.5 * sy;
}

function capDimensions(a) {
    const neckRx = a.width * 0.5 * PROFILE[PROFILE.length - 1][1];
    const neckRy = a.depth * 0.5 * PROFILE[PROFILE.length - 1][2];
    const cork = a.capStyle === 'cork';
    const scale = cork ? 0.82 : 0.90;
    return {
        width: neckRx * 2 * scale,
        depth: neckRy * 2 * scale,
        height: CAP_HEIGHT
    };
}

function makeCapGeometry(a) {
    const d = capDimensions(a);
    const cork = a.capStyle === 'cork';
    const vertices = [];
    const indices = [];
    const rings = [];

    for (let j = 0; j <= CAP_ROWS; j++) {
        const t = j / CAP_ROWS;
        const z = t * d.height;
        const taper = cork ? lerp(0.82, 1.00, smoothstep(t)) : lerp(0.94, 1.00, smoothstep(t));
        const ring = [];
        for (let i = 0; i < CAP_SEGMENTS; i++) {
            const theta = i / CAP_SEGMENTS * Math.PI * 2;
            let irregular = 1;
            if (cork) {
                irregular += 0.010 * Math.sin(theta * 7 + j * 1.73);
                irregular += 0.007 * Math.sin(theta * 13 - j * 0.91);
                irregular += 0.004 * Math.sin(theta * 19 + j * 0.47);
            }
            const rx = d.width * 0.5 * taper * irregular;
            const ry = d.depth * 0.5 * taper * irregular;
            const [x, y] = superellipsePoint(theta, rx, ry, 2.35);
            ring.push(addVertex(vertices, x, y, z));
        }
        rings.push(ring);
    }

    for (let j = 0; j < rings.length - 1; j++) {
        for (let i = 0; i < CAP_SEGMENTS; i++) {
            const n = (i + 1) % CAP_SEGMENTS;
            quad(indices, rings[j][i], rings[j][n], rings[j + 1][n], rings[j + 1][i]);
        }
    }

    const bottomCenter = addVertex(vertices, 0, 0, 0);
    for (let i = 0; i < CAP_SEGMENTS; i++) {
        const n = (i + 1) % CAP_SEGMENTS;
        indices.push(bottomCenter, rings[0][n], rings[0][i]);
    }

    const topCenter = addVertex(vertices, 0, 0, d.height);
    const top = rings[rings.length - 1];
    for (let i = 0; i < CAP_SEGMENTS; i++) {
        const n = (i + 1) % CAP_SEGMENTS;
        indices.push(topCenter, top[i], top[n]);
    }

    return finishGeometry(vertices, indices);
}

function roundedRectShape(width, height, radius) {
    const s = new THREE.Shape();
    drawRoundedRect(s, width, height, radius, false);
    return s;
}

function roundedRectPath(width, height, radius) {
    const p = new THREE.Path();
    drawRoundedRect(p, width, height, radius, true);
    return p;
}

function drawRoundedRect(path, width, height, radius, reverse) {
    const w = width / 2;
    const h = height / 2;
    const r = Math.min(radius, w - 0.01, h - 0.01);

    if (!reverse) {
        path.moveTo(-w + r, -h);
        path.lineTo(w - r, -h);
        path.quadraticCurveTo(w, -h, w, -h + r);
        path.lineTo(w, h - r);
        path.quadraticCurveTo(w, h, w - r, h);
        path.lineTo(-w + r, h);
        path.quadraticCurveTo(-w, h, -w, h - r);
        path.lineTo(-w, -h + r);
        path.quadraticCurveTo(-w, -h, -w + r, -h);
    } else {
        path.moveTo(-w + r, -h);
        path.quadraticCurveTo(-w, -h, -w, -h + r);
        path.lineTo(-w, h - r);
        path.quadraticCurveTo(-w, h, -w + r, h);
        path.lineTo(w - r, h);
        path.quadraticCurveTo(w, h, w, h - r);
        path.lineTo(w, -h + r);
        path.quadraticCurveTo(w, -h, w - r, -h);
        path.lineTo(-w + r, -h);
    }
    path.closePath();
}

function addVertex(vertices, x, y, z) {
    const i = vertices.length / 3;
    vertices.push(x, y, z);
    return i;
}

function quad(indices, a, b, c, d) {
    indices.push(a, b, c, a, c, d);
}

function finishGeometry(vertices, indices) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
}

function material(color) {
    return new THREE.MeshStandardMaterial({
        color,
        roughness: 0.60,
        metalness: 0.02,
        side: THREE.DoubleSide
    });
}

function updateResults(a) {
    E['outer-size'].textContent = `${fmt(a.width)} × ${fmt(a.depth)} × ${fmt(a.height)} mm`;
    E['cap-height'].textContent = `${CAP_HEIGHT} mm`;
}

function downloadBottle() {
    if (!bottleGroup) return msg(T.first, 'error');
    const a = params();
    const obj = bottleGroup.clone(true);
    obj.position.set(0, 0, 0);
    obj.updateMatrix();
    obj.updateMatrixWorld(true);
    exportSTL(
        obj,
        `vekmaker-potion-bottle-${a.width}x${a.depth}x${a.height}mm-${a.frontStyle}.stl`,
        { rotateForPrint: false, centerXY: true, placeOnBed: true }
    );
    msg(T.bottle, 'success');
}

function downloadCap() {
    if (!capMesh) return msg(T.first, 'error');
    const a = params();
    const obj = capMesh.clone(true);
    obj.position.set(0, 0, 0);
    obj.updateMatrix();
    obj.updateMatrixWorld(true);
    exportSTL(
        obj,
        `vekmaker-potion-bottle-cap-${a.capStyle}.stl`,
        { rotateForPrint: false, centerXY: true, placeOnBed: true }
    );
    msg(T.cap, 'success');
}

function fitCamera(a) {
    const d = capDimensions(a);
    const size = Math.max(a.width, a.depth * 1.4, a.height + d.height);
    const dist = size * 1.72;
    camera.position.set(dist * 0.82, -dist, dist * 0.66);
    camera.near = Math.max(0.1, dist / 100);
    camera.far = Math.max(5000, dist * 20);
    camera.updateProjectionMatrix();
    controls.target.set(0, 0, (a.height + d.height) * 0.46);
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
    bottleGroup = null;
    capMesh = null;
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

function fmt(v) {
    return Number(v).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function catmullRom(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}
function smoothstep(t) { return t * t * (3 - 2 * t); }
