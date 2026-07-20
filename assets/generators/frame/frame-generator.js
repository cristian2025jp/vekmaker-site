import * as THREE from '../../libs/three/three.module.js';
import { OrbitControls } from '../../libs/three/OrbitControls.js';
import { exportSTL } from '../../js/core/stl-exporter.js';

const MODEL_COLOR = 0x3b82f6;

const elements = {};
let scene;
let camera;
let renderer;
let controls;
let frameGroup = null;
let backPanelMesh = null;
let resizeObserver = null;

document.addEventListener('DOMContentLoaded', () => {
    cacheElements();

    if (!elements.preview) {
        console.error('Frame preview container was not found.');
        return;
    }

    initPreview();
    bindEvents();
    generateFrame();
});

function cacheElements() {
    elements.preview = document.getElementById('frame-preview');
    elements.outerWidth = document.getElementById('frame-outer-width');
    elements.outerHeight = document.getElementById('frame-outer-height');
    elements.borderWidth = document.getElementById('frame-border-width');
    elements.thickness = document.getElementById('frame-thickness');
    elements.rebateDepth = document.getElementById('frame-rebate-depth');
    elements.rebateMargin = document.getElementById('frame-rebate-margin');
    elements.cornerRadius = document.getElementById('frame-corner-radius');
    elements.generateBackPanel = document.getElementById('frame-generate-back-panel');
    elements.backPanelThickness = document.getElementById('frame-back-panel-thickness');
    elements.backPanelClearance = document.getElementById('frame-back-panel-clearance');
    elements.frontOpening = document.getElementById('frame-front-opening');
    elements.rearOpening = document.getElementById('frame-rear-opening');
    elements.backPanelSize = document.getElementById('frame-back-panel-size');
    elements.validationMessage = document.getElementById(
        'frame-validation-message'
    );
    elements.generateButton = document.getElementById('generate-frame');
    elements.downloadButton = document.getElementById('download-frame');
    elements.downloadBackPanelButton = document.getElementById('download-back-panel');
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
        elements.outerWidth,
        elements.outerHeight,
        elements.borderWidth,
        elements.thickness,
        elements.rebateDepth,
        elements.rebateMargin,
        elements.cornerRadius,
        elements.generateBackPanel,
        elements.backPanelThickness,
        elements.backPanelClearance
    ].forEach((element) => {
        element?.addEventListener('input', generateFrame);
        element?.addEventListener('change', generateFrame);
    });

    elements.generateButton?.addEventListener('click', generateFrame);
    elements.downloadButton?.addEventListener('click', downloadFrameSTL);
    elements.downloadBackPanelButton?.addEventListener('click', downloadBackPanelSTL);
}

function readParameters() {
    return {
        outerWidth: Number(elements.outerWidth?.value),
        outerHeight: Number(elements.outerHeight?.value),
        borderWidth: Number(elements.borderWidth?.value),
        thickness: Number(elements.thickness?.value),
        rebateDepth: Number(elements.rebateDepth?.value),
        rebateMargin: Number(elements.rebateMargin?.value),
        cornerRadius: Number(elements.cornerRadius?.value),
        generateBackPanel: Boolean(elements.generateBackPanel?.checked),
        backPanelThickness: Number(elements.backPanelThickness?.value),
        backPanelClearance: Number(elements.backPanelClearance?.value)
    };
}

function calculateDimensions(params) {
    const frontOpeningWidth =
        params.outerWidth - params.borderWidth * 2;
    const frontOpeningHeight =
        params.outerHeight - params.borderWidth * 2;
    const rearOpeningWidth =
        frontOpeningWidth + params.rebateMargin * 2;
    const rearOpeningHeight =
        frontOpeningHeight + params.rebateMargin * 2;

    const backPanelWidth =
        rearOpeningWidth - params.backPanelClearance * 2;
    const backPanelHeight =
        rearOpeningHeight - params.backPanelClearance * 2;

    return {
        frontOpeningWidth,
        frontOpeningHeight,
        rearOpeningWidth,
        rearOpeningHeight,
        backPanelWidth,
        backPanelHeight,
        frontLayerDepth: params.thickness - params.rebateDepth
    };
}

function validateParameters(params, dimensions) {
    if (!isBetween(params.outerWidth, 30, 500)) {
        return 'Outer width must be between 30 mm and 500 mm.';
    }

    if (!isBetween(params.outerHeight, 30, 500)) {
        return 'Outer height must be between 30 mm and 500 mm.';
    }

    if (!isBetween(params.borderWidth, 3, 100)) {
        return 'Border width must be between 3 mm and 100 mm.';
    }

    if (
        dimensions.frontOpeningWidth < 5 ||
        dimensions.frontOpeningHeight < 5
    ) {
        return 'Border width is too large for the selected outer dimensions.';
    }

    if (!isBetween(params.thickness, 2, 50)) {
        return 'Total thickness must be between 2 mm and 50 mm.';
    }

    if (
        !Number.isFinite(params.rebateDepth) ||
        params.rebateDepth < 0 ||
        params.rebateDepth >= params.thickness
    ) {
        return 'Rear rebate depth must be zero or smaller than the total thickness.';
    }

    if (
        !Number.isFinite(params.rebateMargin) ||
        params.rebateMargin < 0 ||
        params.rebateMargin > 30
    ) {
        return 'Rear rebate margin must be between 0 mm and 30 mm.';
    }

    const minimumRearBorder =
        params.borderWidth - params.rebateMargin;

    if (minimumRearBorder < 1.5) {
        return 'At least 1.5 mm of border must remain behind the rebate.';
    }

    if (
        dimensions.rearOpeningWidth >= params.outerWidth ||
        dimensions.rearOpeningHeight >= params.outerHeight
    ) {
        return 'Rear opening must remain smaller than the outer frame dimensions.';
    }

    const maximumRadius =
        Math.min(params.outerWidth, params.outerHeight) / 2;

    if (
        !Number.isFinite(params.cornerRadius) ||
        params.cornerRadius < 0 ||
        params.cornerRadius > maximumRadius
    ) {
        return `Corner radius must be between 0 mm and ${formatNumber(maximumRadius)} mm.`;
    }

    if (params.generateBackPanel) {
        if (!isBetween(params.backPanelThickness, 0.8, 10)) {
            return 'Back panel thickness must be between 0.8 mm and 10 mm.';
        }

        if (
            !Number.isFinite(params.backPanelClearance) ||
            params.backPanelClearance < 0 ||
            params.backPanelClearance > 5
        ) {
            return 'Back panel clearance must be between 0 mm and 5 mm.';
        }

        if (
            dimensions.backPanelWidth < 5 ||
            dimensions.backPanelHeight < 5
        ) {
            return 'Back panel clearance is too large for the rear opening.';
        }
    }

    return '';
}

function generateFrame() {
    setBackPanelDownloadEnabled(false);

    const params = readParameters();
    const dimensions = calculateDimensions(params);
    updateCalculatedResults(dimensions);

    const error = validateParameters(params, dimensions);

    if (error) {
        setValidationMessage(error, 'error');
        setDownloadEnabled(false);
        return false;
    }

    removeCurrentFrame();

    const material = new THREE.MeshStandardMaterial({
        color: MODEL_COLOR,
        roughness: 0.58,
        metalness: 0.04,
        side: THREE.DoubleSide
    });

    frameGroup = new THREE.Group();

    const frontGeometry = createFrameRingGeometry({
        outerWidth: params.outerWidth,
        outerHeight: params.outerHeight,
        innerWidth: dimensions.frontOpeningWidth,
        innerHeight: dimensions.frontOpeningHeight,
        depth: dimensions.frontLayerDepth,
        cornerRadius: params.cornerRadius
    });

    const frontMesh = new THREE.Mesh(frontGeometry, material);
    frameGroup.add(frontMesh);

    if (params.rebateDepth > 0) {
        const rearGeometry = createFrameRingGeometry({
            outerWidth: params.outerWidth,
            outerHeight: params.outerHeight,
            innerWidth: dimensions.rearOpeningWidth,
            innerHeight: dimensions.rearOpeningHeight,
            depth: params.rebateDepth,
            cornerRadius: params.cornerRadius
        });

        rearGeometry.translate(0, 0, dimensions.frontLayerDepth);
        const rearMesh = new THREE.Mesh(rearGeometry, material);
        frameGroup.add(rearMesh);
    }

    scene.add(frameGroup);

    if (params.generateBackPanel) {
        const panelShape = createRoundedRectangleShape(
            dimensions.backPanelWidth,
            dimensions.backPanelHeight,
            0
        );

        const panelGeometry = new THREE.ExtrudeGeometry(panelShape, {
            depth: params.backPanelThickness,
            bevelEnabled: false,
            curveSegments: 24,
            steps: 1
        });

        panelGeometry.translate(
            -dimensions.backPanelWidth / 2,
            -dimensions.backPanelHeight / 2,
            0
        );
        panelGeometry.computeVertexNormals();

        backPanelMesh = new THREE.Mesh(panelGeometry, material.clone());
        backPanelMesh.position.x =
            params.outerWidth / 2 +
            dimensions.backPanelWidth / 2 +
            20;

        scene.add(backPanelMesh);
    }

    fitCamera(params, dimensions);
    setValidationMessage('Frame generated successfully.', 'success');
    setDownloadEnabled(true);
    setBackPanelDownloadEnabled(params.generateBackPanel);

    return true;
}

function createFrameRingGeometry({
    outerWidth,
    outerHeight,
    innerWidth,
    innerHeight,
    depth,
    cornerRadius
}) {
    const shape = createRoundedRectangleShape(
        outerWidth,
        outerHeight,
        cornerRadius
    );

    const innerX = (outerWidth - innerWidth) / 2;
    const innerY = (outerHeight - innerHeight) / 2;
    const innerRadius = Math.max(
        0,
        Math.min(
            cornerRadius - Math.min(innerX, innerY),
            innerWidth / 2,
            innerHeight / 2
        )
    );

    const hole = createRoundedRectangleHole(
        innerX,
        innerY,
        innerWidth,
        innerHeight,
        innerRadius
    );

    shape.holes.push(hole);

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth,
        bevelEnabled: false,
        curveSegments: 24,
        steps: 1
    });

    geometry.translate(-outerWidth / 2, -outerHeight / 2, 0);
    geometry.computeVertexNormals();

    return geometry;
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
    const frontText =
        `${formatNumber(dimensions.frontOpeningWidth)} × ` +
        `${formatNumber(dimensions.frontOpeningHeight)} mm`;

    const rearText =
        `${formatNumber(dimensions.rearOpeningWidth)} × ` +
        `${formatNumber(dimensions.rearOpeningHeight)} mm`;

    if (elements.frontOpening) {
        elements.frontOpening.textContent = frontText;
    }

    if (elements.rearOpening) {
        elements.rearOpening.textContent = rearText;
    }

    if (elements.backPanelSize) {
        elements.backPanelSize.textContent =
            `${formatNumber(dimensions.backPanelWidth)} × ` +
            `${formatNumber(dimensions.backPanelHeight)} mm`;
    }
}

function removeCurrentFrame() {
    if (!frameGroup) {
        return;
    }

    scene.remove(frameGroup);

    frameGroup.traverse((child) => {
        if (!child.isMesh) {
            return;
        }

        child.geometry?.dispose();
        child.material?.dispose();
    });

    frameGroup = null;

    if (backPanelMesh) {
        scene.remove(backPanelMesh);
        backPanelMesh.geometry?.dispose();
        backPanelMesh.material?.dispose();
        backPanelMesh = null;
    }
}

function fitCamera(params, dimensions) {
    const totalPreviewWidth = params.generateBackPanel
        ? params.outerWidth + dimensions.backPanelWidth + 20
        : params.outerWidth;

    const largestDimension = Math.max(
        totalPreviewWidth,
        params.outerHeight,
        params.thickness
    );

    const distance = Math.max(90, largestDimension * 1.05);

    camera.position.set(
        distance,
        -distance,
        distance * 0.85
    );
    camera.near = Math.max(0.1, distance / 100);
    camera.far = Math.max(5000, distance * 20);
    camera.updateProjectionMatrix();

    controls.target.set(0, 0, params.thickness / 2);
    controls.update();
}

function downloadFrameSTL() {
    const params = readParameters();
    const dimensions = calculateDimensions(params);
    const error = validateParameters(params, dimensions);

    if (error) {
        setValidationMessage(error, 'error');
        setDownloadEnabled(false);
        return;
    }

    if (!frameGroup) {
        setValidationMessage(
            'Generate the frame before downloading.',
            'error'
        );
        return;
    }

    exportSTL(
        frameGroup,
        buildFilename(params),
        {
            rotateForPrint: false
        }
    );

    setValidationMessage('STL downloaded successfully.', 'success');
}


function downloadBackPanelSTL() {
    const params = readParameters();
    const dimensions = calculateDimensions(params);
    const error = validateParameters(params, dimensions);

    if (error) {
        setValidationMessage(error, 'error');
        return;
    }

    if (!params.generateBackPanel || !backPanelMesh) {
        setValidationMessage(
            'Enable Generate Back Panel before downloading.',
            'error'
        );
        return;
    }

    exportSTL(
        backPanelMesh,
        buildBackPanelFilename(params, dimensions),
        {
            rotateForPrint: false
        }
    );

    setValidationMessage(
        'Back panel STL downloaded successfully.',
        'success'
    );
}

function buildBackPanelFilename(params, dimensions) {
    const width = formatNumber(dimensions.backPanelWidth);
    const height = formatNumber(dimensions.backPanelHeight);
    const thickness = formatNumber(params.backPanelThickness);

    return `vekmaker-frame-back-panel-${width}x${height}x${thickness}mm.stl`;
}

function buildFilename(params) {
    const width = formatNumber(params.outerWidth);
    const height = formatNumber(params.outerHeight);
    const thickness = formatNumber(params.thickness);

    return `vekmaker-frame-${width}x${height}x${thickness}mm.stl`;
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


function setBackPanelDownloadEnabled(enabled) {
    if (elements.downloadBackPanelButton) {
        elements.downloadBackPanelButton.disabled = !enabled;
    }

    const controlsEnabled = Boolean(elements.generateBackPanel?.checked);

    if (elements.backPanelThickness) {
        elements.backPanelThickness.disabled = !controlsEnabled;
    }

    if (elements.backPanelClearance) {
        elements.backPanelClearance.disabled = !controlsEnabled;
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
        .replace(/\.00$/, '')
        .replace(/(\.\d)0$/, '$1');
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
