import * as THREE from '../../libs/three/three.module.js';
import { OrbitControls } from '../../libs/three/OrbitControls.js';
import { exportSTL } from '../../js/core/stl-exporter.js';

const LANG = ['en', 'pt', 'ja'].includes(document.documentElement.lang)
    ? document.documentElement.lang
    : 'en';

const T = {
    en: {
        ok: 'Matchbox-style box generated successfully.',
        first: 'Generate the box before downloading.',
        sleeve: 'Outer sleeve STL downloaded successfully.',
        tray: 'Inner tray STL downloaded successfully.',
        bad: 'Please check the dimensions.',
        width: 'Internal width must be between 35 mm and 180 mm.',
        depth: 'Internal depth must be between 40 mm and 220 mm.',
        height: 'Internal height must be between 12 mm and 80 mm.'
    },
    pt: {
        ok: 'Caixinha estilo caixa de fósforo gerada com sucesso.',
        first: 'Gere a caixa antes de baixar.',
        sleeve: 'STL da capa externa baixado com sucesso.',
        tray: 'STL da gaveta interna baixado com sucesso.',
        bad: 'Verifique as dimensões.',
        width: 'A largura interna deve estar entre 35 mm e 180 mm.',
        depth: 'A profundidade interna deve estar entre 40 mm e 220 mm.',
        height: 'A altura interna deve estar entre 12 mm e 80 mm.'
    },
    ja: {
        ok: 'マッチボックススタイルのケースを生成しました。',
        first: 'ダウンロードする前にケースを生成してください。',
        sleeve: '外側スリーブSTLをダウンロードしました。',
        tray: '内側トレイSTLをダウンロードしました。',
        bad: '寸法を確認してください。',
        width: '内寸幅は35 mmから180 mmの範囲で指定してください。',
        depth: '内寸奥行きは40 mmから220 mmの範囲で指定してください。',
        height: '内寸高さは12 mmから80 mmの範囲で指定してください。'
    }
}[LANG];

/*
 * Simplified fixed construction values.
 * These are intentionally hidden from the user.
 */
const WALL = 2.0;
const BOTTOM = 2.0;
const SLIDING_CLEARANCE = 0.35;
const CORNER_RADIUS = 5.0;
const PATTERN_HEIGHT = 0.55;

const E = {};
let scene, camera, renderer, controls, root = null;
let sleeveGroup = null;
let trayGroup = null;

document.addEventListener('DOMContentLoaded', () => {
    [
        'preview',
        'width',
        'depth',
        'height',
        'notch',
        'divider',
        'pattern',
        'outer-width',
        'outer-depth',
        'outer-height',
        'message',
        'download-sleeve',
        'download-tray'
    ].forEach(key => E[key] = document.getElementById('mb-' + key));

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

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(160, -200, 170);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.45);
    fillLight.position.set(-120, 160, 90);
    scene.add(fillLight);

    new ResizeObserver(resize).observe(E.preview);
    resize();
    animate();
}

function bind() {
    ['width', 'depth', 'height', 'notch', 'divider', 'pattern'].forEach(key => {
        E[key].addEventListener('input', generate);
        E[key].addEventListener('change', generate);
    });

    E['download-sleeve'].addEventListener('click', downloadSleeve);
    E['download-tray'].addEventListener('click', downloadTray);
}

function params() {
    return {
        innerW: +E.width.value,
        innerD: +E.depth.value,
        innerH: +E.height.value,
        notch: E.notch.value,
        divider: E.divider.value,
        pattern: E.pattern.value
    };
}

function calc(a) {
    const trayW = a.innerW + 2 * WALL;
    const trayD = a.innerD + 2 * WALL;
    const trayH = a.innerH + BOTTOM;

    const sleeveInnerW = trayW + 2 * SLIDING_CLEARANCE;
    const sleeveInnerH = trayH + 2 * SLIDING_CLEARANCE;

    const sleeveW = sleeveInnerW + 2 * WALL;
    const sleeveH = sleeveInnerH + 2 * WALL;
    const sleeveD = trayD;

    return {
        trayW,
        trayD,
        trayH,
        sleeveInnerW,
        sleeveInnerH,
        sleeveW,
        sleeveH,
        sleeveD
    };
}

function validate(a) {
    if (!(a.innerW >= 35 && a.innerW <= 180)) return T.width;
    if (!(a.innerD >= 40 && a.innerD <= 220)) return T.depth;
    if (!(a.innerH >= 12 && a.innerH <= 80)) return T.height;
    return '';
}

function generate() {
    const a = params();
    const d = calc(a);
    const error = validate(a);

    updateResults(d);

    if (error) {
        msg(error, 'error');
        enable(false);
        return;
    }

    removeModel();

    sleeveGroup = makeSleeve(a, d);
    trayGroup = makeTray(a, d);

    // Preview with the tray completely separated from the outer sleeve.
    // Both parts are centered, so use half sleeve depth + half tray depth + gap.
    const previewGap = 12;
    trayGroup.position.y = -(
        d.sleeveD / 2 +
        d.trayD / 2 +
        previewGap
    );

    root = new THREE.Group();
    root.add(sleeveGroup, trayGroup);
    scene.add(root);

    fitCamera(d);
    msg(T.ok, 'success');
    enable(true);
}

function makeSleeve(a, d) {
    const group = new THREE.Group();
    const material = mat(0x3b82f6);

    // Closed rounded rectangular tube, open at both ends.
    const shape = roundedRectShape(d.sleeveW, d.sleeveH, CORNER_RADIUS);
    /*
     * Keep the sleeve exterior rounded, but use a much smaller internal radius.
     * With the existing 0.35 mm sliding clearance, a 1.0 mm internal radius
     * allows the stable square-corner tray to pass without collision.
     *
     * This avoids the custom rounded tray geometry that produced Open Edges
     * in Bambu Studio.
     */
    const innerRadius = 1.0;
    const hole = roundedRectHole(
        d.sleeveInnerW,
        d.sleeveInnerH,
        innerRadius
    );
    shape.holes.push(hole);

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: d.sleeveD,
        bevelEnabled: false,
        curveSegments: 16,
        steps: 1
    });

    // Shape plane X/Y -> model X/Z; extrusion axis -> model depth Y.
    geometry.rotateX(Math.PI / 2);
    geometry.computeVertexNormals();

    const sleeve = new THREE.Mesh(geometry, material);
    sleeve.position.y = d.sleeveD / 2;
    group.add(sleeve);

    if (a.pattern === 'grooves') {
        addTopPattern(group, d);
    }

    return group;
}

function addTopPattern(group, d) {
    const m = mat(0x2563eb);
    const topZ = d.sleeveH / 2 + PATTERN_HEIGHT / 2;
    const usableW = Math.max(20, d.sleeveW - 22);
    const lineLen = Math.min(d.sleeveD * 0.46, 52);
    const count = 7;
    const gap = usableW / (count + 1);

    for (let i = 1; i <= count; i++) {
        const x = -usableW / 2 + i * gap;
        const rib = cube(
            1.1,
            lineLen,
            PATTERN_HEIGHT,
            x,
            -d.sleeveD * 0.08,
            topZ,
            m
        );
        rib.rotation.z = (i - (count + 1) / 2) * 0.025;
        group.add(rib);
    }
}

function makeTray(a, d) {
    const group = new THREE.Group();
    const material = mat(0x60a5fa);

    // Bottom.
    group.add(cube(
        d.trayW,
        d.trayD,
        BOTTOM,
        0,
        0,
        BOTTOM / 2,
        material
    ));

    // Left/right walls.
    group.add(cube(
        WALL,
        d.trayD,
        a.innerH,
        -d.trayW / 2 + WALL / 2,
        0,
        BOTTOM + a.innerH / 2,
        material
    ));
    group.add(cube(
        WALL,
        d.trayD,
        a.innerH,
        d.trayW / 2 - WALL / 2,
        0,
        BOTTOM + a.innerH / 2,
        material
    ));

    // Back wall.
    group.add(cube(
        d.trayW - 2 * WALL,
        WALL,
        a.innerH,
        0,
        d.trayD / 2 - WALL / 2,
        BOTTOM + a.innerH / 2,
        material
    ));

    // Front wall with optional finger opening.
    const frontWall = makeFrontWall(a, d, material);
    frontWall.position.y = -d.trayD / 2 + WALL;
    group.add(frontWall);

    if (a.divider === 'two') {
        // Center divider rotated 90 degrees:
        // runs from left to right, splitting the tray into front/back compartments.
        group.add(cube(
            a.innerW,
            WALL,
            a.innerH,
            0,
            0,
            BOTTOM + a.innerH / 2,
            material
        ));
    }

    return group;
}

function makeFrontWall(a, d, material) {
    if (a.notch === 'none') {
        return cube(
            d.trayW - 2 * WALL,
            WALL,
            a.innerH,
            0,
            0,
            BOTTOM + a.innerH / 2,
            material
        );
    }

    const w = d.trayW - 2 * WALL;
    const h = a.innerH;
    const notchWidth = Math.min(Math.max(w * 0.28, 20), 42);
    const notchDepth = Math.min(Math.max(h * 0.34, 7), 14);

    const shape = new THREE.Shape();
    const left = -w / 2;
    const right = w / 2;
    const top = h;
    const halfNotch = notchWidth / 2;

    shape.moveTo(left, 0);
    shape.lineTo(right, 0);
    shape.lineTo(right, top);

    if (a.notch === 'semi') {
        /*
         * Semicircular finger notch.
         * The previous arc used the upper half of the circle, which created
         * material above the tray instead of cutting downward into the wall.
         *
         * Draw the lower half explicitly with two cubic Bézier curves.
         */
        const radius = Math.min(halfNotch, Math.max(5, h * 0.42));
        const k = 0.5522847498;

        shape.lineTo(radius, top);
        shape.bezierCurveTo(
            radius,
            top - k * radius,
            k * radius,
            top - radius,
            0,
            top - radius
        );
        shape.bezierCurveTo(
            -k * radius,
            top - radius,
            -radius,
            top - k * radius,
            -radius,
            top
        );
        shape.lineTo(left, top);
    } else {
        // Rounded U-shaped slot.
        const r = Math.min(5, notchWidth * 0.18, notchDepth * 0.55);
        shape.lineTo(halfNotch, top);
        shape.lineTo(halfNotch, top - notchDepth + r);
        shape.quadraticCurveTo(
            halfNotch,
            top - notchDepth,
            halfNotch - r,
            top - notchDepth
        );
        shape.lineTo(-halfNotch + r, top - notchDepth);
        shape.quadraticCurveTo(
            -halfNotch,
            top - notchDepth,
            -halfNotch,
            top - notchDepth + r
        );
        shape.lineTo(-halfNotch, top);
        shape.lineTo(left, top);
    }

    shape.lineTo(left, 0);

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: WALL,
        bevelEnabled: false,
        curveSegments: 20,
        steps: 1
    });

    geometry.rotateX(Math.PI / 2);
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, material.clone());

    // Extrusion runs toward negative Y after rotation.
    // The local shape starts at Z=0, so lift it above the bottom.
    mesh.position.z = BOTTOM;

    return mesh;
}

function roundedRectShape(w, h, r) {
    const s = new THREE.Shape();
    const x = -w / 2;
    const y = -h / 2;
    r = Math.min(Math.max(r, 0), w / 2, h / 2);

    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    return s;
}

function roundedRectHole(w, h, r) {
    const q = new THREE.Path();
    const x = -w / 2;
    const y = -h / 2;
    r = Math.min(Math.max(r, 0), w / 2, h / 2);

    // Clockwise inner contour.
    q.moveTo(x + r, y);
    q.quadraticCurveTo(x, y, x, y + r);
    q.lineTo(x, y + h - r);
    q.quadraticCurveTo(x, y + h, x + r, y + h);
    q.lineTo(x + w - r, y + h);
    q.quadraticCurveTo(x + w, y + h, x + w, y + h - r);
    q.lineTo(x + w, y + r);
    q.quadraticCurveTo(x + w, y, x + w - r, y);
    q.lineTo(x + r, y);

    return q;
}

function mat(color) {
    return new THREE.MeshStandardMaterial({
        color,
        roughness: 0.58,
        metalness: 0.03,
        side: THREE.DoubleSide
    });
}

function cube(w, d, h, x, y, z, material) {
    const geometry = new THREE.BoxGeometry(w, d, h);
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, material.clone());
    mesh.position.set(x, y, z);
    return mesh;
}

function updateResults(d) {
    E['outer-width'].textContent = `${fmt(d.sleeveW)} mm`;
    E['outer-depth'].textContent = `${fmt(d.sleeveD)} mm`;
    E['outer-height'].textContent = `${fmt(d.sleeveH)} mm`;
}

function downloadSleeve() {
    const a = params();
    const d = calc(a);
    const error = validate(a);

    if (error) return msg(error, 'error');
    if (!sleeveGroup) return msg(T.first, 'error');

    const o = sleeveGroup.clone(true);

    /*
     * Print sleeve standing on one open end:
     * its long tube axis (Y) becomes vertical (Z).
     */
    o.rotation.x = Math.PI / 2;
    o.position.set(0, 0, d.sleeveD / 2);
    o.updateMatrix();
    o.updateMatrixWorld(true);

    exportSTL(
        o,
        `vekmaker-matchbox-sleeve-${fmt(d.sleeveW)}x${fmt(d.sleeveD)}x${fmt(d.sleeveH)}mm.stl`,
        { rotateForPrint: false }
    );

    msg(T.sleeve, 'success');
}

function downloadTray() {
    const a = params();
    const d = calc(a);
    const error = validate(a);

    if (error) return msg(error, 'error');
    if (!trayGroup) return msg(T.first, 'error');

    const o = trayGroup.clone(true);
    o.position.set(0, 0, 0);
    o.updateMatrix();
    o.updateMatrixWorld(true);

    exportSTL(
        o,
        `vekmaker-matchbox-tray-${fmt(a.innerW)}x${fmt(a.innerD)}x${fmt(a.innerH)}mm.stl`,
        { rotateForPrint: false }
    );

    msg(T.tray, 'success');
}

function fitCamera(d) {
    const dist = Math.max(d.sleeveW, d.sleeveD, d.sleeveH) * 2.15;

    camera.position.set(dist * 0.9, -dist, dist * 0.7);
    camera.near = Math.max(0.1, dist / 100);
    camera.far = Math.max(5000, dist * 20);
    camera.updateProjectionMatrix();

    controls.target.set(0, -d.sleeveD * 0.07, 0);
    controls.update();
}

function removeModel() {
    if (!root) return;

    scene.remove(root);
    root.traverse(obj => {
        if (!obj.isMesh) return;
        obj.geometry?.dispose();
        obj.material?.dispose();
    });

    root = null;
    sleeveGroup = null;
    trayGroup = null;
}

function enable(value) {
    E['download-sleeve'].disabled = !value;
    E['download-tray'].disabled = !value;
}

function msg(text, type = '') {
    E.message.textContent = text;
    E.message.className = 'validation-message';
    if (type) E.message.classList.add(type);
}

function fmt(value) {
    return Number(value)
        .toFixed(2)
        .replace(/\.00$/, '')
        .replace(/(\.\d)0$/, '$1');
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
