import * as THREE from '../../libs/three/three.module.js';
import { OrbitControls } from '../../libs/three/OrbitControls.js';
import { exportSTL } from '../../js/core/stl-exporter.js';

let scene;
let camera;
let renderer;
let controls;
let tokenMesh = null;
let resizeObserver = null;

const TOKEN_COLOR = 0x3b82f6;

const TOKEN_I18N = {
    en: {
        previewMissing: 'Token preview container was not found.',
        validDiameter: 'Enter a valid diameter.',
        diameterRange: 'Diameter must be between 5 mm and 300 mm.',
        validThickness: 'Enter a valid thickness.',
        thicknessRange: 'Thickness must be between 0.5 mm and 100 mm.',
        wholeSegments: 'Segments must be a whole number.',
        segmentsRange: 'Segments must be between 12 and 256.',
        validHoleDiameter: 'Enter a valid hole diameter.',
        minimumHoleDiameter: 'Hole diameter must be at least 1 mm.',
        holeSmallerThanToken: 'Hole diameter must be smaller than the token diameter.',
        minimumRadialWall: 'At least 0.5 mm of material must remain around the hole.',
        generated: 'Token generated successfully.',
        generateBeforeDownload: 'Generate the token before downloading.',
        downloaded: 'STL downloaded successfully.'
    },
    pt: {
        previewMissing: 'O contêiner de visualização da ficha não foi encontrado.',
        validDiameter: 'Digite um diâmetro válido.',
        diameterRange: 'O diâmetro deve estar entre 5 mm e 300 mm.',
        validThickness: 'Digite uma espessura válida.',
        thicknessRange: 'A espessura deve estar entre 0,5 mm e 100 mm.',
        wholeSegments: 'O número de segmentos deve ser inteiro.',
        segmentsRange: 'O número de segmentos deve estar entre 12 e 256.',
        validHoleDiameter: 'Digite um diâmetro de furo válido.',
        minimumHoleDiameter: 'O diâmetro do furo deve ser de pelo menos 1 mm.',
        holeSmallerThanToken: 'O diâmetro do furo deve ser menor que o diâmetro da ficha.',
        minimumRadialWall: 'Deve permanecer pelo menos 0,5 mm de material ao redor do furo.',
        generated: 'Ficha gerada com sucesso.',
        generateBeforeDownload: 'Gere a ficha antes de fazer o download.',
        downloaded: 'STL baixado com sucesso.'
    },
    ja: {
        previewMissing: 'トークンのプレビュー領域が見つかりません。',
        validDiameter: '有効な直径を入力してください。',
        diameterRange: '直径は5 mmから300 mmの範囲で指定してください。',
        validThickness: '有効な厚さを入力してください。',
        thicknessRange: '厚さは0.5 mmから100 mmの範囲で指定してください。',
        wholeSegments: '分割数は整数で入力してください。',
        segmentsRange: '分割数は12から256の範囲で指定してください。',
        validHoleDiameter: '有効な穴の直径を入力してください。',
        minimumHoleDiameter: '穴の直径は1 mm以上にしてください。',
        holeSmallerThanToken: '穴の直径はトークンの直径より小さくしてください。',
        minimumRadialWall: '穴の周囲に0.5 mm以上の材料を残してください。',
        generated: 'トークンを生成しました。',
        generateBeforeDownload: 'ダウンロードする前にトークンを生成してください。',
        downloaded: 'STLをダウンロードしました。'
    }
};

const TOKEN_LANG = ['en', 'pt', 'ja'].includes(document.documentElement.lang)
    ? document.documentElement.lang
    : 'en';

const TOKEN_TEXT = TOKEN_I18N[TOKEN_LANG];

const elements = {};

document.addEventListener('DOMContentLoaded', () => {
    cacheElements();

    if (!elements.preview) {
        console.error(TOKEN_TEXT.previewMissing);
        return;
    }

    initTokenPreview();
    bindEvents();
    updateHoleInputState();
    generateToken();
});

function cacheElements() {
    elements.preview = document.getElementById('token-preview');
    elements.diameter = document.getElementById('token-diameter');
    elements.thickness = document.getElementById('token-thickness');
    elements.segments = document.getElementById('token-segments');
    elements.centerHole = document.getElementById('token-center-hole');
    elements.holeDiameter = document.getElementById('token-hole-diameter');
    elements.validationMessage = document.getElementById(
        'token-validation-message'
    );
    elements.generateButton = document.getElementById('generate-token');
    elements.downloadButton = document.getElementById('download-token');
}

function initTokenPreview() {
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

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
    fillLight.position.set(-100, 60, -80);
    scene.add(fillLight);

    if ('ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(resizeRenderer);
        resizeObserver.observe(elements.preview);
    } else {
        window.addEventListener('resize', resizeRenderer);
    }

    animateToken();
}

function bindEvents() {
    const liveInputs = [
        elements.diameter,
        elements.thickness,
        elements.segments,
        elements.holeDiameter
    ];

    liveInputs.forEach((input) => {
        input?.addEventListener('input', generateToken);
        input?.addEventListener('change', generateToken);
    });

    elements.centerHole?.addEventListener('change', () => {
        updateHoleInputState();
        generateToken();
    });

    elements.generateButton?.addEventListener('click', generateToken);
    elements.downloadButton?.addEventListener('click', downloadTokenSTL);
}

function updateHoleInputState() {
    if (!elements.centerHole || !elements.holeDiameter) {
        return;
    }

    elements.holeDiameter.disabled = !elements.centerHole.checked;
}

function readTokenParameters() {
    return {
        diameter: Number(elements.diameter?.value),
        thickness: Number(elements.thickness?.value),
        segments: Number.parseInt(elements.segments?.value, 10),
        hasCenterHole: Boolean(elements.centerHole?.checked),
        holeDiameter: Number(elements.holeDiameter?.value)
    };
}

function validateTokenParameters(params) {
    if (!Number.isFinite(params.diameter)) {
        return TOKEN_TEXT.validDiameter;
    }

    if (params.diameter < 5 || params.diameter > 300) {
        return TOKEN_TEXT.diameterRange;
    }

    if (!Number.isFinite(params.thickness)) {
        return TOKEN_TEXT.validThickness;
    }

    if (params.thickness < 0.5 || params.thickness > 100) {
        return TOKEN_TEXT.thicknessRange;
    }

    if (!Number.isInteger(params.segments)) {
        return TOKEN_TEXT.wholeSegments;
    }

    if (params.segments < 12 || params.segments > 256) {
        return TOKEN_TEXT.segmentsRange;
    }

    if (params.hasCenterHole) {
        if (!Number.isFinite(params.holeDiameter)) {
            return TOKEN_TEXT.validHoleDiameter;
        }

        if (params.holeDiameter < 1) {
            return TOKEN_TEXT.minimumHoleDiameter;
        }

        if (params.holeDiameter >= params.diameter) {
            return TOKEN_TEXT.holeSmallerThanToken;
        }

        const radialWall = (params.diameter - params.holeDiameter) / 2;

        if (radialWall < 0.5) {
            return TOKEN_TEXT.minimumRadialWall;
        }
    }

    return '';
}

function createTokenGeometry(params) {
    const outerRadius = params.diameter / 2;
    const shape = new THREE.Shape();

    shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);

    if (params.hasCenterHole) {
        const innerRadius = params.holeDiameter / 2;
        const holePath = new THREE.Path();

        holePath.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
        shape.holes.push(holePath);
    }

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: params.thickness,
        bevelEnabled: false,
        curveSegments: params.segments,
        steps: 1
    });

    // Centers the thickness around Z = 0 for a balanced preview.
    geometry.translate(0, 0, -params.thickness / 2);
    geometry.computeVertexNormals();

    return geometry;
}

function generateToken() {
    const params = readTokenParameters();
    const validationError = validateTokenParameters(params);

    if (validationError) {
        setValidationMessage(validationError, 'error');
        setDownloadEnabled(false);
        return false;
    }

    removeCurrentToken();

    const geometry = createTokenGeometry(params);
    const material = new THREE.MeshStandardMaterial({
        color: TOKEN_COLOR,
        roughness: 0.55,
        metalness: 0.05,
        side: THREE.DoubleSide
    });

    tokenMesh = new THREE.Mesh(geometry, material);
    scene.add(tokenMesh);

    fitCameraToToken(params);
    setValidationMessage(TOKEN_TEXT.generated, 'success');
    setDownloadEnabled(true);

    return true;
}

function removeCurrentToken() {
    if (!tokenMesh) {
        return;
    }

    scene.remove(tokenMesh);
    tokenMesh.geometry?.dispose();
    tokenMesh.material?.dispose();
    tokenMesh = null;
}

function fitCameraToToken(params) {
    const largestDimension = Math.max(params.diameter, params.thickness);
    const distance = Math.max(55, largestDimension * 1.8);

    camera.position.set(distance, distance, distance * 1.15);
    camera.near = Math.max(0.1, distance / 100);
    camera.far = Math.max(5000, distance * 20);
    camera.updateProjectionMatrix();

    controls.target.set(0, 0, 0);
    controls.update();
}

function downloadTokenSTL() {
    const params = readTokenParameters();
    const validationError = validateTokenParameters(params);

    if (validationError) {
        setValidationMessage(validationError, 'error');
        setDownloadEnabled(false);
        return;
    }

    if (!tokenMesh) {
        setValidationMessage(TOKEN_TEXT.generateBeforeDownload, 'error');
        setDownloadEnabled(false);
        return;
    }

    exportSTL(
        tokenMesh,
        buildTokenFilename(params),
        {
            rotateForPrint: false
        }
    );

    setValidationMessage(TOKEN_TEXT.downloaded, 'success');
}

function buildTokenFilename(params) {
    const diameter = formatFilenameNumber(params.diameter);
    const thickness = formatFilenameNumber(params.thickness);

    let filename = `coin-token-${diameter}x${thickness}mm`;

    if (params.hasCenterHole) {
        const holeDiameter = formatFilenameNumber(params.holeDiameter);
        filename += `-hole-${holeDiameter}mm`;
    }

    return `${filename}.stl`;
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
    elements.validationMessage.classList.remove('error', 'success');

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
    const height = Math.max(elements.preview.clientHeight, 420);

    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
}

function animateToken() {
    requestAnimationFrame(animateToken);

    controls?.update();
    renderer?.render(scene, camera);
}
