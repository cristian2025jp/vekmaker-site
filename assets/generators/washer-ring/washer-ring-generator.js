import * as THREE from '../../libs/three/three.module.js';
import { OrbitControls } from '../../libs/three/OrbitControls.js';
import { exportSTL } from '../../js/core/stl-exporter.js';

const WASHER_COLOR = 0x3b82f6;

const WASHER_I18N={
en:{previewMissing:'Washer preview container was not found.',validOuter:'Enter a valid outer diameter.',outerRange:'Outer diameter must be between 3 mm and 500 mm.',validInner:'Enter a valid inner diameter.',innerMin:'Inner diameter must be at least 0.5 mm.',innerSmaller:'Inner diameter must be smaller than outer diameter.',materialMin:'At least 0.5 mm of material must remain around the hole.',validThickness:'Enter a valid thickness.',thicknessRange:'Thickness must be between 0.5 mm and 100 mm.',wholeSegments:'Segments must be a whole number.',segmentsRange:'Segments must be between 12 and 256.',generated:'Washer generated successfully.',generateFirst:'Generate the washer before downloading.',downloaded:'STL downloaded successfully.'},
pt:{previewMissing:'A área de visualização da arruela não foi encontrada.',validOuter:'Digite um diâmetro externo válido.',outerRange:'O diâmetro externo deve estar entre 3 mm e 500 mm.',validInner:'Digite um diâmetro interno válido.',innerMin:'O diâmetro interno deve ser de pelo menos 0,5 mm.',innerSmaller:'O diâmetro interno deve ser menor que o diâmetro externo.',materialMin:'Deve permanecer pelo menos 0,5 mm de material ao redor do furo.',validThickness:'Digite uma espessura válida.',thicknessRange:'A espessura deve estar entre 0,5 mm e 100 mm.',wholeSegments:'O número de segmentos deve ser inteiro.',segmentsRange:'O número de segmentos deve estar entre 12 e 256.',generated:'Arruela gerada com sucesso.',generateFirst:'Gere a arruela antes de baixar.',downloaded:'STL baixado com sucesso.'},
ja:{previewMissing:'ワッシャーのプレビュー領域が見つかりません。',validOuter:'有効な外径を入力してください。',outerRange:'外径は3 mmから500 mmの範囲で指定してください。',validInner:'有効な内径を入力してください。',innerMin:'内径は0.5 mm以上にしてください。',innerSmaller:'内径は外径より小さくしてください。',materialMin:'穴の周囲に0.5 mm以上の材料を残してください。',validThickness:'有効な厚さを入力してください。',thicknessRange:'厚さは0.5 mmから100 mmの範囲で指定してください。',wholeSegments:'分割数は整数で入力してください。',segmentsRange:'分割数は12から256の範囲で指定してください。',generated:'ワッシャーを生成しました。',generateFirst:'ダウンロードする前にワッシャーを生成してください。',downloaded:'STLをダウンロードしました。'}
};
const WASHER_LANG=['en','pt','ja'].includes(document.documentElement.lang)?document.documentElement.lang:'en';
const WASHER_TEXT=WASHER_I18N[WASHER_LANG];

let scene;
let camera;
let renderer;
let controls;
let washerMesh = null;
let resizeObserver = null;

const elements = {};

document.addEventListener('DOMContentLoaded', () => {
    cacheElements();

    if (!elements.preview) {
        console.error(WASHER_TEXT.previewMissing);
        return;
    }

    initPreview();
    bindEvents();
    generateWasher();
});

function cacheElements() {
    elements.preview = document.getElementById('washer-preview');
    elements.outerDiameter = document.getElementById('washer-outer-diameter');
    elements.innerDiameter = document.getElementById('washer-inner-diameter');
    elements.thickness = document.getElementById('washer-thickness');
    elements.segments = document.getElementById('washer-segments');
    elements.validationMessage = document.getElementById(
        'washer-validation-message'
    );
    elements.generateButton = document.getElementById('generate-washer');
    elements.downloadButton = document.getElementById('download-washer');
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

    camera.position.set(70, 70, 85);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    resizeRenderer();
    elements.preview.replaceChildren(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;

    scene.add(new THREE.AmbientLight(0xffffff, 1.6));

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(100, 160, 120);
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.55);
    fillLight.position.set(-100, 60, -80);
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
        elements.outerDiameter,
        elements.innerDiameter,
        elements.thickness,
        elements.segments
    ].forEach((input) => {
        input?.addEventListener('input', generateWasher);
        input?.addEventListener('change', generateWasher);
    });

    elements.generateButton?.addEventListener('click', generateWasher);
    elements.downloadButton?.addEventListener('click', downloadWasherSTL);
}

function readParameters() {
    return {
        outerDiameter: Number(elements.outerDiameter?.value),
        innerDiameter: Number(elements.innerDiameter?.value),
        thickness: Number(elements.thickness?.value),
        segments: Number.parseInt(elements.segments?.value, 10)
    };
}

function validateParameters(params) {
    if (!Number.isFinite(params.outerDiameter)) {
        return WASHER_TEXT.validOuter;
    }

    if (params.outerDiameter < 3 || params.outerDiameter > 500) {
        return WASHER_TEXT.outerRange;
    }

    if (!Number.isFinite(params.innerDiameter)) {
        return WASHER_TEXT.validInner;
    }

    if (params.innerDiameter < 0.5) {
        return WASHER_TEXT.innerMin;
    }

    if (params.innerDiameter >= params.outerDiameter) {
        return WASHER_TEXT.innerSmaller;
    }

    const radialWidth =
        (params.outerDiameter - params.innerDiameter) / 2;

    if (radialWidth < 0.5) {
        return WASHER_TEXT.materialMin;
    }

    if (!Number.isFinite(params.thickness)) {
        return WASHER_TEXT.validThickness;
    }

    if (params.thickness < 0.5 || params.thickness > 100) {
        return WASHER_TEXT.thicknessRange;
    }

    if (!Number.isInteger(params.segments)) {
        return WASHER_TEXT.wholeSegments;
    }

    if (params.segments < 12 || params.segments > 256) {
        return WASHER_TEXT.segmentsRange;
    }

    return '';
}

function createWasherGeometry(params) {
    const outerRadius = params.outerDiameter / 2;
    const innerRadius = params.innerDiameter / 2;

    const shape = new THREE.Shape();
    shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);

    const hole = new THREE.Path();
    hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
    shape.holes.push(hole);

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: params.thickness,
        bevelEnabled: false,
        curveSegments: params.segments,
        steps: 1
    });

    geometry.translate(0, 0, -params.thickness / 2);
    geometry.computeVertexNormals();

    return geometry;
}

function generateWasher() {
    const params = readParameters();
    const error = validateParameters(params);

    if (error) {
        setValidationMessage(error, 'error');
        setDownloadEnabled(false);
        return false;
    }

    removeCurrentWasher();

    const geometry = createWasherGeometry(params);
    const material = new THREE.MeshStandardMaterial({
        color: WASHER_COLOR,
        roughness: 0.55,
        metalness: 0.05,
        side: THREE.DoubleSide
    });

    washerMesh = new THREE.Mesh(geometry, material);
    scene.add(washerMesh);

    fitCamera(params);
    setValidationMessage(WASHER_TEXT.generated, 'success');
    setDownloadEnabled(true);

    return true;
}

function removeCurrentWasher() {
    if (!washerMesh) {
        return;
    }

    scene.remove(washerMesh);
    washerMesh.geometry?.dispose();
    washerMesh.material?.dispose();
    washerMesh = null;
}

function fitCamera(params) {
    const largestDimension = Math.max(
        params.outerDiameter,
        params.thickness
    );

    const distance = Math.max(55, largestDimension * 1.8);

    camera.position.set(distance, distance, distance * 1.15);
    camera.near = Math.max(0.1, distance / 100);
    camera.far = Math.max(5000, distance * 20);
    camera.updateProjectionMatrix();

    controls.target.set(0, 0, 0);
    controls.update();
}

function downloadWasherSTL() {
    const params = readParameters();
    const error = validateParameters(params);

    if (error) {
        setValidationMessage(error, 'error');
        setDownloadEnabled(false);
        return;
    }

    if (!washerMesh) {
        setValidationMessage(
            WASHER_TEXT.generateFirst,
            'error'
        );
        return;
    }

    exportSTL(
        washerMesh,
        buildFilename(params),
        {
            rotateForPrint: false
        }
    );

    setValidationMessage(WASHER_TEXT.downloaded, 'success');
}

function buildFilename(params) {
    const outer = formatFilenameNumber(params.outerDiameter);
    const inner = formatFilenameNumber(params.innerDiameter);
    const thickness = formatFilenameNumber(params.thickness);

    return `vekmaker-washer-${outer}x${inner}x${thickness}mm.stl`;
}

function formatFilenameNumber(value) {
    return Number(value)
        .toFixed(2)
        .replace(/\.00$/, '')
        .replace(/(\.\d)0$/, '$1');
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
