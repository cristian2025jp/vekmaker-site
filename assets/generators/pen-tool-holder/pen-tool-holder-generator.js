import * as THREE from '../../libs/three/three.module.js';
import { OrbitControls } from '../../libs/three/OrbitControls.js';
import { exportSTL } from '../../js/core/stl-exporter.js';

const MODEL_COLOR = 0x3b82f6;

const I18N = {
    en: {
        previewMissing: 'Pen / tool holder preview container was not found.',
        toolDiameter: 'Tool / pen diameter must be between 2 mm and 60 mm.',
        clearance: 'Hole clearance must be between 0 mm and 5 mm.',
        columns: 'Columns must be between 1 and 10.',
        rows: 'Rows must be between 1 and 10.',
        gap: 'Material between holes must be between 1.2 mm and 15 mm.',
        margin: 'Outer margin must be between 1.5 mm and 20 mm.',
        height: 'Holder height must be between 10 mm and 150 mm.',
        bottom: 'Bottom thickness must be between 1 mm and 10 mm.',
        radius: max => `Outer corner radius must be between 0 mm and ${max} mm.`,
        radiusMargin: 'The selected corner radius reaches the holes. Reduce the corner radius or increase the outer margin.',
        generated: 'Pen / tool holder generated successfully.',
        generateFirst: 'Generate the holder before downloading.',
        downloaded: 'STL downloaded successfully.'
    },
    pt: {
        previewMissing: 'A área de visualização do porta-canetas / ferramentas não foi encontrada.',
        toolDiameter: 'O diâmetro da caneta / ferramenta deve estar entre 2 mm e 60 mm.',
        clearance: 'A folga do furo deve estar entre 0 mm e 5 mm.',
        columns: 'O número de colunas deve estar entre 1 e 10.',
        rows: 'O número de linhas deve estar entre 1 e 10.',
        gap: 'O material entre os furos deve estar entre 1,2 mm e 15 mm.',
        margin: 'A margem externa deve estar entre 1,5 mm e 20 mm.',
        height: 'A altura do suporte deve estar entre 10 mm e 150 mm.',
        bottom: 'A espessura do fundo deve estar entre 1 mm e 10 mm.',
        radius: max => `O raio externo dos cantos deve estar entre 0 mm e ${max} mm.`,
        radiusMargin: 'O raio escolhido alcança os furos. Reduza o raio dos cantos ou aumente a margem externa.',
        generated: 'Porta-canetas / ferramentas gerado com sucesso.',
        generateFirst: 'Gere o suporte antes de baixar.',
        downloaded: 'STL baixado com sucesso.'
    },
    ja: {
        previewMissing: 'ペン／ツールホルダーのプレビュー領域が見つかりません。',
        toolDiameter: 'ペン／工具の直径は2 mmから60 mmの範囲で指定してください。',
        clearance: '穴のクリアランスは0 mmから5 mmの範囲で指定してください。',
        columns: '列数は1から10の範囲で指定してください。',
        rows: '行数は1から10の範囲で指定してください。',
        gap: '穴の間の肉厚は1.2 mmから15 mmの範囲で指定してください。',
        margin: '外周マージンは1.5 mmから20 mmの範囲で指定してください。',
        height: 'ホルダー高さは10 mmから150 mmの範囲で指定してください。',
        bottom: '底の厚さは1 mmから10 mmの範囲で指定してください。',
        radius: max => `外側コーナー半径は0 mmから${max} mmの範囲で指定してください。`,
        radiusMargin: '選択したコーナー半径が穴に近すぎます。半径を小さくするか外周マージンを増やしてください。',
        generated: 'ペン／ツールホルダーを生成しました。',
        generateFirst: 'ダウンロードする前にホルダーを生成してください。',
        downloaded: 'STLをダウンロードしました。'
    }
};

const LANG = ['en', 'pt', 'ja'].includes(document.documentElement.lang)
    ? document.documentElement.lang
    : 'en';
const TEXT = I18N[LANG];

const e = {};
let scene, camera, renderer, controls, holderGroup = null, resizeObserver = null;

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
        preview: 'pth-preview',
        toolDiameter: 'pth-tool-diameter',
        clearance: 'pth-clearance',
        columns: 'pth-columns',
        rows: 'pth-rows',
        gap: 'pth-gap',
        margin: 'pth-margin',
        height: 'pth-height',
        bottom: 'pth-bottom',
        radius: 'pth-radius',
        holeResult: 'pth-hole-result',
        widthResult: 'pth-width-result',
        depthResult: 'pth-depth-result',
        countResult: 'pth-count-result',
        message: 'pth-message',
        generate: 'pth-generate',
        download: 'pth-download'
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
    fill.position.set(-100, 70,-100);
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
        e.toolDiameter, e.clearance, e.columns, e.rows,
        e.gap, e.margin, e.height, e.bottom, e.radius
    ].forEach(el => {
        el?.addEventListener('input', generate);
        el?.addEventListener('change', generate);
    });

    e.generate?.addEventListener('click', generate);
    e.download?.addEventListener('click', download);
}

function readParameters() {
    return {
        toolDiameter: Number(e.toolDiameter?.value),
        clearance: Number(e.clearance?.value),
        columns: Number(e.columns?.value),
        rows: Number(e.rows?.value),
        gap: Number(e.gap?.value),
        margin: Number(e.margin?.value),
        height: Number(e.height?.value),
        bottom: Number(e.bottom?.value),
        radius: Number(e.radius?.value)
    };
}

function calculate(p) {
    const holeDiameter = p.toolDiameter + p.clearance;
    const holderWidth =
        p.columns * holeDiameter +
        (p.columns - 1) * p.gap +
        2 * p.margin;

    const holderDepth =
        p.rows * holeDiameter +
        (p.rows - 1) * p.gap +
        2 * p.margin;

    return {
        holeDiameter,
        holeRadius: holeDiameter / 2,
        holderWidth,
        holderDepth,
        slots: p.columns * p.rows,
        upperHeight: p.height - p.bottom
    };
}

function validate(p, d) {
    if (!between(p.toolDiameter, 2, 60)) return TEXT.toolDiameter;
    if (!between(p.clearance, 0, 5)) return TEXT.clearance;
    if (!Number.isInteger(p.columns) || !between(p.columns, 1, 10)) return TEXT.columns;
    if (!Number.isInteger(p.rows) || !between(p.rows, 1, 10)) return TEXT.rows;
    if (!between(p.gap, 1.2, 15)) return TEXT.gap;
    if (!between(p.margin, 1.5, 20)) return TEXT.margin;
    if (!between(p.height, 10, 150)) return TEXT.height;
    if (!between(p.bottom, 1, 10) || p.bottom >= p.height) return TEXT.bottom;

    const maxRadius = Math.min(d.holderWidth, d.holderDepth) / 2;
    if (!Number.isFinite(p.radius) || p.radius < 0 || p.radius > maxRadius) {
        return TEXT.radius(formatNumber(maxRadius));
    }

    // Rounded corners must not intrude into the nearest circular slot.
    if (p.radius > p.margin + d.holeRadius * 0.42) {
        return TEXT.radiusMargin;
    }

    return '';
}

function generate() {
    const p = readParameters();
    const d = calculate(p);

    updateResults(d);

    const error = validate(p, d);
    if (error) {
        setMessage(error, 'error');
        setDownloadEnabled(false);
        return false;
    }

    removeModel();

    const material = new THREE.MeshStandardMaterial({
        color: MODEL_COLOR,
        roughness: 0.58,
        metalness: 0.04,
        side: THREE.DoubleSide
    });

    holderGroup = new THREE.Group();

    // Closed rounded bottom plate.
    const bottomShape = createRoundedRectangleShape(
        d.holderWidth,
        d.holderDepth,
        p.radius
    );

    const bottomGeometry = new THREE.ExtrudeGeometry(bottomShape, {
        depth: p.bottom,
        bevelEnabled: false,
        curveSegments: 24,
        steps: 1
    });
    bottomGeometry.translate(-d.holderWidth / 2, -d.holderDepth / 2, 0);
    bottomGeometry.computeVertexNormals();
    holderGroup.add(new THREE.Mesh(bottomGeometry, material));

    // Upper body: one continuous shape with circular holes.
    const bodyShape = createRoundedRectangleShape(
        d.holderWidth,
        d.holderDepth,
        p.radius
    );

    const firstX = p.margin + d.holeRadius;
    const firstY = p.margin + d.holeRadius;
    const pitch = d.holeDiameter + p.gap;

    for (let row = 0; row < p.rows; row++) {
        for (let col = 0; col < p.columns; col++) {
            const cx = firstX + col * pitch;
            const cy = firstY + row * pitch;

            const hole = new THREE.Path();
            // Clockwise circle creates a hole in ShapeGeometry/ExtrudeGeometry.
            hole.absarc(cx, cy, d.holeRadius, 0, Math.PI * 2, true);
            bodyShape.holes.push(hole);
        }
    }

    const bodyGeometry = new THREE.ExtrudeGeometry(bodyShape, {
        depth: d.upperHeight,
        bevelEnabled: false,
        curveSegments: 32,
        steps: 1
    });
    bodyGeometry.translate(
        -d.holderWidth / 2,
        -d.holderDepth / 2,
        p.bottom
    );
    bodyGeometry.computeVertexNormals();

    holderGroup.add(new THREE.Mesh(bodyGeometry, material.clone()));
    scene.add(holderGroup);

    fitCamera(p, d);
    setMessage(TEXT.generated, 'success');
    setDownloadEnabled(true);
    return true;
}

function createRoundedRectangleShape(width, height, radius) {
    const shape = new THREE.Shape();
    const r = Math.min(radius, width / 2, height / 2);

    shape.moveTo(r, 0);
    shape.lineTo(width - r, 0);
    if (r > 0) shape.quadraticCurveTo(width, 0, width, r);

    shape.lineTo(width, height - r);
    if (r > 0) shape.quadraticCurveTo(width, height, width - r, height);

    shape.lineTo(r, height);
    if (r > 0) shape.quadraticCurveTo(0, height, 0, height - r);

    shape.lineTo(0, r);
    if (r > 0) shape.quadraticCurveTo(0, 0, r, 0);

    return shape;
}

function updateResults(d) {
    if (e.holeResult) {
        e.holeResult.textContent = `${formatNumber(d.holeDiameter)} mm`;
    }
    if (e.widthResult) {
        e.widthResult.textContent = `${formatNumber(d.holderWidth)} mm`;
    }
    if (e.depthResult) {
        e.depthResult.textContent = `${formatNumber(d.holderDepth)} mm`;
    }
    if (e.countResult) {
        e.countResult.textContent = String(d.slots);
    }
}

function removeModel() {
    if (!holderGroup) return;

    scene.remove(holderGroup);
    holderGroup.traverse(obj => {
        if (!obj.isMesh) return;
        obj.geometry?.dispose();
        obj.material?.dispose();
    });
    holderGroup = null;
}

function fitCamera(p, d) {
    const largest = Math.max(d.holderWidth, d.holderDepth, p.height);
    const dist = Math.max(75, largest * 1.45);

    camera.position.set(dist, -dist, dist * 0.95);
    camera.near = Math.max(0.1, dist / 100);
    camera.far = Math.max(5000, dist * 20);
    camera.updateProjectionMatrix();

    controls.target.set(0, 0, p.height / 2);
    controls.update();
}

function download() {
    const p = readParameters();
    const d = calculate(p);
    const error = validate(p, d);

    if (error) {
        setMessage(error, 'error');
        setDownloadEnabled(false);
        return;
    }

    if (!holderGroup) {
        setMessage(TEXT.generateFirst, 'error');
        return;
    }

    exportSTL(
        holderGroup,
        `vekmaker-pen-tool-holder-${p.columns}x${p.rows}-${formatNumber(d.holeDiameter)}mm-holes.stl`,
        { rotateForPrint: false }
    );

    setMessage(TEXT.downloaded, 'success');
}

function setMessage(message, type = '') {
    if (!e.message) return;

    e.message.textContent = message;
    e.message.classList.remove('error', 'success', 'active');

    if (message) e.message.classList.add('active');
    if (type) e.message.classList.add(type);
}

function setDownloadEnabled(enabled) {
    if (e.download) e.download.disabled = !enabled;
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
