import * as THREE from '../../libs/three/three.module.js';
import { OrbitControls } from '../../libs/three/OrbitControls.js';
import { STLExporter } from '../../libs/three/STLExporter.js';

let scene;
let camera;
let renderer;
let controls;
let exporter;
let tokenMesh = null;
let resizeObserver = null;

const TOKEN_COLOR = 0x3b82f6;

const elements = {};

document.addEventListener('DOMContentLoaded', () => {
    cacheElements();

    if (!elements.preview) {
        console.error('Token preview container was not found.');
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

    exporter = new STLExporter();

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
        return 'Enter a valid diameter.';
    }

    if (params.diameter < 5 || params.diameter > 300) {
        return 'Diameter must be between 5 mm and 300 mm.';
    }

    if (!Number.isFinite(params.thickness)) {
        return 'Enter a valid thickness.';
    }

    if (params.thickness < 0.5 || params.thickness > 100) {
        return 'Thickness must be between 0.5 mm and 100 mm.';
    }

    if (!Number.isInteger(params.segments)) {
        return 'Segments must be a whole number.';
    }

    if (params.segments < 12 || params.segments > 256) {
        return 'Segments must be between 12 and 256.';
    }

    if (params.hasCenterHole) {
        if (!Number.isFinite(params.holeDiameter)) {
            return 'Enter a valid hole diameter.';
        }

        if (params.holeDiameter < 1) {
            return 'Hole diameter must be at least 1 mm.';
        }

        if (params.holeDiameter >= params.diameter) {
            return 'Hole diameter must be smaller than the token diameter.';
        }

        const radialWall = (params.diameter - params.holeDiameter) / 2;

        if (radialWall < 0.5) {
            return 'At least 0.5 mm of material must remain around the hole.';
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
    setValidationMessage('Token generated successfully.', 'success');
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

    /*
     * The export geometry is rebuilt instead of exporting the preview mesh.
     * Its thickness already follows the STL Z axis, so it is flat and ready
     * for printing without changing the preview object.
     */
    const exportGeometry = createTokenGeometry(params);
    exportGeometry.translate(0, 0, params.thickness / 2);

    const exportMesh = new THREE.Mesh(
        exportGeometry,
        new THREE.MeshBasicMaterial()
    );

    exportMesh.updateMatrixWorld(true);

    const stlData = exporter.parse(exportMesh, {
        binary: false
    });

    const blob = new Blob([stlData], {
        type: 'model/stl'
    });

    downloadBlob(blob, buildTokenFilename(params));

    exportGeometry.dispose();
    exportMesh.material.dispose();

    setValidationMessage('STL downloaded successfully.', 'success');
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

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
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
