import * as THREE from '../libs/three/three.module.js';
import { OrbitControls } from '../libs/three/OrbitControls.js';
import { STLExporter } from '../libs/three/STLExporter.js';

let scene;
let camera;
let renderer;
let controls;

let currentBox;
let grid;
let exporter;

function initViewer() {

    const container =
        document.getElementById('viewer3d');

    scene = new THREE.Scene();

    exporter = new STLExporter();

    scene.background = new THREE.Color(0xf8f9fa);

    //scene.background =
    //    new THREE.Color(0xffffff);
		
	//const material =
    //new THREE.MeshStandardMaterial({
    //    color: 0x3b82f6,
    //    roughness: 0.7,
    //    metalness: 0.1
    //});

grid = new THREE.GridHelper(
    300,
    30
);

scene.add(grid);

    const axesHelper = new THREE.AxesHelper(100);
    scene.add(axesHelper);

scene.add(grid);

    camera =
        new THREE.PerspectiveCamera(
            45,
            container.clientWidth /
            container.clientHeight,
            0.1,
            5000
        );

    camera.position.set(150, 150, 150);
    camera.lookAt(0, 0, 0);


    
    renderer =
        new THREE.WebGLRenderer({
            antialias: true
        });

    renderer.setSize(
        container.clientWidth,
        container.clientHeight
    );

    container.appendChild(renderer.domElement);

    controls = new OrbitControls(
    camera,
    renderer.domElement
    );

controls.enableDamping = true;

    //controls =
    //    new OrbitControls(
    //        camera,
    //        renderer.domElement
    //    );

    //controls.enableDamping = true;

    const ambient =
    new THREE.AmbientLight(
        0xffffff,
        1.5
    );

scene.add(ambient);

const directional =
    new THREE.DirectionalLight(
        0xffffff,
        1
    );

directional.position.set(
    100,
    200,
    100
);

	scene.add(directional);

    //scene.add(ambient);

    animate();
}

function animate() {

    requestAnimationFrame(animate);

    controls.update();

    renderer.render(scene, camera);
}

function downloadSTL() {

    if (!currentBox) {
        alert('Nenhuma caixa gerada.');
        return;
    }

    const exportBox =
        currentBox.clone();

    exportBox.rotation.x =
        Math.PI / 2;

    exportBox.updateMatrix();
    exportBox.updateMatrixWorld(true);

    const stlString =
        exporter.parse(exportBox);

    const blob =
        new Blob(
            [stlString],
            {
                type: 'application/sla'
            }
        );

    const link =
        document.createElement('a');

    link.href =
        URL.createObjectURL(blob);

    const width =
    document.getElementById('width').value;

    const depth =
    document.getElementById('depth').value;

    const height =
    document.getElementById('height').value;

    link.download =
        `vekmaker-box-${width}x${depth}x${height}.stl`;

    link.click();

    URL.revokeObjectURL(
        link.href
    );
}

function updateBox(
    internalWidth,
    internalDepth,
    internalHeight,
    wall,
    bottom
) {

    if (currentBox) {
        scene.remove(currentBox);
    }

    const boxGroup = new THREE.Group();

    const material = new THREE.MeshStandardMaterial({
        color: 0x3b82f6,
        roughness: 0.75,
        metalness: 0.05
    });

    const externalWidth =
        internalWidth + (wall * 2);

    const externalDepth =
        internalDepth + (wall * 2);

    /*
     * FUNDO
     */

    const bottomGeometry =
        new THREE.BoxGeometry(
            externalWidth,
            bottom,
            externalDepth
        );

    const bottomMesh =
        new THREE.Mesh(
            bottomGeometry,
            material
        );

    bottomMesh.position.set(
        externalWidth / 2,
        bottom / 2,
        externalDepth / 2
    );

    boxGroup.add(bottomMesh);

    /*
     * PAREDE ESQUERDA
     */

    const leftWall =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                wall,
                internalHeight,
                externalDepth
            ),
            material
        );

    leftWall.position.set(
        wall / 2,
        bottom + (internalHeight / 2),
        externalDepth / 2
    );

    boxGroup.add(leftWall);

    /*
     * PAREDE DIREITA
     */

    const rightWall =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                wall,
                internalHeight,
                externalDepth
            ),
            material
        );

    rightWall.position.set(
        externalWidth - (wall / 2),
        bottom + (internalHeight / 2),
        externalDepth / 2
    );

    boxGroup.add(rightWall);

    /*
     * PAREDE FRENTE
     */

    const frontWall =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                internalWidth,
                internalHeight,
                wall
            ),
            material
        );

    frontWall.position.set(
        externalWidth / 2,
        bottom + (internalHeight / 2),
        wall / 2
    );

    boxGroup.add(frontWall);

    /*
     * PAREDE TRASEIRA
     */

    const backWall =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                internalWidth,
                internalHeight,
                wall
            ),
            material
        );

    backWall.position.set(
        externalWidth / 2,
        bottom + (internalHeight / 2),
        externalDepth - (wall / 2)
    );

    boxGroup.add(backWall);

    currentBox = boxGroup;

    scene.add(currentBox);

    if (grid) {
    scene.remove(grid);
}

const gridSize = Math.max(
    externalWidth,
    externalDepth
) * 2;

grid = new THREE.GridHelper(
    gridSize,
    20,
    0xcccccc,
    0xe5e7eb
);

scene.add(grid);

    const box = new THREE.Box3().setFromObject(currentBox);

    const size = box.getSize(new THREE.Vector3());

    const maxDimension = Math.max(
        size.x,
        size.y,
        size.z
    );

    const distance = maxDimension * 2.5;

    camera.position.set(
        distance,
        distance,
        distance
    );

    controls.target.set(
        size.x / 2,
        size.y / 2,
        size.z / 2
    );

    controls.update();

   
}

window.BoxViewer = {
    initViewer,
    updateBox,
    downloadSTL
};

