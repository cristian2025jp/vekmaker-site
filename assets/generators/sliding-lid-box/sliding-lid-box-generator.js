import * as THREE from '../../libs/three/three.module.js';
import { OrbitControls } from '../../libs/three/OrbitControls.js';
import { exportSTL } from '../../js/core/stl-exporter.js';

const MODEL_COLOR = 0x3b82f6;
const LID_COLOR = 0x60a5fa;

const I18N = {
    en: {
        previewMissing: 'Sliding lid box preview container was not found.',
        widthRange: 'Internal width must be between 20 mm and 350 mm.',
        depthRange: 'Internal depth must be between 20 mm and 350 mm.',
        heightRange: 'Internal height must be between 10 mm and 200 mm.',
        wallRange: 'Wall thickness must be between 1.2 mm and 10 mm.',
        bottomRange: 'Bottom thickness must be between 1 mm and 10 mm.',
        lidRange: 'Lid thickness must be between 1 mm and 6 mm.',
        clearanceRange: 'Lid clearance must be between 0.1 mm and 1.5 mm.',
        grooveRange: max => `Groove depth must be between 0.6 mm and ${max} mm for the selected wall thickness.`,
        grooveWall: 'Increase the wall thickness or reduce the groove depth so at least 0.6 mm of outer wall remains.',
        generated: 'Sliding lid box generated successfully.',
        generateFirstBox: 'Generate the box before downloading.',
        generateFirstLid: 'Generate the lid before downloading.',
        boxDownloaded: 'Box STL downloaded successfully.',
        lidDownloaded: 'Lid STL downloaded successfully.'
    },
    pt: {
        previewMissing: 'A área de visualização da caixa com tampa deslizante não foi encontrada.',
        widthRange: 'A largura interna deve estar entre 20 mm e 350 mm.',
        depthRange: 'A profundidade interna deve estar entre 20 mm e 350 mm.',
        heightRange: 'A altura interna deve estar entre 10 mm e 200 mm.',
        wallRange: 'A espessura da parede deve estar entre 1,2 mm e 10 mm.',
        bottomRange: 'A espessura do fundo deve estar entre 1 mm e 10 mm.',
        lidRange: 'A espessura da tampa deve estar entre 1 mm e 6 mm.',
        clearanceRange: 'A folga da tampa deve estar entre 0,1 mm e 1,5 mm.',
        grooveRange: max => `A profundidade da canaleta deve estar entre 0,6 mm e ${max} mm para a espessura de parede escolhida.`,
        grooveWall: 'Aumente a espessura da parede ou reduza a profundidade da canaleta para manter pelo menos 0,6 mm de parede externa.',
        generated: 'Caixa com tampa deslizante gerada com sucesso.',
        generateFirstBox: 'Gere a caixa antes de baixar.',
        generateFirstLid: 'Gere a tampa antes de baixar.',
        boxDownloaded: 'STL da caixa baixado com sucesso.',
        lidDownloaded: 'STL da tampa baixado com sucesso.'
    },
    ja: {
        previewMissing: 'スライド式フタ付きボックスのプレビュー領域が見つかりません。',
        widthRange: '内幅は20 mmから350 mmの範囲で指定してください。',
        depthRange: '内奥行きは20 mmから350 mmの範囲で指定してください。',
        heightRange: '内高さは10 mmから200 mmの範囲で指定してください。',
        wallRange: '壁の厚さは1.2 mmから10 mmの範囲で指定してください。',
        bottomRange: '底の厚さは1 mmから10 mmの範囲で指定してください。',
        lidRange: 'フタの厚さは1 mmから6 mmの範囲で指定してください。',
        clearanceRange: 'フタのクリアランスは0.1 mmから1.5 mmの範囲で指定してください。',
        grooveRange: max => `選択した壁厚では、溝の深さを0.6 mmから${max} mmの範囲で指定してください。`,
        grooveWall: '外側の壁を0.6 mm以上残すため、壁厚を増やすか溝を浅くしてください。',
        generated: 'スライド式フタ付きボックスを生成しました。',
        generateFirstBox: 'ダウンロードする前にボックスを生成してください。',
        generateFirstLid: 'ダウンロードする前にフタを生成してください。',
        boxDownloaded: 'ボックスのSTLをダウンロードしました。',
        lidDownloaded: 'フタのSTLをダウンロードしました。'
    }
};

const LANG = ['en', 'pt', 'ja'].includes(document.documentElement.lang)
    ? document.documentElement.lang
    : 'en';
const TEXT = I18N[LANG];

const e = {};
let scene, camera, renderer, controls;
let bodyGroup = null;
let lidGroup = null;
let previewRoot = null;
let resizeObserver = null;

document.addEventListener('DOMContentLoaded', () => {
    cache();
    if (!e.preview) {
        console.error(TEXT.previewMissing);
        return;
    }
    initPreview();
    bindEvents();
    generate();
});

function cache() {
    const ids = {
        preview: 'slb-preview',
        internalWidth: 'slb-internal-width',
        internalDepth: 'slb-internal-depth',
        internalHeight: 'slb-internal-height',
        wall: 'slb-wall-thickness',
        bottom: 'slb-bottom-thickness',
        lidThickness: 'slb-lid-thickness',
        clearance: 'slb-clearance',
        grooveDepth: 'slb-groove-depth',
        externalWidth: 'slb-external-width',
        externalDepth: 'slb-external-depth',
        totalHeight: 'slb-total-height',
        lidSize: 'slb-lid-size',
        message: 'slb-message',
        generate: 'slb-generate',
        downloadBox: 'slb-download-box',
        downloadLid: 'slb-download-lid'
    };
    for (const [key, id] of Object.entries(ids)) {
        e[key] = document.getElementById(id);
    }
}

function initPreview() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);

    camera = new THREE.PerspectiveCamera(45, aspect(), 0.1, 5000);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    resize();
    e.preview.replaceChildren(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;

    scene.add(new THREE.AmbientLight(0xffffff, 1.55));

    const main = new THREE.DirectionalLight(0xffffff, 1.25);
    main.position.set(120, 180, 140);
    scene.add(main);

    const fill = new THREE.DirectionalLight(0xffffff, 0.55);
    fill.position.set(-100, 70, -100);
    scene.add(fill);

    if ('ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(e.preview);
    } else {
        window.addEventListener('resize', resize);
    }

    animate();
}

function bindEvents() {
    [
        e.internalWidth,
        e.internalDepth,
        e.internalHeight,
        e.wall,
        e.bottom,
        e.lidThickness,
        e.clearance,
        e.grooveDepth
    ].forEach(el => {
        el?.addEventListener('input', generate);
        el?.addEventListener('change', generate);
    });

    e.generate?.addEventListener('click', generate);
    e.downloadBox?.addEventListener('click', downloadBox);
    e.downloadLid?.addEventListener('click', downloadLid);
}

function readParameters() {
    return {
        internalWidth: Number(e.internalWidth?.value),
        internalDepth: Number(e.internalDepth?.value),
        internalHeight: Number(e.internalHeight?.value),
        wall: Number(e.wall?.value),
        bottom: Number(e.bottom?.value),
        lidThickness: Number(e.lidThickness?.value),
        clearance: Number(e.clearance?.value),
        grooveDepth: Number(e.grooveDepth?.value)
    };
}

function calculate(p) {
    const externalWidth = p.internalWidth + p.wall * 2;
    const externalDepth = p.internalDepth + p.wall * 2;

    const channelHeight = p.lidThickness + p.clearance * 2;
    const topRailHeight = Math.max(1.2, p.wall * 0.75);
    const grooveBottom = p.bottom + p.internalHeight;
    const totalHeight = grooveBottom + channelHeight + topRailHeight;

    const lidWidth = p.internalWidth + 2 * (p.grooveDepth - p.clearance);
    const lidDepth = p.internalDepth + p.wall - 2 * p.clearance;
    const lidTabWidth = Math.min(30, Math.max(16, lidWidth * 0.32));
    const lidTabDepth = Math.min(10, Math.max(6, p.wall * 3));

    return {
        externalWidth,
        externalDepth,
        channelHeight,
        topRailHeight,
        grooveBottom,
        totalHeight,
        lidWidth,
        lidDepth,
        lidTabWidth,
        lidTabDepth
    };
}

function validate(p) {
    if (!between(p.internalWidth, 20, 350)) return TEXT.widthRange;
    if (!between(p.internalDepth, 20, 350)) return TEXT.depthRange;
    if (!between(p.internalHeight, 10, 200)) return TEXT.heightRange;
    if (!between(p.wall, 1.2, 10)) return TEXT.wallRange;
    if (!between(p.bottom, 1, 10)) return TEXT.bottomRange;
    if (!between(p.lidThickness, 1, 6)) return TEXT.lidRange;
    if (!between(p.clearance, 0.1, 1.5)) return TEXT.clearanceRange;

    const maxGroove = p.wall - 0.6;
    if (maxGroove < 0.6) return TEXT.grooveWall;
    if (!between(p.grooveDepth, 0.6, maxGroove)) {
        return TEXT.grooveRange(formatNumber(maxGroove));
    }

    return '';
}

function generate() {
    const p = readParameters();
    const d = calculate(p);
    updateResults(d);

    const error = validate(p);
    if (error) {
        setMessage(error, 'error');
        setDownloads(false);
        return false;
    }

    removeModel();

    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: MODEL_COLOR,
        roughness: 0.58,
        metalness: 0.04,
        side: THREE.DoubleSide
    });

    const lidMaterial = new THREE.MeshStandardMaterial({
        color: LID_COLOR,
        roughness: 0.58,
        metalness: 0.04,
        side: THREE.DoubleSide
    });

    bodyGroup = createBody(p, d, bodyMaterial);
    lidGroup = createLid(p, d, lidMaterial);

    previewRoot = new THREE.Group();
    previewRoot.add(bodyGroup);
    previewRoot.add(lidGroup);

    // Show the lid partially open in the preview while keeping the export geometry flat.
    lidGroup.position.y = -(d.externalDepth * 0.28);
    scene.add(previewRoot);

    fitCamera(d);
    setMessage(TEXT.generated, 'success');
    setDownloads(true);
    return true;
}

function createBody(p, d, material) {
    const group = new THREE.Group();

    // Bottom
    group.add(boxMesh(
        d.externalWidth,
        d.externalDepth,
        p.bottom,
        0,
        0,
        p.bottom / 2,
        material
    ));

    // Front wall: stops below the lid entrance.
    group.add(boxMesh(
        d.externalWidth,
        p.wall,
        p.internalHeight,
        0,
        -d.externalDepth / 2 + p.wall / 2,
        p.bottom + p.internalHeight / 2,
        material
    ));

    // Back wall: full height and acts as the lid stop.
    group.add(boxMesh(
        d.externalWidth,
        p.wall,
        d.totalHeight - p.bottom,
        0,
        d.externalDepth / 2 - p.wall / 2,
        p.bottom + (d.totalHeight - p.bottom) / 2,
        material
    ));

    // Side walls are built in three levels so the middle level forms the sliding grooves.
    const sideDepth = p.internalDepth;
    const lowerHeight = p.internalHeight;
    const channelWallThickness = p.wall - p.grooveDepth;

    // Lower side walls
    group.add(boxMesh(
        p.wall, sideDepth, lowerHeight,
        -d.externalWidth / 2 + p.wall / 2,
        0,
        p.bottom + lowerHeight / 2,
        material
    ));
    group.add(boxMesh(
        p.wall, sideDepth, lowerHeight,
        d.externalWidth / 2 - p.wall / 2,
        0,
        p.bottom + lowerHeight / 2,
        material
    ));

    // Recessed channel level — material remains only on the outer side of each wall.
    group.add(boxMesh(
        channelWallThickness, sideDepth, d.channelHeight,
        -d.externalWidth / 2 + channelWallThickness / 2,
        0,
        d.grooveBottom + d.channelHeight / 2,
        material
    ));
    group.add(boxMesh(
        channelWallThickness, sideDepth, d.channelHeight,
        d.externalWidth / 2 - channelWallThickness / 2,
        0,
        d.grooveBottom + d.channelHeight / 2,
        material
    ));

    // Upper retaining rails
    group.add(boxMesh(
        p.wall, sideDepth, d.topRailHeight,
        -d.externalWidth / 2 + p.wall / 2,
        0,
        d.grooveBottom + d.channelHeight + d.topRailHeight / 2,
        material
    ));
    group.add(boxMesh(
        p.wall, sideDepth, d.topRailHeight,
        d.externalWidth / 2 - p.wall / 2,
        0,
        d.grooveBottom + d.channelHeight + d.topRailHeight / 2,
        material
    ));

    return group;
}

function createLid(p, d, material) {
    const group = new THREE.Group();
    const shape = new THREE.Shape();

    const w = d.lidWidth;
    const dep = d.lidDepth;
    const tabW = d.lidTabWidth;
    const tabD = d.lidTabDepth;

    const left = -w / 2;
    const right = w / 2;
    const front = -dep / 2;
    const back = dep / 2;

    shape.moveTo(left, front);
    shape.lineTo(-tabW / 2, front);
    shape.lineTo(-tabW / 2, front - tabD);
    shape.lineTo(tabW / 2, front - tabD);
    shape.lineTo(tabW / 2, front);
    shape.lineTo(right, front);
    shape.lineTo(right, back);
    shape.lineTo(left, back);
    shape.lineTo(left, front);

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: p.lidThickness,
        bevelEnabled: false,
        curveSegments: 1,
        steps: 1
    });
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = d.grooveBottom + p.clearance;
    group.add(mesh);

    return group;
}

function boxMesh(width, depth, height, x, y, z, material) {
    const geometry = new THREE.BoxGeometry(width, depth, height);
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, material.clone());
    mesh.position.set(x, y, z);
    return mesh;
}

function updateResults(d) {
    if (e.externalWidth) e.externalWidth.textContent = `${formatNumber(d.externalWidth)} mm`;
    if (e.externalDepth) e.externalDepth.textContent = `${formatNumber(d.externalDepth)} mm`;
    if (e.totalHeight) e.totalHeight.textContent = `${formatNumber(d.totalHeight)} mm`;
    if (e.lidSize) {
        e.lidSize.textContent =
            `${formatNumber(d.lidWidth)} × ${formatNumber(d.lidDepth)} mm`;
    }
}

function removeModel() {
    if (!previewRoot) return;

    scene.remove(previewRoot);
    previewRoot.traverse(obj => {
        if (!obj.isMesh) return;
        obj.geometry?.dispose();
        obj.material?.dispose();
    });

    previewRoot = null;
    bodyGroup = null;
    lidGroup = null;
}

function fitCamera(d) {
    const lidOpenExtra = d.externalDepth * 0.32;
    const largest = Math.max(
        d.externalWidth,
        d.externalDepth + lidOpenExtra,
        d.totalHeight
    );
    const dist = Math.max(90, largest * 1.45);

    camera.position.set(dist, -dist, dist * 0.9);
    camera.near = Math.max(0.1, dist / 100);
    camera.far = Math.max(5000, dist * 20);
    camera.updateProjectionMatrix();

    controls.target.set(0, -lidOpenExtra * 0.12, d.totalHeight / 2);
    controls.update();
}

function downloadBox() {
    const p = readParameters();
    const d = calculate(p);
    const error = validate(p);

    if (error) {
        setMessage(error, 'error');
        setDownloads(false);
        return;
    }

    if (!bodyGroup) {
        setMessage(TEXT.generateFirstBox, 'error');
        return;
    }

    // bodyGroup itself is not moved for the preview.
    exportSTL(
        bodyGroup,
        `vekmaker-sliding-lid-box-${formatNumber(d.externalWidth)}x${formatNumber(d.externalDepth)}x${formatNumber(d.totalHeight)}mm.stl`,
        { rotateForPrint: false }
    );

    setMessage(TEXT.boxDownloaded, 'success');
}

function downloadLid() {
    const p = readParameters();
    const d = calculate(p);
    const error = validate(p);

    if (error) {
        setMessage(error, 'error');
        setDownloads(false);
        return;
    }

    if (!lidGroup) {
        setMessage(TEXT.generateFirstLid, 'error');
        return;
    }

    // The preview shifts lidGroup along Y. Clone it and cancel that preview-only offset.
    const exportLid = lidGroup.clone(true);
    exportLid.position.set(0, 0, 0);
    exportLid.updateMatrix();
    exportLid.updateMatrixWorld(true);

    exportSTL(
        exportLid,
        `vekmaker-sliding-lid-${formatNumber(d.lidWidth)}x${formatNumber(d.lidDepth)}x${formatNumber(p.lidThickness)}mm.stl`,
        { rotateForPrint: false }
    );

    setMessage(TEXT.lidDownloaded, 'success');
}

function setMessage(message, type = '') {
    if (!e.message) return;
    e.message.textContent = message;
    e.message.classList.remove('error', 'success', 'active');
    if (message) e.message.classList.add('active');
    if (type) e.message.classList.add(type);
}

function setDownloads(enabled) {
    if (e.downloadBox) e.downloadBox.disabled = !enabled;
    if (e.downloadLid) e.downloadLid.disabled = !enabled;
}

function between(value, min, max) {
    return Number.isFinite(value) && value >= min && value <= max;
}

function formatNumber(value) {
    return Number(value)
        .toFixed(2)
        .replace(/\.00$/, '')
        .replace(/(\.\d)0$/, '$1');
}

function aspect() {
    const width = Math.max(e.preview?.clientWidth || 1, 1);
    const height = Math.max(e.preview?.clientHeight || 420, 1);
    return width / height;
}

function resize() {
    if (!renderer || !camera || !e.preview) return;

    const width = Math.max(e.preview.clientWidth, 1);
    const height = Math.max(e.preview.clientHeight, 320);

    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
}

function animate() {
    requestAnimationFrame(animate);
    controls?.update();
    renderer?.render(scene, camera);
}
