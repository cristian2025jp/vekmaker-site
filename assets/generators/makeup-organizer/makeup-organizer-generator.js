import * as THREE from '../../libs/three/three.module.js';
import { OrbitControls } from '../../libs/three/OrbitControls.js';
import { exportSTL } from '../../js/core/stl-exporter.js';

const LANG = ['en', 'pt', 'ja'].includes(document.documentElement.lang)
    ? document.documentElement.lang
    : 'en';

const TEXT = {
    en: {
        previewMissing: 'The preview area was not found.',
        invalid: 'Please check the dimensions and layout.',
        generated: 'Makeup organizer generated successfully.',
        generateFirst: 'Generate the organizer before downloading.',
        downloaded: 'Organizer STL downloaded successfully.',
        width: 'Width must be between 80 mm and 260 mm.',
        depth: 'Depth must be between 60 mm and 220 mm.',
        frontHeight: 'Front height must be between 20 mm and 140 mm.',
        backHeight: 'Back height must be between 30 mm and 180 mm, and should be equal to or greater than the front height.',
        wall: 'Wall thickness must be between 1.2 mm and 4 mm.',
        bottom: 'Bottom thickness must be between 1.2 mm and 6 mm.',
        divider: 'Divider thickness must be between 1 mm and 4 mm.',
        rows: 'Rows must be between 1 and 6.',
        columns: 'Columns must be between 1 and 6.',
        compartments: 'The selected rows and columns create compartments that are too small.'
    },
    pt: {
        previewMissing: 'A área de visualização não foi encontrada.',
        invalid: 'Verifique as dimensões e a distribuição.',
        generated: 'Organizador de maquiagem gerado com sucesso.',
        generateFirst: 'Gere o organizador antes de baixar.',
        downloaded: 'STL do organizador baixado com sucesso.',
        width: 'A largura deve estar entre 80 mm e 260 mm.',
        depth: 'A profundidade deve estar entre 60 mm e 220 mm.',
        frontHeight: 'A altura da frente deve estar entre 20 mm e 140 mm.',
        backHeight: 'A altura de trás deve estar entre 30 mm e 180 mm e deve ser igual ou maior que a altura da frente.',
        wall: 'A espessura da parede deve estar entre 1,2 mm e 4 mm.',
        bottom: 'A espessura do fundo deve estar entre 1,2 mm e 6 mm.',
        divider: 'A espessura das divisórias deve estar entre 1 mm e 4 mm.',
        rows: 'O número de linhas deve estar entre 1 e 6.',
        columns: 'O número de colunas deve estar entre 1 e 6.',
        compartments: 'A quantidade de linhas e colunas escolhida criou compartimentos muito pequenos.'
    },
    ja: {
        previewMissing: 'プレビュー領域が見つかりません。',
        invalid: '寸法とレイアウトを確認してください。',
        generated: 'メイクアップオーガナイザーを生成しました。',
        generateFirst: 'ダウンロードする前にオーガナイザーを生成してください。',
        downloaded: 'オーガナイザーSTLをダウンロードしました。',
        width: '幅は80 mmから260 mmの範囲で指定してください。',
        depth: '奥行きは60 mmから220 mmの範囲で指定してください。',
        frontHeight: '前面の高さは20 mmから140 mmの範囲で指定してください。',
        backHeight: '背面の高さは30 mmから180 mmの範囲で、前面の高さ以上にしてください。',
        wall: '壁厚は1.2 mmから4 mmの範囲で指定してください。',
        bottom: '底厚は1.2 mmから6 mmの範囲で指定してください。',
        divider: '仕切り厚は1 mmから4 mmの範囲で指定してください。',
        rows: '行数は1から6の範囲で指定してください。',
        columns: '列数は1から6の範囲で指定してください。',
        compartments: '選択した行数と列数では区画が小さすぎます。'
    }
}[LANG];

const E = {};
let scene, camera, renderer, controls, root = null, organizerGroup = null, resizeObserver = null;

document.addEventListener('DOMContentLoaded', () => {
    [
        'preview',
        'width',
        'depth',
        'front-height',
        'back-height',
        'rows',
        'columns',
        'wall',
        'bottom',
        'divider',
        'comp-width',
        'comp-depth',
        'front-inner-height',
        'back-inner-height',
        'message',
        'generate',
        'download'
    ].forEach(key => E[key] = document.getElementById('mo-' + key));

    if (!E.preview) {
        console.error(TEXT.previewMissing);
        return;
    }

    initPreview();
    bindEvents();
    generate();
});

function initPreview() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);

    camera = new THREE.PerspectiveCamera(45, getAspect(), 0.1, 5000);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    E.preview.replaceChildren(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;

    scene.add(new THREE.AmbientLight(0xffffff, 1.65));

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.15);
    mainLight.position.set(180, -220, 180);
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.45);
    fillLight.position.set(-140, 180, 80);
    scene.add(fillLight);

    if ('ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(resizePreview);
        resizeObserver.observe(E.preview);
    } else {
        window.addEventListener('resize', resizePreview);
    }

    resizePreview();
    animate();
}

function bindEvents() {
    [
        'width',
        'depth',
        'front-height',
        'back-height',
        'rows',
        'columns',
        'wall',
        'bottom',
        'divider'
    ].forEach(key => {
        E[key].addEventListener('input', generate);
        E[key].addEventListener('change', generate);
    });

    E.generate.addEventListener('click', generate);
    E.download.addEventListener('click', downloadSTL);
}

function readParams() {
    return {
        width: +E.width.value,
        depth: +E.depth.value,
        frontHeight: +E['front-height'].value,
        backHeight: +E['back-height'].value,
        rows: +E.rows.value,
        columns: +E.columns.value,
        wall: +E.wall.value,
        bottom: +E.bottom.value,
        divider: +E.divider.value
    };
}

function calc(a) {
    const innerWidth = a.width - 2 * a.wall;
    const innerDepth = a.depth - 2 * a.wall;
    const frontInnerHeight = a.frontHeight - a.bottom;
    const backInnerHeight = a.backHeight - a.bottom;

    const compWidth = (innerWidth - (a.columns - 1) * a.divider) / a.columns;
    const compDepth = (innerDepth - (a.rows - 1) * a.divider) / a.rows;

    return {
        innerWidth,
        innerDepth,
        frontInnerHeight,
        backInnerHeight,
        compWidth,
        compDepth
    };
}

function validate(a, d) {
    if (!(a.width >= 80 && a.width <= 260)) return TEXT.width;
    if (!(a.depth >= 60 && a.depth <= 220)) return TEXT.depth;
    if (!(a.frontHeight >= 20 && a.frontHeight <= 140)) return TEXT.frontHeight;
    if (!(a.backHeight >= 30 && a.backHeight <= 180 && a.backHeight >= a.frontHeight)) return TEXT.backHeight;
    if (!(a.wall >= 1.2 && a.wall <= 4)) return TEXT.wall;
    if (!(a.bottom >= 1.2 && a.bottom <= 6)) return TEXT.bottom;
    if (!(a.divider >= 1 && a.divider <= 4)) return TEXT.divider;
    if (!(Number.isInteger(a.rows) && a.rows >= 1 && a.rows <= 6)) return TEXT.rows;
    if (!(Number.isInteger(a.columns) && a.columns >= 1 && a.columns <= 6)) return TEXT.columns;
    if (d.frontInnerHeight <= 8 || d.backInnerHeight <= 10) return TEXT.invalid;
    if (d.compWidth < 12 || d.compDepth < 12) return TEXT.compartments;
    return '';
}

function generate() {
    const a = readParams();
    const d = calc(a);

    updateResults(d);

    const error = validate(a, d);
    if (error) {
        setMessage(error, 'error');
        enableDownloads(false);
        return false;
    }

    removeModel();

    organizerGroup = makeOrganizer(a, d);
    root = new THREE.Group();
    root.add(organizerGroup);
    scene.add(root);

    fitCamera(a);
    setMessage(TEXT.generated, 'success');
    enableDownloads(true);
    return true;
}

function makeOrganizer(a, d) {
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({
        color: 0x3b82f6,
        roughness: 0.58,
        metalness: 0.04,
        side: THREE.DoubleSide
    });

    // Bottom plate
    group.add(boxMesh(a.width, a.depth, a.bottom, 0, 0, a.bottom / 2, material));

    // Front and back walls
    const frontWallH = a.frontHeight - a.bottom;
    const backWallH = a.backHeight - a.bottom;
    group.add(boxMesh(
        a.width,
        a.wall,
        frontWallH,
        0,
        -a.depth / 2 + a.wall / 2,
        a.bottom + frontWallH / 2,
        material
    ));
    group.add(boxMesh(
        a.width,
        a.wall,
        backWallH,
        0,
        a.depth / 2 - a.wall / 2,
        a.bottom + backWallH / 2,
        material
    ));

    // Left and right sloped side walls
    const sideLeft = slopedPrism(a.wall, a.depth, frontWallH, backWallH, material);
    sideLeft.position.set(-a.width / 2 + a.wall / 2, 0, a.bottom);
    group.add(sideLeft);

    const sideRight = slopedPrism(a.wall, a.depth, frontWallH, backWallH, material);
    sideRight.position.set(a.width / 2 - a.wall / 2, 0, a.bottom);
    group.add(sideRight);

    // Internal dividers front-to-back (sloped)
    for (let c = 1; c < a.columns; c++) {
        const x = -d.innerWidth / 2 + c * d.compWidth + (c - 0.5) * a.divider;
        const dividerMesh = slopedPrism(a.divider, d.innerDepth, d.frontInnerHeight, d.backInnerHeight, material);
        dividerMesh.position.set(x, 0, a.bottom);
        group.add(dividerMesh);
    }

    // Internal dividers left-to-right.
    // Their top must follow the SAME front-to-back slope as the side walls.
    // Use the OUTER front/back heights, then subtract the bottom only once
    // when positioning the divider above the bottom plate.
    for (let r = 1; r < a.rows; r++) {
        const y = -d.innerDepth / 2 + r * d.compDepth + (r - 0.5) * a.divider;

        // Convert this divider position to the full outside depth of the organizer.
        const t = (y + a.depth / 2) / a.depth;
        const topZ = a.frontHeight + (a.backHeight - a.frontHeight) * t;
        const dividerHeight = topZ - a.bottom;

        group.add(boxMesh(
            d.innerWidth,
            a.divider,
            dividerHeight,
            0,
            y,
            a.bottom + dividerHeight / 2,
            material
        ));
    }

    return group;
}

function slopedPrism(width, depth, frontHeight, backHeight, material) {
    const hw = width / 2;
    const hd = depth / 2;

    const vertices = new Float32Array([
        -hw, -hd, 0,           // 0
         hw, -hd, 0,           // 1
         hw,  hd, 0,           // 2
        -hw,  hd, 0,           // 3
        -hw, -hd, frontHeight, // 4
         hw, -hd, frontHeight, // 5
         hw,  hd, backHeight,  // 6
        -hw,  hd, backHeight   // 7
    ]);

    const indices = [
        0, 1, 2,  0, 2, 3, // bottom
        0, 1, 5,  0, 5, 4, // front
        3, 2, 6,  3, 6, 7, // back
        0, 3, 7,  0, 7, 4, // left
        1, 2, 6,  1, 6, 5, // right
        4, 5, 6,  4, 6, 7  // top slope
    ];

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return new THREE.Mesh(geometry, material.clone());
}

function boxMesh(width, depth, height, x, y, z, material) {
    const geometry = new THREE.BoxGeometry(width, depth, height);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material.clone());
    mesh.position.set(x, y, z);
    return mesh;
}

function updateResults(d) {
    E['comp-width'].textContent = `${formatNumber(d.compWidth)} mm`;
    E['comp-depth'].textContent = `${formatNumber(d.compDepth)} mm`;
    E['front-inner-height'].textContent = `${formatNumber(d.frontInnerHeight)} mm`;
    E['back-inner-height'].textContent = `${formatNumber(d.backInnerHeight)} mm`;
}

function downloadSTL() {
    const a = readParams();
    const d = calc(a);
    const error = validate(a, d);

    if (error) {
        setMessage(error, 'error');
        enableDownloads(false);
        return;
    }

    if (!organizerGroup) {
        setMessage(TEXT.generateFirst, 'error');
        return;
    }

    const exportObject = organizerGroup.clone(true);
    exportObject.position.set(0, 0, 0);
    exportObject.updateMatrix();
    exportObject.updateMatrixWorld(true);

    exportSTL(
        exportObject,
        `vekmaker-makeup-organizer-${formatNumber(a.width)}x${formatNumber(a.depth)}x${formatNumber(a.backHeight)}mm.stl`,
        { rotateForPrint: false }
    );

    setMessage(TEXT.downloaded, 'success');
}

function removeModel() {
    if (!root) return;

    scene.remove(root);
    root.traverse(obj => {
        if (!obj.isMesh) return;
        obj.geometry?.dispose();
        obj.material?.dispose();
    });

    root = null;
    organizerGroup = null;
}

function fitCamera(a) {
    const largest = Math.max(a.width * 1.5, a.depth * 1.5, a.backHeight * 2.2);
    const dist = Math.max(150, largest);

    camera.position.set(dist, -dist * 1.1, dist * 0.85);
    camera.near = Math.max(0.1, dist / 100);
    camera.far = Math.max(5000, dist * 20);
    camera.updateProjectionMatrix();

    controls.target.set(0, 0, a.backHeight * 0.35);
    controls.update();
}

function setMessage(message, type = '') {
    E.message.textContent = message;
    E.message.className = 'validation-message';
    if (type) E.message.classList.add(type);
}

function enableDownloads(enabled) {
    E.download.disabled = !enabled;
}

function resizePreview() {
    if (!renderer || !camera) return;
    const width = Math.max(E.preview.clientWidth, 1);
    const height = Math.max(E.preview.clientHeight, 320);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
}

function getAspect() {
    const width = Math.max(E.preview?.clientWidth || 1, 1);
    const height = Math.max(E.preview?.clientHeight || 420, 1);
    return width / height;
}

function formatNumber(value) {
    return Number(value)
        .toFixed(2)
        .replace(/\.00$/, '')
        .replace(/(\.\d)0$/, '$1');
}

function animate() {
    requestAnimationFrame(animate);
    controls?.update();
    renderer?.render(scene, camera);
}
