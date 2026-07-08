import * as THREE from '../../libs/three/three.module.js';
import { OrbitControls } from '../../libs/three/OrbitControls.js';
import { STLExporter } from '../../libs/three/STLExporter.js';

let scene;
let camera;
let renderer;
let controls;
let cylinderMesh;
let exporter;

function initCylinderPreview() {
    const preview = document.getElementById('cylinder-preview');

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);

    exporter = new STLExporter();

    camera = new THREE.PerspectiveCamera(
        45,
        preview.clientWidth / preview.clientHeight,
        0.1,
        5000
    );

    camera.position.set(100, 100, 100);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({
        antialias: true
    });

    renderer.setSize(
        preview.clientWidth,
        preview.clientHeight
    );

    preview.appendChild(renderer.domElement);

    controls = new OrbitControls(
        camera,
        renderer.domElement
    );

    controls.enableDamping = true;

    const ambient = new THREE.AmbientLight(
        0xffffff,
        1.5
    );

    scene.add(ambient);

    const directional = new THREE.DirectionalLight(
        0xffffff,
        1
    );

    directional.position.set(100, 200, 100);
    scene.add(directional);

    generateCylinder();
    animateCylinder();
}

function createHollowCylinderGeometry(
    outerRadius,
    height,
    wallThickness,
    bottomThickness,
    segments
) {
    const innerRadius = outerRadius - wallThickness;

    if (innerRadius <= 0) {
        alert('Wall thickness is too large for this diameter.');
        return null;
    }

    if (bottomThickness >= height) {
        alert('Bottom thickness must be smaller than height.');
        return null;
    }

    const shape = new THREE.Shape();

    shape.absarc(
        0,
        0,
        outerRadius,
        0,
        Math.PI * 2,
        false
    );

    const hole = new THREE.Path();

    hole.absarc(
        0,
        0,
        innerRadius,
        0,
        Math.PI * 2,
        true
    );

    shape.holes.push(hole);

    const wallGeometry = new THREE.ExtrudeGeometry(
        shape,
        {
            depth: height,
            bevelEnabled: false,
            curveSegments: segments
        }
    );

    wallGeometry.rotateX(Math.PI / 2);
    wallGeometry.translate(0, -height / 2, 0);

    const bottomGeometry = new THREE.CylinderGeometry(
        outerRadius,
        outerRadius,
        bottomThickness,
        segments
    );

    bottomGeometry.translate(
        0,
        -height / 2 + bottomThickness / 2,
        0
    );

    const mergedGeometry = THREE.BufferGeometryUtils
        ? null
        : null;

    const group = new THREE.Group();

    return {
        wallGeometry,
        bottomGeometry
    };
}

function updateCylinderResults(
    radius,
    height,
    isHollow,
    wallThickness,
    bottomThickness
) {
    const plaDensity = 1.24;

    let materialVolumeMm3;

    if (isHollow) {
        const innerRadius = radius - wallThickness;

        const outerVolume =
            Math.PI *
            radius *
            radius *
            height;

        const innerVolume =
            Math.PI *
            innerRadius *
            innerRadius *
            (height - bottomThickness);

        materialVolumeMm3 = outerVolume - innerVolume;
    } else {
        materialVolumeMm3 =
            Math.PI *
            radius *
            radius *
            height;
    }

    const volumeCm3 = materialVolumeMm3 / 1000;
    const weightG = volumeCm3 * plaDensity;

    document.getElementById('cylinder-volume').textContent =
        volumeCm3.toFixed(1);

    document.getElementById('cylinder-weight').textContent =
        weightG.toFixed(1);
}

function generateCylinder() {
    const diameter =
        parseFloat(document.getElementById('cylinder-diameter').value) || 40;

    const height =
        parseFloat(document.getElementById('cylinder-height').value) || 40;

    const segments =
        parseInt(document.getElementById('cylinder-segments').value) || 64;

    if (cylinderMesh) {
        scene.remove(cylinderMesh);
    }

    const oldGrid = scene.getObjectByName('cylinderGrid');

    if (oldGrid) {
        scene.remove(oldGrid);
    }

    const radius = diameter / 2;

    const isHollow =
    document.getElementById('cylinder-hollow').checked;

const wallThickness =
    parseFloat(document.getElementById('cylinder-wall-thickness').value) || 2;

const bottomThickness =
    parseFloat(document.getElementById('cylinder-bottom-thickness').value) || 2;

const material = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    roughness: 0.75,
    metalness: 0.05
});


if (isHollow) {
    const innerRadius = radius - wallThickness;

    if (innerRadius <= 0) {
        alert('Wall thickness is too large for this diameter.');
        return;
    }

    if (bottomThickness >= height) {
        alert('Bottom thickness must be smaller than height.');
        return;
    }

    const shape = new THREE.Shape();

    shape.absarc(0, 0, radius, 0, Math.PI * 2, false);

    const hole = new THREE.Path();

    hole.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);

    shape.holes.push(hole);

    const wallGeometry = new THREE.ExtrudeGeometry(
        shape,
        {
            depth: height,
            bevelEnabled: false,
            curveSegments: segments
        }
    );

wallGeometry.rotateX(Math.PI / 2);
wallGeometry.translate(0, height / 2, 0);

    const wallMesh = new THREE.Mesh(wallGeometry, material);

    const bottomGeometry = new THREE.CylinderGeometry(
        radius,
        radius,
        bottomThickness,
        segments
    );

bottomGeometry.translate(
    0,
    -height / 2 + bottomThickness / 2,
    0
);

    const bottomMesh = new THREE.Mesh(bottomGeometry, material);

    cylinderMesh = new THREE.Group();
    cylinderMesh.add(wallMesh);
    cylinderMesh.add(bottomMesh);
} else {
    const geometry = new THREE.CylinderGeometry(
        radius,
        radius,
        height,
        segments
    );

    cylinderMesh = new THREE.Mesh(
        geometry,
        material
    );
}

updateCylinderResults(
    radius,
    height,
    isHollow,
    wallThickness,
    bottomThickness
);

scene.add(cylinderMesh);

    const grid = new THREE.GridHelper(
        Math.max(diameter, height) * 2,
        20,
        0xcccccc,
        0xe5e7eb
    );

    grid.name = 'cylinderGrid';
    scene.add(grid);

    const maxDimension = Math.max(
        diameter,
        height
    );

    const distance = maxDimension * 2.8;

    camera.position.set(
        distance,
        -distance,
        distance
    );

    camera.lookAt(0, 0, 0);

    controls.target.set(0, 0, 0);
    controls.update();

    renderer.setSize(
        document.getElementById('cylinder-preview').clientWidth,
        document.getElementById('cylinder-preview').clientHeight
    );
}

function animateCylinder() {
    requestAnimationFrame(animateCylinder);

    controls.update();
    renderer.render(scene, camera);
}

function downloadCylinderSTL() {
    if (!cylinderMesh) {
        alert('No cylinder generated.');
        return;
    }

const exportObject = cylinderMesh.clone(true);

exportObject.traverse((child) => {
    if (child.isMesh) {
        child.geometry = child.geometry.clone();
        child.geometry.rotateX(Math.PI / 2);
    }
});

const stlString = exporter.parse(exportObject);

    const blob = new Blob(
        [stlString],
        {
            type: 'application/sla'
        }
    );

    const link = document.createElement('a');

    const diameter =
        document.getElementById('cylinder-diameter').value;

    const height =
        document.getElementById('cylinder-height').value;

    link.href = URL.createObjectURL(blob);
    link.download = `vekmaker-cylinder-${diameter}x${height}.stl`;

    link.click();

    URL.revokeObjectURL(link.href);
}

document.addEventListener('DOMContentLoaded', () => {
    initCylinderPreview();

    document
        .getElementById('generate-cylinder')
        .addEventListener('click', generateCylinder);

    document
        .getElementById('download-cylinder')
        .addEventListener('click', downloadCylinderSTL);
});

[
    'cylinder-diameter',
    'cylinder-height',
    'cylinder-segments',
    'cylinder-hollow',
    'cylinder-wall-thickness',
    'cylinder-bottom-thickness'
].forEach(id => {

    const element = document.getElementById(id);

    element.addEventListener('input', generateCylinder);

    element.addEventListener('change', generateCylinder);

});