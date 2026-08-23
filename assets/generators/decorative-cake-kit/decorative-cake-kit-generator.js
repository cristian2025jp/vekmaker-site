import * as THREE from '../../libs/three/three.module.js';
import { OrbitControls } from '../../libs/three/OrbitControls.js';
import { exportSTL } from '../../js/core/stl-exporter.js';

const MODEL_COLOR = 0x3b82f6;
const SECONDARY_COLOR = 0x60a5fa;
const ACCENT_COLOR = 0x93c5fd;

const I18N = {
    en: {
        previewMissing: 'Decorative cake kit preview container was not found.',
        cakeDiameter: 'Cake base diameter must be between 50 mm and 300 mm.',
        cakeHeight: 'Cake base height must be between 15 mm and 150 mm.',
        wall: 'Cake base wall thickness must be between 1.2 mm and 8 mm.',
        top: 'Cake base top thickness must be between 1 mm and 8 mm.',
        plateDiameter: 'Stand plate diameter must be between 60 mm and 350 mm.',
        plateThickness: 'Stand plate thickness must be between 2 mm and 10 mm.',
        standHeight: 'Stand height must be between 15 mm and 120 mm.',
        stemDiameter: 'Stem diameter must be between 15 mm and 80 mm.',
        footDiameter: 'Stand foot diameter must be between 30 mm and 180 mm.',
        footThickness: 'Stand foot thickness must be between 2 mm and 12 mm.',
        ringDiameter: 'Decoration ring diameter must be between 40 mm and 320 mm.',
        ringWidth: 'Decoration ring width must be between 2 mm and 15 mm.',
        ringThickness: 'Decoration ring thickness must be between 1 mm and 8 mm.',
        scallops: 'Scallop count must be between 8 and 80.',
        ringGeometry: 'Decoration ring width is too large for the selected diameter.',
        generated: 'Decorative cake kit generated successfully.',
        baseFirst: 'Generate the kit before downloading the cake base.',
        standFirst: 'Generate the kit before downloading the stand.',
        ringFirst: 'Generate the kit before downloading the decoration ring.',
        baseDownloaded: 'Cake base STL downloaded successfully.',
        standDownloaded: 'Cake stand STL downloaded successfully.',
        ringDownloaded: 'Decoration ring STL downloaded successfully.'
    },
    pt: {
        previewMissing: 'A área de visualização do kit decorativo para bolo não foi encontrada.',
        cakeDiameter: 'O diâmetro da base do bolo deve estar entre 50 mm e 300 mm.',
        cakeHeight: 'A altura da base do bolo deve estar entre 15 mm e 150 mm.',
        wall: 'A espessura da parede da base do bolo deve estar entre 1,2 mm e 8 mm.',
        top: 'A espessura do topo da base do bolo deve estar entre 1 mm e 8 mm.',
        plateDiameter: 'O diâmetro do prato da boleira deve estar entre 60 mm e 350 mm.',
        plateThickness: 'A espessura do prato da boleira deve estar entre 2 mm e 10 mm.',
        standHeight: 'A altura da boleira deve estar entre 15 mm e 120 mm.',
        stemDiameter: 'O diâmetro da haste da boleira deve estar entre 15 mm e 80 mm.',
        footDiameter: 'O diâmetro da base da boleira deve estar entre 30 mm e 180 mm.',
        footThickness: 'A espessura da base da boleira deve estar entre 2 mm e 12 mm.',
        ringDiameter: 'O diâmetro do acabamento decorativo deve estar entre 40 mm e 320 mm.',
        ringWidth: 'A largura do acabamento decorativo deve estar entre 2 mm e 15 mm.',
        ringThickness: 'A espessura do acabamento decorativo deve estar entre 1 mm e 8 mm.',
        scallops: 'A quantidade de ondas deve estar entre 8 e 80.',
        ringGeometry: 'A largura do acabamento é muito grande para o diâmetro escolhido.',
        generated: 'Kit decorativo para bolo gerado com sucesso.',
        baseFirst: 'Gere o kit antes de baixar a base do bolo.',
        standFirst: 'Gere o kit antes de baixar a boleira.',
        ringFirst: 'Gere o kit antes de baixar o acabamento decorativo.',
        baseDownloaded: 'STL da base do bolo baixado com sucesso.',
        standDownloaded: 'STL da boleira baixado com sucesso.',
        ringDownloaded: 'STL do acabamento decorativo baixado com sucesso.'
    },
    ja: {
        previewMissing: 'デコレーションケーキキットのプレビュー領域が見つかりません。',
        cakeDiameter: 'ケーキベース直径は50 mmから300 mmの範囲で指定してください。',
        cakeHeight: 'ケーキベース高さは15 mmから150 mmの範囲で指定してください。',
        wall: 'ケーキベース壁厚は1.2 mmから8 mmの範囲で指定してください。',
        top: 'ケーキベース上面厚さは1 mmから8 mmの範囲で指定してください。',
        plateDiameter: 'ケーキスタンド皿の直径は60 mmから350 mmの範囲で指定してください。',
        plateThickness: 'ケーキスタンド皿の厚さは2 mmから10 mmの範囲で指定してください。',
        standHeight: 'ケーキスタンド高さは15 mmから120 mmの範囲で指定してください。',
        stemDiameter: '支柱直径は15 mmから80 mmの範囲で指定してください。',
        footDiameter: 'スタンド台座直径は30 mmから180 mmの範囲で指定してください。',
        footThickness: 'スタンド台座厚さは2 mmから12 mmの範囲で指定してください。',
        ringDiameter: '装飾リング直径は40 mmから320 mmの範囲で指定してください。',
        ringWidth: '装飾リング幅は2 mmから15 mmの範囲で指定してください。',
        ringThickness: '装飾リング厚さは1 mmから8 mmの範囲で指定してください。',
        scallops: '波形の数は8から80の範囲で指定してください。',
        ringGeometry: '選択した直径に対して装飾リング幅が大きすぎます。',
        generated: 'デコレーションケーキキットを生成しました。',
        baseFirst: 'ダウンロードする前にキットを生成してください。',
        standFirst: 'ダウンロードする前にキットを生成してください。',
        ringFirst: 'ダウンロードする前にキットを生成してください。',
        baseDownloaded: 'ケーキベースSTLをダウンロードしました。',
        standDownloaded: 'ケーキスタンドSTLをダウンロードしました。',
        ringDownloaded: '装飾リングSTLをダウンロードしました。'
    }
};

const LANG = ['en', 'pt', 'ja'].includes(document.documentElement.lang)
    ? document.documentElement.lang
    : 'en';
const TEXT = I18N[LANG];

const e = {};
let scene, camera, renderer, controls, previewRoot = null, resizeObserver = null;
let cakeBaseGroup = null, standPlateGroup = null, standBaseGroup = null, ringMesh = null;

document.addEventListener('DOMContentLoaded', () => {
    cache();
    if (!e.preview) {
        console.error(TEXT.previewMissing);
        return;
    }
    initPreview();
    bindEvents();
    updateVisibleFields();
    generate();
});

function cache() {
    const ids = {
        preview: 'dck-preview',
        cakeDiameter: 'dck-cake-diameter',
        cakeHeight: 'dck-cake-height',
        cakeWall: 'dck-cake-wall',
        cakeTop: 'dck-cake-top',

        plateDiameter: 'dck-plate-diameter',
        plateThickness: 'dck-plate-thickness',
        standHeight: 'dck-stand-height',
        stemDiameter: 'dck-stem-diameter',
        footDiameter: 'dck-foot-diameter',
        footThickness: 'dck-foot-thickness',

        ringType: 'dck-ring-type',
        ringDiameter: 'dck-ring-diameter',
        ringWidth: 'dck-ring-width',
        ringThickness: 'dck-ring-thickness',
        scallops: 'dck-scallops',
        scallopField: 'dck-scallop-field',

        baseSizeResult: 'dck-base-size-result',
        standSizeResult: 'dck-stand-size-result',
        ringSizeResult: 'dck-ring-size-result',

        message: 'dck-message',
        generate: 'dck-generate',
        downloadBase: 'dck-download-base',
        downloadStandPlate: 'dck-download-stand-plate',
        downloadStandBase: 'dck-download-stand-base',
        downloadRing: 'dck-download-ring'
    };

    for (const [key, id] of Object.entries(ids)) {
        e[key] = document.getElementById(id);
    }
}

function initPreview() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);

    camera = new THREE.PerspectiveCamera(45, aspect(), 0.1, 6000);
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
    main.position.set(160, 220, 180);
    scene.add(main);

    const fill = new THREE.DirectionalLight(0xffffff, 0.55);
    fill.position.set(-130, 90, -120);
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
        e.cakeDiameter, e.cakeHeight, e.cakeWall, e.cakeTop,
        e.plateDiameter, e.plateThickness, e.standHeight,
        e.stemDiameter, e.footDiameter, e.footThickness,
        e.ringType, e.ringDiameter, e.ringWidth,
        e.ringThickness, e.scallops
    ].forEach(el => {
        el?.addEventListener('input', change);
        el?.addEventListener('change', change);
    });

    e.generate?.addEventListener('click', generate);
    e.downloadBase?.addEventListener('click', downloadCakeBase);
    e.downloadStandPlate?.addEventListener('click', downloadStandPlate);
    e.downloadStandBase?.addEventListener('click', downloadStandBase);
    e.downloadRing?.addEventListener('click', downloadRing);
}

function change() {
    updateVisibleFields();
    generate();
}

function updateVisibleFields() {
    const scalloped = (e.ringType?.value || 'scalloped') === 'scalloped';
    e.scallopField?.classList.toggle('hidden-field', !scalloped);
}

function readParameters() {
    return {
        cakeDiameter: Number(e.cakeDiameter?.value),
        cakeHeight: Number(e.cakeHeight?.value),
        cakeWall: Number(e.cakeWall?.value),
        cakeTop: Number(e.cakeTop?.value),

        plateDiameter: Number(e.plateDiameter?.value),
        plateThickness: Number(e.plateThickness?.value),
        standHeight: Number(e.standHeight?.value),
        stemDiameter: Number(e.stemDiameter?.value),
        footDiameter: Number(e.footDiameter?.value),
        footThickness: Number(e.footThickness?.value),

        ringType: e.ringType?.value || 'scalloped',
        ringDiameter: Number(e.ringDiameter?.value),
        ringWidth: Number(e.ringWidth?.value),
        ringThickness: Number(e.ringThickness?.value),
        scallops: Number(e.scallops?.value)
    };
}

function calculate(p) {
    return {
        cakeInnerDiameter: p.cakeDiameter - 2 * p.cakeWall,
        standTotalHeight: p.footThickness + p.standHeight + p.plateThickness,
        ringInnerDiameter: p.ringDiameter - 2 * p.ringWidth
    };
}

function validate(p, d) {
    if (!between(p.cakeDiameter, 50, 300)) return TEXT.cakeDiameter;
    if (!between(p.cakeHeight, 15, 150)) return TEXT.cakeHeight;
    if (!between(p.cakeWall, 1.2, 8) || d.cakeInnerDiameter <= 10) return TEXT.wall;
    if (!between(p.cakeTop, 1, 8) || p.cakeTop >= p.cakeHeight) return TEXT.top;

    if (!between(p.plateDiameter, 60, 350)) return TEXT.plateDiameter;
    if (!between(p.plateThickness, 2, 10)) return TEXT.plateThickness;
    if (!between(p.standHeight, 15, 120)) return TEXT.standHeight;
    if (!between(p.stemDiameter, 15, 80)) return TEXT.stemDiameter;
    if (!between(p.footDiameter, 30, 180)) return TEXT.footDiameter;
    if (!between(p.footThickness, 2, 12)) return TEXT.footThickness;

    if (!between(p.ringDiameter, 40, 320)) return TEXT.ringDiameter;
    if (!between(p.ringWidth, 2, 15)) return TEXT.ringWidth;
    if (!between(p.ringThickness, 1, 8)) return TEXT.ringThickness;
    if (d.ringInnerDiameter <= 8) return TEXT.ringGeometry;

    if (p.ringType === 'scalloped' &&
        (!Number.isInteger(p.scallops) || !between(p.scallops, 8, 80))) {
        return TEXT.scallops;
    }

    return '';
}

function generate() {
    const p = readParameters();
    const d = calculate(p);
    updateResults(p, d);

    const error = validate(p, d);
    if (error) {
        setMessage(error, 'error');
        setDownloads(false);
        return false;
    }

    removeModel();

    const baseMaterial = new THREE.MeshStandardMaterial({
        color: MODEL_COLOR,
        roughness: 0.58,
        metalness: 0.04,
        side: THREE.DoubleSide
    });

    const standMaterial = new THREE.MeshStandardMaterial({
        color: SECONDARY_COLOR,
        roughness: 0.55,
        metalness: 0.04,
        side: THREE.DoubleSide
    });

    const ringMaterial = new THREE.MeshStandardMaterial({
        color: ACCENT_COLOR,
        roughness: 0.58,
        metalness: 0.03,
        side: THREE.DoubleSide
    });

    cakeBaseGroup = createCakeBase(p, d, baseMaterial);
    const standParts = createStandParts(p, d, standMaterial);
    standPlateGroup = standParts.plate;
    standBaseGroup = standParts.base;
    ringMesh = createDecorationRing(p, d, ringMaterial);

    previewRoot = new THREE.Group();

    // Preview arrangement: cake base centered above the stand;
    // decoration ring placed beside the stand so all generated pieces are visible.
    standBaseGroup.position.set(0, 0, 0);
    standPlateGroup.position.set(0, 0, p.footThickness + p.standHeight);
    cakeBaseGroup.position.set(
        0,
        0,
        d.standTotalHeight + 5
    );

    const sideOffset = Math.max(p.plateDiameter, p.cakeDiameter) * 0.72;
    ringMesh.position.set(
        sideOffset,
        0,
        p.ringThickness / 2
    );

    previewRoot.add(standBaseGroup, standPlateGroup, cakeBaseGroup, ringMesh);
    scene.add(previewRoot);

    fitCamera(p, d, sideOffset);
    setMessage(TEXT.generated, 'success');
    setDownloads(true);
    return true;
}

function createCakeBase(p, d, material) {
    const group = new THREE.Group();

    /*
     * Build a true closed manifold shell manually.
     *
     * Surfaces:
     * 1. outer cylindrical wall
     * 2. external top disk
     * 3. inner cavity wall
     * 4. inner cavity ceiling
     * 5. bottom annular rim around the open cavity
     *
     * The cavity itself remains open only on the underside.
     * This avoids LatheGeometry axis/seam degeneracies that some slicers
     * can report as "open edges".
     */
    const geometry = createHollowCakeBaseGeometry(
        p.cakeDiameter / 2,
        d.cakeInnerDiameter / 2,
        p.cakeHeight,
        p.cakeHeight - p.cakeTop,
        128
    );

    const mesh = new THREE.Mesh(geometry, material.clone());
    group.add(mesh);

    return group;
}

function createHollowCakeBaseGeometry(outerRadius, innerRadius, totalHeight, innerCeiling, segments) {
    const positions = [];
    const indices = [];

    const outerBottom = [];
    const outerTop = [];
    const innerBottom = [];
    const innerTop = [];

    function addVertex(x, y, z) {
        positions.push(x, y, z);
        return positions.length / 3 - 1;
    }

    for (let i = 0; i < segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        const c = Math.cos(a);
        const s = Math.sin(a);

        outerBottom.push(addVertex(c * outerRadius, s * outerRadius, 0));
        outerTop.push(addVertex(c * outerRadius, s * outerRadius, totalHeight));
        innerBottom.push(addVertex(c * innerRadius, s * innerRadius, 0));
        innerTop.push(addVertex(c * innerRadius, s * innerRadius, innerCeiling));
    }

    const topCenter = addVertex(0, 0, totalHeight);
    const ceilingCenter = addVertex(0, 0, innerCeiling);

    for (let i = 0; i < segments; i++) {
        const n = (i + 1) % segments;

        // Outer wall — outward normal.
        indices.push(
            outerBottom[i], outerBottom[n], outerTop[n],
            outerBottom[i], outerTop[n], outerTop[i]
        );

        // External top disk — +Z.
        indices.push(
            topCenter, outerTop[i], outerTop[n]
        );

        // Inner cavity wall — normal points toward cavity.
        indices.push(
            innerBottom[i], innerTop[n], innerBottom[n],
            innerBottom[i], innerTop[i], innerTop[n]
        );

        // Inner cavity ceiling — -Z (toward the cavity).
        indices.push(
            ceilingCenter, innerTop[n], innerTop[i]
        );

        // Bottom annular rim — -Z.
        indices.push(
            outerBottom[i], innerBottom[n], outerBottom[n],
            outerBottom[i], innerBottom[i], innerBottom[n]
        );
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(positions, 3)
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    return geometry;
}

function createStandParts(p, d, material) {
    const plateGroup = new THREE.Group();
    const baseGroup = new THREE.Group();
    const segments = 96;

    const recessDepth = Math.min(2, Math.max(1.2, p.plateThickness * 0.55));
    const recessClearance = 0.30;
    const pinClearance = 0.25;

    const stemTopDiameter = p.stemDiameter * 0.84;
    const bossDiameter = Math.max(10, stemTopDiameter - recessClearance * 2);
    const recessDiameter = bossDiameter + recessClearance * 2;

    const pinDiameter = Math.min(12, Math.max(8, bossDiameter * 0.42));
    const pinLength = Math.min(6, Math.max(4, p.plateThickness + 1.5));
    const pinHoleDiameter = pinDiameter + pinClearance * 2;

    /*
     * TOP PLATE
     * One lathed solid with:
     * - flat decorative top;
     * - circular locating recess underneath;
     * - central locating hole.
     */
    const plateOuterRadius = p.plateDiameter / 2;
    const recessRadius = recessDiameter / 2;
    const holeRadius = pinHoleDiameter / 2;

    const plateProfile = [
        new THREE.Vector2(0, p.plateThickness),
        new THREE.Vector2(plateOuterRadius, p.plateThickness),
        new THREE.Vector2(plateOuterRadius, 0),
        new THREE.Vector2(recessRadius, 0),
        new THREE.Vector2(recessRadius, recessDepth),
        new THREE.Vector2(holeRadius, recessDepth),
        new THREE.Vector2(holeRadius, p.plateThickness),
        new THREE.Vector2(0, p.plateThickness)
    ];

    const plateGeometry = new THREE.LatheGeometry(
        plateProfile,
        128,
        0,
        Math.PI * 2
    );
    plateGeometry.rotateX(Math.PI / 2);
    plateGeometry.computeVertexNormals();

    plateGroup.add(new THREE.Mesh(plateGeometry, material.clone()));

    /*
     * PEDESTAL BASE
     * Foot + tapered stem + circular locating boss + central pin.
     */
    const footGeometry = new THREE.CylinderGeometry(
        p.footDiameter / 2,
        p.footDiameter / 2,
        p.footThickness,
        segments
    );
    footGeometry.rotateX(Math.PI / 2);
    const foot = new THREE.Mesh(footGeometry, material.clone());
    foot.position.z = p.footThickness / 2;
    baseGroup.add(foot);

    const stemTopRadius = p.stemDiameter * 0.42;
    const stemBottomRadius = p.stemDiameter / 2;

    const stemGeometry = new THREE.CylinderGeometry(
        stemTopRadius,
        stemBottomRadius,
        p.standHeight,
        segments
    );
    stemGeometry.rotateX(Math.PI / 2);
    const stem = new THREE.Mesh(stemGeometry, material.clone());
    stem.position.z = p.footThickness + p.standHeight / 2;
    baseGroup.add(stem);

    const bossGeometry = new THREE.CylinderGeometry(
        bossDiameter / 2,
        bossDiameter / 2,
        recessDepth,
        segments
    );
    bossGeometry.rotateX(Math.PI / 2);
    const boss = new THREE.Mesh(bossGeometry, material.clone());
    boss.position.z = p.footThickness + p.standHeight + recessDepth / 2;
    baseGroup.add(boss);

    const pinGeometry = new THREE.CylinderGeometry(
        pinDiameter / 2,
        pinDiameter / 2,
        pinLength,
        segments
    );
    pinGeometry.rotateX(Math.PI / 2);
    const pin = new THREE.Mesh(pinGeometry, material.clone());
    pin.position.z =
        p.footThickness +
        p.standHeight +
        recessDepth +
        pinLength / 2;
    baseGroup.add(pin);

    return {
        plate: plateGroup,
        base: baseGroup
    };
}

function createDecorationRing(p, d, material) {
    const outerRadius = p.ringDiameter / 2;
    const innerRadius = d.ringInnerDiameter / 2;

    const shape = new THREE.Shape();

    if (p.ringType === 'scalloped') {
        const pointCount = Math.max(160, p.scallops * 8);
        const amplitude = Math.min(p.ringWidth * 0.28, 2.2);
        const baseOuter = outerRadius - amplitude / 2;

        for (let i = 0; i <= pointCount; i++) {
            const a = (i / pointCount) * Math.PI * 2;
            const wave = (1 + Math.cos(a * p.scallops)) / 2;
            const r = baseOuter + amplitude * wave;
            const x = Math.cos(a) * r;
            const y = Math.sin(a) * r;

            if (i === 0) shape.moveTo(x, y);
            else shape.lineTo(x, y);
        }
    } else {
        shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);
    }

    const hole = new THREE.Path();
    hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
    shape.holes.push(hole);

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: p.ringThickness,
        bevelEnabled: false,
        curveSegments: 32,
        steps: 1
    });
    geometry.computeVertexNormals();

    return new THREE.Mesh(geometry, material);
}

function updateResults(p, d) {
    if (e.baseSizeResult) {
        e.baseSizeResult.textContent =
            `Ø${formatNumber(p.cakeDiameter)} × ${formatNumber(p.cakeHeight)} mm`;
    }

    if (e.standSizeResult) {
        e.standSizeResult.textContent =
            `Ø${formatNumber(p.plateDiameter)} × ${formatNumber(d.standTotalHeight)} mm`;
    }

    if (e.ringSizeResult) {
        e.ringSizeResult.textContent =
            `Ø${formatNumber(p.ringDiameter)} × ${formatNumber(p.ringThickness)} mm`;
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
    cakeBaseGroup = null;
    standPlateGroup = null;
    standBaseGroup = null;
    ringMesh = null;
}

function fitCamera(p, d, sideOffset) {
    const vertical =
        d.standTotalHeight +
        5 +
        p.cakeHeight;

    const horizontal =
        Math.max(p.plateDiameter, p.cakeDiameter) +
        sideOffset +
        p.ringDiameter / 2;

    const largest = Math.max(vertical, horizontal);
    const dist = Math.max(120, largest * 1.25);

    camera.position.set(dist, -dist, dist * 0.82);
    camera.near = Math.max(0.1, dist / 100);
    camera.far = Math.max(6000, dist * 20);
    camera.updateProjectionMatrix();

    controls.target.set(
        sideOffset * 0.18,
        0,
        vertical * 0.42
    );
    controls.update();
}

function downloadCakeBase() {
    const p = readParameters();
    const d = calculate(p);
    const error = validate(p, d);

    if (error) {
        setMessage(error, 'error');
        setDownloads(false);
        return;
    }

    if (!cakeBaseGroup) {
        setMessage(TEXT.baseFirst, 'error');
        return;
    }

    // The cake shell is closed at the top and open underneath.
    // Flip a clone for printing so the closed top lies on the build plate.
    const exportObject = cakeBaseGroup.clone(true);
    exportObject.position.set(0, 0, p.cakeHeight);
    exportObject.rotation.x = Math.PI;
    exportObject.updateMatrix();
    exportObject.updateMatrixWorld(true);

    exportSTL(
        exportObject,
        `vekmaker-decorative-cake-base-${formatNumber(p.cakeDiameter)}x${formatNumber(p.cakeHeight)}mm.stl`,
        { rotateForPrint: false }
    );

    setMessage(TEXT.baseDownloaded, 'success');
}

function downloadStandPlate() {
    const p = readParameters();
    const d = calculate(p);
    const error = validate(p, d);

    if (error) {
        setMessage(error, 'error');
        setDownloads(false);
        return;
    }

    if (!standPlateGroup) {
        setMessage(TEXT.standFirst, 'error');
        return;
    }

    const exportObject = standPlateGroup.clone(true);

    // Flip the plate so the smooth top face rests on the build plate.
    // The locating recess and center hole face upward.
    exportObject.position.set(0, 0, p.plateThickness);
    exportObject.rotation.x = Math.PI;
    exportObject.updateMatrix();
    exportObject.updateMatrixWorld(true);

    exportSTL(
        exportObject,
        `vekmaker-cake-stand-top-plate-${formatNumber(p.plateDiameter)}mm.stl`,
        { rotateForPrint: false }
    );

    setMessage(TEXT.standDownloaded, 'success');
}

function downloadStandBase() {
    const p = readParameters();
    const d = calculate(p);
    const error = validate(p, d);

    if (error) {
        setMessage(error, 'error');
        setDownloads(false);
        return;
    }

    if (!standBaseGroup) {
        setMessage(TEXT.standFirst, 'error');
        return;
    }

    const exportObject = standBaseGroup.clone(true);
    exportObject.position.set(0, 0, 0);
    exportObject.updateMatrix();
    exportObject.updateMatrixWorld(true);

    exportSTL(
        exportObject,
        `vekmaker-cake-stand-pedestal-base-${formatNumber(p.footDiameter)}mm.stl`,
        { rotateForPrint: false }
    );

    setMessage(TEXT.standDownloaded, 'success');
}

function downloadRing() {
    const p = readParameters();
    const d = calculate(p);
    const error = validate(p, d);

    if (error) {
        setMessage(error, 'error');
        setDownloads(false);
        return;
    }

    if (!ringMesh) {
        setMessage(TEXT.ringFirst, 'error');
        return;
    }

    const exportObject = ringMesh.clone(true);
    exportObject.position.set(0, 0, 0);
    exportObject.updateMatrix();
    exportObject.updateMatrixWorld(true);

    exportSTL(
        exportObject,
        `vekmaker-cake-decoration-${p.ringType}-${formatNumber(p.ringDiameter)}mm.stl`,
        { rotateForPrint: false }
    );

    setMessage(TEXT.ringDownloaded, 'success');
}

function setMessage(message, type = '') {
    if (!e.message) return;

    e.message.textContent = message;
    e.message.classList.remove('error', 'success', 'active');

    if (message) e.message.classList.add('active');
    if (type) e.message.classList.add(type);
}

function setDownloads(enabled) {
    if (e.downloadBase) e.downloadBase.disabled = !enabled;
    if (e.downloadStandPlate) e.downloadStandPlate.disabled = !enabled;
    if (e.downloadStandBase) e.downloadStandBase.disabled = !enabled;
    if (e.downloadRing) e.downloadRing.disabled = !enabled;
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
