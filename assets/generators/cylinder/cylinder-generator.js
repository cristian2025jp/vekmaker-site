import * as THREE from '../../libs/three/three.module.js';
import { OrbitControls } from '../../libs/three/OrbitControls.js';
import { exportSTL } from '../../js/core/stl-exporter.js';

let scene, camera, renderer, controls;
let cylinderMesh = null;
let lidMesh = null;

const CYLINDER_I18N = {
    en: {
        wallTooLarge: 'Wall thickness is too large for this diameter.',
        bottomTooLarge: 'Bottom thickness must be smaller than height.',
        enableLid: 'Please enable Generate Lid first.',
        generateFirst: 'Please generate a cylinder first.'
    },
    pt: {
        wallTooLarge: 'A espessura da parede é muito grande para este diâmetro.',
        bottomTooLarge: 'A espessura do fundo deve ser menor que a altura.',
        enableLid: 'Ative primeiro a opção Gerar tampa.',
        generateFirst: 'Gere primeiro um cilindro.'
    },
    ja: {
        wallTooLarge: 'この直径に対して壁が厚すぎます。',
        bottomTooLarge: '底の厚さは高さより小さくしてください。',
        enableLid: '先に「ふたを生成」を有効にしてください。',
        generateFirst: '先に円柱を生成してください。'
    }
};

const CYLINDER_LANG = ['en', 'pt', 'ja'].includes(document.documentElement.lang)
    ? document.documentElement.lang
    : 'en';

const CYLINDER_TEXT = CYLINDER_I18N[CYLINDER_LANG];

function initCylinderPreview() {
    const preview = document.getElementById('cylinder-preview');

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);

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
        alert(CYLINDER_TEXT.wallTooLarge);
        return null;
    }

    if (bottomThickness >= height) {
        alert(CYLINDER_TEXT.bottomTooLarge);
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

/*function updateCylinderResults(
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
*/

function generateCylinder() {
    const diameter =
        parseFloat(document.getElementById('cylinder-diameter').value) || 40;

    const height =
        parseFloat(document.getElementById('cylinder-height').value) || 40;

    const segments =
        parseInt(document.getElementById('cylinder-segments').value) || 64;

if (cylinderMesh) {
    scene.remove(cylinderMesh);
    cylinderMesh = null;
    }

if (lidMesh) {
    scene.remove(lidMesh);
    lidMesh = null;
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
})

const generateLid =
    document.getElementById('cylinder-lid').checked;

const lidThickness =
    parseFloat(
        document.getElementById('cylinder-lid-thickness').value
    ) || 2;

const lidLipHeight =
    parseFloat(
        document.getElementById('cylinder-lid-lip-height').value
    ) || 5;

const lidClearance =
    parseFloat(
        document.getElementById('cylinder-lid-clearance').value
    ) || 0.4;


;


if (isHollow) {
    const innerRadius = radius - wallThickness;

    if (innerRadius <= 0) {
        alert(CYLINDER_TEXT.wallTooLarge);
        return;
    }

    if (bottomThickness >= height) {
        alert(CYLINDER_TEXT.bottomTooLarge);
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

//updateCylinderResults(
//    radius,
//    height,
//    isHollow,
//    wallThickness,
//    bottomThickness
//);

//let lidMesh = null;

scene.add(cylinderMesh);

if (generateLid && isHollow) {

    const lidGroup = new THREE.Group();

    const lidTopGeometry =
        new THREE.CylinderGeometry(
            radius,
            radius,
            lidThickness,
            segments
        );

    const lidTop =
        new THREE.Mesh(
            lidTopGeometry,
            material
        );

    const lipRadius =
        radius - wallThickness - lidClearance;

    if (lipRadius > 0) {

        const lipGeometry =
            new THREE.CylinderGeometry(
                lipRadius,
                lipRadius,
                lidLipHeight,
                segments
            );

        const lip =
            new THREE.Mesh(
                lipGeometry,
                material
            );

        lip.position.y =
            (lidThickness / 2)
            + (lidLipHeight / 2);

        lidGroup.add(lip);
    }

    lidGroup.add(lidTop);

    lidGroup.position.x = diameter + radius + 10;
    lidGroup.position.y = -height / 2 + lidThickness / 2;

    lidMesh = lidGroup;

    scene.add(lidMesh);
}

    const grid = new THREE.GridHelper(
        Math.max(diameter, height) * 2,
        20,
        0xcccccc,
        0xe5e7eb
    );

    grid.name = 'cylinderGrid';
    //scene.add(grid);

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

function downloadLidSTL() {
    const generateLid = document.getElementById('cylinder-lid').checked;

    if (!generateLid || !lidMesh) {
        alert(CYLINDER_TEXT.enableLid);
        return;
    }

    const diameter = formatFilenameNumber(
        parseFloat(document.getElementById('cylinder-diameter').value) || 40
    );

    exportSTL(
        lidMesh,
        `vekmaker-cylinder-lid-${diameter}mm.stl`,
        {
            rotateForPrint: true,
            rotation: { x: Math.PI / 2, y: 0, z: 0 }
        }
    );
}

function downloadCylinderSTL() {
    if (!cylinderMesh) {
        alert(CYLINDER_TEXT.generateFirst);
        return;
    }

    const diameter = formatFilenameNumber(
        parseFloat(document.getElementById('cylinder-diameter').value) || 40
    );
    const height = formatFilenameNumber(
        parseFloat(document.getElementById('cylinder-height').value) || 40
    );

    exportSTL(
        cylinderMesh,
        `vekmaker-cylinder-${diameter}x${height}mm.stl`,
        {
            rotateForPrint: true,
            rotation: { x: Math.PI / 2, y: 0, z: 0 }
        }
    );
}

function formatFilenameNumber(value) {
    return Number(value)
        .toFixed(2)
        .replace(/\.00$/, '')
        .replace(/(\.\d)0$/, '$1');
}

document.addEventListener('DOMContentLoaded', () => {
    initCylinderPreview();

    document
        .getElementById('download-lid')
        .addEventListener('click', downloadLidSTL);

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
    'cylinder-bottom-thickness',
    'cylinder-lid',
    'cylinder-lid-thickness',
    'cylinder-lid-lip-height',
    'cylinder-lid-clearance'
].forEach(id => {

    const element = document.getElementById(id);

    element.addEventListener('input', generateCylinder);

    element.addEventListener('change', generateCylinder);

});