import * as THREE from '../../libs/three/three.module.js';
import { OrbitControls } from '../../libs/three/OrbitControls.js';
import { exportSTL } from '../../js/core/stl-exporter.js';

const MODEL_COLOR = 0x3b82f6;

const I18N = {
    en: {
        previewMissing: 'Box divider insert preview container was not found.',
        widthRange: 'Box internal width must be between 30 mm and 500 mm.',
        depthRange: 'Box internal depth must be between 30 mm and 500 mm.',
        heightRange: 'Box internal height must be between 10 mm and 250 mm.',
        clearanceRange: 'Fit clearance must be between 0 mm and 5 mm.',
        insertHeightRange: 'Divider height must be at least 5 mm and cannot exceed the box internal height.',
        frameRange: 'Perimeter thickness must be between 1.2 mm and 8 mm.',
        dividerRange: 'Divider thickness must be between 1 mm and 8 mm.',
        columnsRange: 'Columns must be between 1 and 10.',
        rowsRange: 'Rows must be between 1 and 10.',
        radiusRange: max => `Outer corner radius must be between 0 mm and ${max} mm.`,
        tooSmall: 'The selected rows, columns and wall thicknesses leave compartments that are too small. Reduce the number of compartments or wall thickness.',
        generated: 'Box divider insert generated successfully.',
        generateFirst: 'Generate the divider insert before downloading.',
        downloaded: 'STL downloaded successfully.'
    },
    pt: {
        previewMissing: 'A área de visualização da divisória removível para caixa não foi encontrada.',
        widthRange: 'A largura interna da caixa deve estar entre 30 mm e 500 mm.',
        depthRange: 'A profundidade interna da caixa deve estar entre 30 mm e 500 mm.',
        heightRange: 'A altura interna da caixa deve estar entre 10 mm e 250 mm.',
        clearanceRange: 'A folga de encaixe deve estar entre 0 mm e 5 mm.',
        insertHeightRange: 'A altura das divisórias deve ser de pelo menos 5 mm e não pode ultrapassar a altura interna da caixa.',
        frameRange: 'A espessura do contorno deve estar entre 1,2 mm e 8 mm.',
        dividerRange: 'A espessura das divisórias deve estar entre 1 mm e 8 mm.',
        columnsRange: 'O número de colunas deve estar entre 1 e 10.',
        rowsRange: 'O número de linhas deve estar entre 1 e 10.',
        radiusRange: max => `O raio externo dos cantos deve estar entre 0 mm e ${max} mm.`,
        tooSmall: 'As linhas, colunas e espessuras escolhidas deixaram os compartimentos muito pequenos. Reduza a quantidade de compartimentos ou a espessura das paredes.',
        generated: 'Divisória removível para caixa gerada com sucesso.',
        generateFirst: 'Gere a divisória antes de baixar.',
        downloaded: 'STL baixado com sucesso.'
    },
    ja: {
        previewMissing: 'ボックス用仕切りインサートのプレビュー領域が見つかりません。',
        widthRange: 'ボックス内幅は30 mmから500 mmの範囲で指定してください。',
        depthRange: 'ボックス内奥行きは30 mmから500 mmの範囲で指定してください。',
        heightRange: 'ボックス内高さは10 mmから250 mmの範囲で指定してください。',
        clearanceRange: 'フィット用クリアランスは0 mmから5 mmの範囲で指定してください。',
        insertHeightRange: '仕切り高さは5 mm以上で、ボックス内高さを超えないようにしてください。',
        frameRange: '外周の厚さは1.2 mmから8 mmの範囲で指定してください。',
        dividerRange: '仕切りの厚さは1 mmから8 mmの範囲で指定してください。',
        columnsRange: '列数は1から10の範囲で指定してください。',
        rowsRange: '行数は1から10の範囲で指定してください。',
        radiusRange: max => `外側コーナー半径は0 mmから${max} mmの範囲で指定してください。`,
        tooSmall: '行数・列数・壁厚の設定により区画が小さすぎます。区画数または壁厚を減らしてください。',
        generated: 'ボックス用仕切りインサートを生成しました。',
        generateFirst: 'ダウンロードする前に仕切りインサートを生成してください。',
        downloaded: 'STLをダウンロードしました。'
    }
};

const LANG = ['en', 'pt', 'ja'].includes(document.documentElement.lang)
    ? document.documentElement.lang
    : 'en';
const TEXT = I18N[LANG];

const e = {};
let scene, camera, renderer, controls, insertMesh = null, resizeObserver = null;

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
        preview: 'bdi-preview',
        boxWidth: 'bdi-box-width',
        boxDepth: 'bdi-box-depth',
        boxHeight: 'bdi-box-height',
        clearance: 'bdi-clearance',
        insertHeight: 'bdi-insert-height',
        columns: 'bdi-columns',
        rows: 'bdi-rows',
        frame: 'bdi-frame-thickness',
        divider: 'bdi-divider-thickness',
        radius: 'bdi-corner-radius',
        insertWidth: 'bdi-insert-width-result',
        insertDepth: 'bdi-insert-depth-result',
        cellWidth: 'bdi-cell-width-result',
        cellDepth: 'bdi-cell-depth-result',
        compartments: 'bdi-compartments-result',
        message: 'bdi-message',
        generate: 'bdi-generate',
        download: 'bdi-download'
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
        e.boxWidth, e.boxDepth, e.boxHeight, e.clearance,
        e.insertHeight, e.columns, e.rows, e.frame,
        e.divider, e.radius
    ].forEach(el => {
        el?.addEventListener('input', generate);
        el?.addEventListener('change', generate);
    });

    e.generate?.addEventListener('click', generate);
    e.download?.addEventListener('click', download);
}

function readParameters() {
    return {
        boxWidth: Number(e.boxWidth?.value),
        boxDepth: Number(e.boxDepth?.value),
        boxHeight: Number(e.boxHeight?.value),
        clearance: Number(e.clearance?.value),
        insertHeight: Number(e.insertHeight?.value),
        columns: Number(e.columns?.value),
        rows: Number(e.rows?.value),
        frame: Number(e.frame?.value),
        divider: Number(e.divider?.value),
        radius: Number(e.radius?.value)
    };
}

function calculate(p) {
    const insertWidth = p.boxWidth - 2 * p.clearance;
    const insertDepth = p.boxDepth - 2 * p.clearance;

    const freeWidth =
        insertWidth -
        2 * p.frame -
        (p.columns - 1) * p.divider;

    const freeDepth =
        insertDepth -
        2 * p.frame -
        (p.rows - 1) * p.divider;

    return {
        insertWidth,
        insertDepth,
        cellWidth: freeWidth / p.columns,
        cellDepth: freeDepth / p.rows,
        compartments: p.columns * p.rows
    };
}

function validate(p, d) {
    if (!between(p.boxWidth, 30, 500)) return TEXT.widthRange;
    if (!between(p.boxDepth, 30, 500)) return TEXT.depthRange;
    if (!between(p.boxHeight, 10, 250)) return TEXT.heightRange;
    if (!between(p.clearance, 0, 5)) return TEXT.clearanceRange;
    if (!between(p.insertHeight, 5, p.boxHeight)) return TEXT.insertHeightRange;
    if (!between(p.frame, 1.2, 8)) return TEXT.frameRange;
    if (!between(p.divider, 1, 8)) return TEXT.dividerRange;
    if (!Number.isInteger(p.columns) || !between(p.columns, 1, 10)) return TEXT.columnsRange;
    if (!Number.isInteger(p.rows) || !between(p.rows, 1, 10)) return TEXT.rowsRange;

    const maxRadius = Math.min(d.insertWidth, d.insertDepth) / 2;
    if (!Number.isFinite(p.radius) || p.radius < 0 || p.radius > maxRadius) {
        return TEXT.radiusRange(formatNumber(maxRadius));
    }

    if (d.cellWidth < 8 || d.cellDepth < 8) return TEXT.tooSmall;

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

    const shape = createRoundedRectangleShape(
        d.insertWidth,
        d.insertDepth,
        p.radius
    );

    // Every compartment is a hole. The material left between the holes
    // forms the perimeter and all internal dividers as one continuous mesh.
    for (let row = 0; row < p.rows; row++) {
        for (let col = 0; col < p.columns; col++) {
            const x =
                p.frame +
                col * (d.cellWidth + p.divider);

            const y =
                p.frame +
                row * (d.cellDepth + p.divider);

            shape.holes.push(
                createRectangleHole(
                    x,
                    y,
                    d.cellWidth,
                    d.cellDepth
                )
            );
        }
    }

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: p.insertHeight,
        bevelEnabled: false,
        curveSegments: 24,
        steps: 1
    });

    geometry.translate(
        -d.insertWidth / 2,
        -d.insertDepth / 2,
        0
    );
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
        color: MODEL_COLOR,
        roughness: 0.58,
        metalness: 0.04,
        side: THREE.DoubleSide
    });

    insertMesh = new THREE.Mesh(geometry, material);
    scene.add(insertMesh);

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

function createRectangleHole(x, y, width, height) {
    const path = new THREE.Path();

    // Counter-clockwise winding.
    path.moveTo(x, y);
    path.lineTo(x, y + height);
    path.lineTo(x + width, y + height);
    path.lineTo(x + width, y);
    path.lineTo(x, y);

    return path;
}

function updateResults(d) {
    if (e.insertWidth) {
        e.insertWidth.textContent = `${formatNumber(d.insertWidth)} mm`;
    }
    if (e.insertDepth) {
        e.insertDepth.textContent = `${formatNumber(d.insertDepth)} mm`;
    }
    if (e.cellWidth) {
        e.cellWidth.textContent = Number.isFinite(d.cellWidth)
            ? `${formatNumber(d.cellWidth)} mm`
            : '—';
    }
    if (e.cellDepth) {
        e.cellDepth.textContent = Number.isFinite(d.cellDepth)
            ? `${formatNumber(d.cellDepth)} mm`
            : '—';
    }
    if (e.compartments) {
        e.compartments.textContent = Number.isFinite(d.compartments)
            ? String(d.compartments)
            : '—';
    }
}

function removeModel() {
    if (!insertMesh) return;

    scene.remove(insertMesh);
    insertMesh.geometry?.dispose();
    insertMesh.material?.dispose();
    insertMesh = null;
}

function fitCamera(p, d) {
    const largest = Math.max(
        d.insertWidth,
        d.insertDepth,
        p.insertHeight
    );

    const dist = Math.max(80, largest * 1.35);

    camera.position.set(dist, -dist, dist * 0.85);
    camera.near = Math.max(0.1, dist / 100);
    camera.far = Math.max(5000, dist * 20);
    camera.updateProjectionMatrix();

    controls.target.set(0, 0, p.insertHeight / 2);
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

    if (!insertMesh) {
        setMessage(TEXT.generateFirst, 'error');
        return;
    }

    exportSTL(
        insertMesh,
        `vekmaker-box-divider-insert-${formatNumber(d.insertWidth)}x${formatNumber(d.insertDepth)}x${formatNumber(p.insertHeight)}mm-${p.columns}x${p.rows}.stl`,
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
