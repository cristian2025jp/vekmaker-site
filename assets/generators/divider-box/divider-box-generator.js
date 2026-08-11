import * as THREE from '../../libs/three/three.module.js';
import { OrbitControls } from '../../libs/three/OrbitControls.js';
import { exportSTL } from '../../js/core/stl-exporter.js';

const MODEL_COLOR = 0x3b82f6;

const DIVIDER_BOX_I18N={
en:{
previewMissing:'Divider box preview container was not found.',
widthRange:'Internal width must be between 20 mm and 450 mm.',
depthRange:'Internal depth must be between 20 mm and 450 mm.',
heightRange:'Internal height must be between 5 mm and 200 mm.',
wallRange:'Wall thickness must be between 0.8 mm and 20 mm.',
bottomRange:'Bottom thickness must be between 0.8 mm and 20 mm.',
columnsRange:'Columns must be a whole number between 1 and 12.',
rowsRange:'Rows must be a whole number between 1 and 12.',
dividerThickness:'Divider thickness must be between 0.8 mm and 10 mm.',
dividerHeight:max=>`Divider height must be between 1 mm and ${max} mm.`,
compartmentSmall:'The selected divider layout leaves compartments smaller than 5 mm.',
cornerRadius:max=>`Outer corner radius must be between 0 mm and ${max} mm.`,
generated:'Divider box generated successfully.',
generateFirst:'Generate the divider box before downloading.',
downloaded:'STL downloaded successfully.'
},
pt:{
previewMissing:'A área de visualização da caixa com divisórias não foi encontrada.',
widthRange:'A largura interna deve estar entre 20 mm e 450 mm.',
depthRange:'A profundidade interna deve estar entre 20 mm e 450 mm.',
heightRange:'A altura interna deve estar entre 5 mm e 200 mm.',
wallRange:'A espessura da parede deve estar entre 0,8 mm e 20 mm.',
bottomRange:'A espessura do fundo deve estar entre 0,8 mm e 20 mm.',
columnsRange:'O número de colunas deve ser inteiro entre 1 e 12.',
rowsRange:'O número de linhas deve ser inteiro entre 1 e 12.',
dividerThickness:'A espessura da divisória deve estar entre 0,8 mm e 10 mm.',
dividerHeight:max=>`A altura da divisória deve estar entre 1 mm e ${max} mm.`,
compartmentSmall:'A configuração escolhida deixa compartimentos menores que 5 mm.',
cornerRadius:max=>`O raio externo dos cantos deve estar entre 0 mm e ${max} mm.`,
generated:'Caixa com divisórias gerada com sucesso.',
generateFirst:'Gere a caixa com divisórias antes de baixar.',
downloaded:'STL baixado com sucesso.'
},
ja:{
previewMissing:'仕切りボックスのプレビュー領域が見つかりません。',
widthRange:'内幅は20 mmから450 mmの範囲で指定してください。',
depthRange:'内奥行きは20 mmから450 mmの範囲で指定してください。',
heightRange:'内高さは5 mmから200 mmの範囲で指定してください。',
wallRange:'壁の厚さは0.8 mmから20 mmの範囲で指定してください。',
bottomRange:'底の厚さは0.8 mmから20 mmの範囲で指定してください。',
columnsRange:'列数は1から12の整数で指定してください。',
rowsRange:'行数は1から12の整数で指定してください。',
dividerThickness:'仕切りの厚さは0.8 mmから10 mmの範囲で指定してください。',
dividerHeight:max=>`仕切りの高さは1 mmから${max} mmの範囲で指定してください。`,
compartmentSmall:'選択した仕切り配置では区画サイズが5 mm未満になります。',
cornerRadius:max=>`外側の角半径は0 mmから${max} mmの範囲で指定してください。`,
generated:'仕切りボックスを生成しました。',
generateFirst:'ダウンロードする前に仕切りボックスを生成してください。',
downloaded:'STLをダウンロードしました。'
}
};
const DIVIDER_BOX_LANG=['en','pt','ja'].includes(document.documentElement.lang)?document.documentElement.lang:'en';
const DIVIDER_BOX_TEXT=DIVIDER_BOX_I18N[DIVIDER_BOX_LANG];

const elements = {};
let scene;
let camera;
let renderer;
let controls;
let modelGroup = null;
let resizeObserver = null;

document.addEventListener('DOMContentLoaded', () => {
    cacheElements();

    if (!elements.preview) {
        console.error(DIVIDER_BOX_TEXT.previewMissing);
        return;
    }

    initPreview();
    bindEvents();
    generateDividerBox();
});

function cacheElements() {
    elements.preview = document.getElementById('divider-box-preview');
    elements.internalWidth = document.getElementById(
        'divider-box-internal-width'
    );
    elements.internalDepth = document.getElementById(
        'divider-box-internal-depth'
    );
    elements.internalHeight = document.getElementById(
        'divider-box-internal-height'
    );
    elements.wallThickness = document.getElementById(
        'divider-box-wall-thickness'
    );
    elements.bottomThickness = document.getElementById(
        'divider-box-bottom-thickness'
    );
    elements.cornerRadius = document.getElementById(
        'divider-box-corner-radius'
    );
    elements.columns = document.getElementById('divider-box-columns');
    elements.rows = document.getElementById('divider-box-rows');
    elements.dividerThickness = document.getElementById(
        'divider-box-divider-thickness'
    );
    elements.dividerHeight = document.getElementById(
        'divider-box-divider-height'
    );
    elements.externalSize = document.getElementById(
        'divider-box-external-size'
    );
    elements.compartmentCount = document.getElementById(
        'divider-box-compartment-count'
    );
    elements.compartmentSize = document.getElementById(
        'divider-box-compartment-size'
    );
    elements.validationMessage = document.getElementById(
        'divider-box-validation-message'
    );
    elements.generateButton = document.getElementById(
        'generate-divider-box'
    );
    elements.downloadButton = document.getElementById(
        'download-divider-box'
    );
}

function initPreview() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);

    camera = new THREE.PerspectiveCamera(
        45,
        getPreviewAspect(),
        0.1,
        5000
    );

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    resizeRenderer();
    elements.preview.replaceChildren(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;

    scene.add(new THREE.AmbientLight(0xffffff, 1.55));

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.25);
    mainLight.position.set(120, 180, 140);
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.55);
    fillLight.position.set(-100, 70, -100);
    scene.add(fillLight);

    if ('ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(resizeRenderer);
        resizeObserver.observe(elements.preview);
    } else {
        window.addEventListener('resize', resizeRenderer);
    }

    animate();
}

function bindEvents() {
    [
        elements.internalWidth,
        elements.internalDepth,
        elements.internalHeight,
        elements.wallThickness,
        elements.bottomThickness,
        elements.cornerRadius,
        elements.columns,
        elements.rows,
        elements.dividerThickness,
        elements.dividerHeight
    ].forEach((element) => {
        element?.addEventListener('input', generateDividerBox);
        element?.addEventListener('change', generateDividerBox);
    });

    elements.generateButton?.addEventListener(
        'click',
        generateDividerBox
    );
    elements.downloadButton?.addEventListener(
        'click',
        downloadDividerBoxSTL
    );
}

function readParameters() {
    return {
        internalWidth: Number(elements.internalWidth?.value),
        internalDepth: Number(elements.internalDepth?.value),
        internalHeight: Number(elements.internalHeight?.value),
        wallThickness: Number(elements.wallThickness?.value),
        bottomThickness: Number(elements.bottomThickness?.value),
        cornerRadius: Number(elements.cornerRadius?.value),
        columns: Number.parseInt(elements.columns?.value, 10),
        rows: Number.parseInt(elements.rows?.value, 10),
        dividerThickness: Number(elements.dividerThickness?.value),
        dividerHeight: Number(elements.dividerHeight?.value)
    };
}

function calculateDimensions(params) {
    const externalWidth =
        params.internalWidth + params.wallThickness * 2;
    const externalDepth =
        params.internalDepth + params.wallThickness * 2;
    const totalHeight =
        params.internalHeight + params.bottomThickness;

    const usedWidth =
        Math.max(params.columns - 1, 0) * params.dividerThickness;
    const usedDepth =
        Math.max(params.rows - 1, 0) * params.dividerThickness;

    const compartmentWidth =
        (params.internalWidth - usedWidth) / params.columns;
    const compartmentDepth =
        (params.internalDepth - usedDepth) / params.rows;

    return {
        externalWidth,
        externalDepth,
        totalHeight,
        innerRadius: Math.max(
            0,
            params.cornerRadius - params.wallThickness
        ),
        compartmentWidth,
        compartmentDepth,
        compartmentCount: params.columns * params.rows
    };
}

function validateParameters(params, dimensions) {
    if (!isBetween(params.internalWidth, 20, 450)) {
        return DIVIDER_BOX_TEXT.widthRange;
    }

    if (!isBetween(params.internalDepth, 20, 450)) {
        return DIVIDER_BOX_TEXT.depthRange;
    }

    if (!isBetween(params.internalHeight, 5, 200)) {
        return DIVIDER_BOX_TEXT.heightRange;
    }

    if (!isBetween(params.wallThickness, 0.8, 20)) {
        return DIVIDER_BOX_TEXT.wallRange;
    }

    if (!isBetween(params.bottomThickness, 0.8, 20)) {
        return DIVIDER_BOX_TEXT.bottomRange;
    }

    if (!Number.isInteger(params.columns) || params.columns < 1 || params.columns > 12) {
        return DIVIDER_BOX_TEXT.columnsRange;
    }

    if (!Number.isInteger(params.rows) || params.rows < 1 || params.rows > 12) {
        return DIVIDER_BOX_TEXT.rowsRange;
    }

    if (!isBetween(params.dividerThickness, 0.8, 10)) {
        return DIVIDER_BOX_TEXT.dividerThickness;
    }

    if (!isBetween(params.dividerHeight, 1, params.internalHeight)) {
        return DIVIDER_BOX_TEXT.dividerHeight(formatNumber(params.internalHeight));
    }

    if (
        dimensions.compartmentWidth < 5 ||
        dimensions.compartmentDepth < 5
    ) {
        return DIVIDER_BOX_TEXT.compartmentSmall;
    }

    const maximumRadius =
        Math.min(dimensions.externalWidth, dimensions.externalDepth) / 2;

    if (
        !Number.isFinite(params.cornerRadius) ||
        params.cornerRadius < 0 ||
        params.cornerRadius > maximumRadius
    ) {
        return DIVIDER_BOX_TEXT.cornerRadius(formatNumber(maximumRadius));
    }

    return '';
}

function generateDividerBox() {
    const params = readParameters();
    const dimensions = calculateDimensions(params);
    updateCalculatedResults(dimensions);

    const error = validateParameters(params, dimensions);

    if (error) {
        setValidationMessage(error, 'error');
        setDownloadEnabled(false);
        return false;
    }

    removeCurrentModel();

    const material = new THREE.MeshStandardMaterial({
        color: MODEL_COLOR,
        roughness: 0.58,
        metalness: 0.04,
        side: THREE.DoubleSide
    });

    modelGroup = new THREE.Group();

    const bottomShape = createRoundedRectangleShape(
        dimensions.externalWidth,
        dimensions.externalDepth,
        params.cornerRadius
    );

    const bottomGeometry = new THREE.ExtrudeGeometry(bottomShape, {
        depth: params.bottomThickness,
        bevelEnabled: false,
        curveSegments: 24,
        steps: 1
    });

    bottomGeometry.translate(
        -dimensions.externalWidth / 2,
        -dimensions.externalDepth / 2,
        0
    );
    bottomGeometry.computeVertexNormals();

    modelGroup.add(new THREE.Mesh(bottomGeometry, material));

    const wallShape = createRoundedRectangleShape(
        dimensions.externalWidth,
        dimensions.externalDepth,
        params.cornerRadius
    );

    wallShape.holes.push(
        createRoundedRectangleHole(
            params.wallThickness,
            params.wallThickness,
            params.internalWidth,
            params.internalDepth,
            dimensions.innerRadius
        )
    );

    const wallGeometry = new THREE.ExtrudeGeometry(wallShape, {
        depth: params.internalHeight,
        bevelEnabled: false,
        curveSegments: 24,
        steps: 1
    });

    wallGeometry.translate(
        -dimensions.externalWidth / 2,
        -dimensions.externalDepth / 2,
        params.bottomThickness
    );
    wallGeometry.computeVertexNormals();

    modelGroup.add(new THREE.Mesh(wallGeometry, material.clone()));

    addWidthDividers(params, dimensions, material);
    addDepthDividers(params, dimensions, material);

    scene.add(modelGroup);
    fitCamera(dimensions);
    setValidationMessage(
        DIVIDER_BOX_TEXT.generated,
        'success'
    );
    setDownloadEnabled(true);

    return true;
}

function addWidthDividers(params, dimensions, material) {
    if (params.columns <= 1) {
        return;
    }

    const startX = -params.internalWidth / 2;
    const segment =
        dimensions.compartmentWidth + params.dividerThickness;

    for (let index = 1; index < params.columns; index += 1) {
        const x =
            startX +
            dimensions.compartmentWidth * index +
            params.dividerThickness * (index - 0.5);

        const geometry = new THREE.BoxGeometry(
            params.dividerThickness,
            params.internalDepth,
            params.dividerHeight
        );

        const mesh = new THREE.Mesh(geometry, material.clone());
        mesh.position.set(
            x,
            0,
            params.bottomThickness + params.dividerHeight / 2
        );
        modelGroup.add(mesh);
    }
}

function addDepthDividers(params, dimensions, material) {
    if (params.rows <= 1) {
        return;
    }

    const startY = -params.internalDepth / 2;

    for (let index = 1; index < params.rows; index += 1) {
        const y =
            startY +
            dimensions.compartmentDepth * index +
            params.dividerThickness * (index - 0.5);

        const geometry = new THREE.BoxGeometry(
            params.internalWidth,
            params.dividerThickness,
            params.dividerHeight
        );

        const mesh = new THREE.Mesh(geometry, material.clone());
        mesh.position.set(
            0,
            y,
            params.bottomThickness + params.dividerHeight / 2
        );
        modelGroup.add(mesh);
    }
}

function createRoundedRectangleShape(width, height, radius) {
    const shape = new THREE.Shape();
    const r = Math.min(radius, width / 2, height / 2);

    shape.moveTo(r, 0);
    shape.lineTo(width - r, 0);

    if (r > 0) {
        shape.quadraticCurveTo(width, 0, width, r);
    }

    shape.lineTo(width, height - r);

    if (r > 0) {
        shape.quadraticCurveTo(width, height, width - r, height);
    }

    shape.lineTo(r, height);

    if (r > 0) {
        shape.quadraticCurveTo(0, height, 0, height - r);
    }

    shape.lineTo(0, r);

    if (r > 0) {
        shape.quadraticCurveTo(0, 0, r, 0);
    }

    return shape;
}

function createRoundedRectangleHole(x, y, width, height, radius) {
    const hole = new THREE.Path();
    const r = Math.min(radius, width / 2, height / 2);

    hole.moveTo(x + r, y);

    if (r > 0) {
        hole.quadraticCurveTo(x, y, x, y + r);
    }

    hole.lineTo(x, y + height - r);

    if (r > 0) {
        hole.quadraticCurveTo(
            x,
            y + height,
            x + r,
            y + height
        );
    }

    hole.lineTo(x + width - r, y + height);

    if (r > 0) {
        hole.quadraticCurveTo(
            x + width,
            y + height,
            x + width,
            y + height - r
        );
    }

    hole.lineTo(x + width, y + r);

    if (r > 0) {
        hole.quadraticCurveTo(
            x + width,
            y,
            x + width - r,
            y
        );
    }

    hole.lineTo(x + r, y);

    return hole;
}

function updateCalculatedResults(dimensions) {
    if (elements.externalSize) {
        elements.externalSize.textContent =
            `${formatNumber(dimensions.externalWidth)} × ` +
            `${formatNumber(dimensions.externalDepth)} × ` +
            `${formatNumber(dimensions.totalHeight)} mm`;
    }

    if (elements.compartmentCount) {
        elements.compartmentCount.textContent =
            String(dimensions.compartmentCount);
    }

    if (elements.compartmentSize) {
        elements.compartmentSize.textContent =
            `${formatNumber(dimensions.compartmentWidth)} × ` +
            `${formatNumber(dimensions.compartmentDepth)} mm`;
    }
}

function removeCurrentModel() {
    if (!modelGroup) {
        return;
    }

    scene.remove(modelGroup);

    modelGroup.traverse((child) => {
        if (!child.isMesh) {
            return;
        }

        child.geometry?.dispose();
        child.material?.dispose();
    });

    modelGroup = null;
}

function fitCamera(dimensions) {
    const largestDimension = Math.max(
        dimensions.externalWidth,
        dimensions.externalDepth,
        dimensions.totalHeight
    );

    const distance = Math.max(90, largestDimension * 1.35);

    camera.position.set(
        distance,
        -distance,
        distance * 0.9
    );
    camera.near = Math.max(0.1, distance / 100);
    camera.far = Math.max(5000, distance * 20);
    camera.updateProjectionMatrix();

    controls.target.set(0, 0, dimensions.totalHeight / 2);
    controls.update();
}

function downloadDividerBoxSTL() {
    const params = readParameters();
    const dimensions = calculateDimensions(params);
    const error = validateParameters(params, dimensions);

    if (error) {
        setValidationMessage(error, 'error');
        setDownloadEnabled(false);
        return;
    }

    if (!modelGroup) {
        setValidationMessage(
            DIVIDER_BOX_TEXT.generateFirst,
            'error'
        );
        return;
    }

    exportSTL(
        modelGroup,
        buildFilename(params, dimensions),
        {
            rotateForPrint: false
        }
    );

    setValidationMessage(DIVIDER_BOX_TEXT.downloaded, 'success');
}

function buildFilename(params, dimensions) {
    const width = formatNumber(dimensions.externalWidth);
    const depth = formatNumber(dimensions.externalDepth);
    const height = formatNumber(dimensions.totalHeight);

    return (
        `vekmaker-divider-box-${params.columns}x${params.rows}-` +
        `${width}x${depth}x${height}mm.stl`
    );
}

function setValidationMessage(message, type = '') {
    if (!elements.validationMessage) {
        return;
    }

    elements.validationMessage.textContent = message;
    elements.validationMessage.classList.remove(
        'error',
        'success',
        'active'
    );

    if (message) {
        elements.validationMessage.classList.add('active');
    }

    if (type) {
        elements.validationMessage.classList.add(type);
    }
}

function setDownloadEnabled(enabled) {
    if (elements.downloadButton) {
        elements.downloadButton.disabled = !enabled;
    }
}

function isBetween(value, minimum, maximum) {
    return (
        Number.isFinite(value) &&
        value >= minimum &&
        value <= maximum
    );
}

function formatNumber(value) {
    return Number(value)
        .toFixed(2)
        .replace(/\\.00$/, '')
        .replace(/(\\.\\d)0$/, '$1');
}

function getPreviewAspect() {
    const width = Math.max(elements.preview?.clientWidth || 1, 1);
    const height = Math.max(elements.preview?.clientHeight || 420, 1);

    return width / height;
}

function resizeRenderer() {
    if (!renderer || !camera || !elements.preview) {
        return;
    }

    const width = Math.max(elements.preview.clientWidth, 1);
    const height = Math.max(elements.preview.clientHeight, 320);

    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
}

function animate() {
    requestAnimationFrame(animate);
    controls?.update();
    renderer?.render(scene, camera);
}
