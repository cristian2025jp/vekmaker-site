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

    const geometry = new THREE.CylinderGeometry(
        radius,
        radius,
        height,
        segments
    );

    //geometry.rotateX(Math.PI / 2);

    const material = new THREE.MeshStandardMaterial({
        color: 0x3b82f6,
        roughness: 0.75,
        metalness: 0.05
    });

    cylinderMesh = new THREE.Mesh(
        geometry,
        material
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

    // Cria uma cópia da geometria apenas para exportação
    const exportGeometry = cylinderMesh.geometry.clone();

    // Rotaciona para o padrão esperado pelos slicers
    exportGeometry.rotateX(Math.PI / 2);

    const exportMesh = new THREE.Mesh(exportGeometry);

    const stlString = exporter.parse(exportMesh);

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