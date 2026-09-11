import * as THREE from '../../libs/three/three.module.js';
import { OrbitControls } from '../../libs/three/OrbitControls.js';
import { exportSTL } from '../../js/core/stl-exporter.js';

const LANG = ['en', 'pt', 'ja'].includes(document.documentElement.lang)
    ? document.documentElement.lang
    : 'en';

const T = {
    en: {
        ok: 'Round screw-lid box generated successfully.',
        first: 'Generate the box before downloading.',
        box: 'Container STL downloaded successfully.',
        lid: 'Screw lid STL downloaded successfully.'
    },
    pt: {
        ok: 'Caixa redonda com tampa de rosca gerada com sucesso.',
        first: 'Gere a caixa antes de baixar.',
        box: 'STL da caixa baixado com sucesso.',
        lid: 'STL da tampa de rosca baixado com sucesso.'
    },
    ja: {
        ok: 'ねじ式丸型ケースを生成しました。',
        first: 'ダウンロードする前にケースを生成してください。',
        box: 'ケース本体STLをダウンロードしました。',
        lid: 'ねじ式ふたSTLをダウンロードしました。'
    }
}[LANG];

/*
 * V1 uses a deliberately controlled thread system.
 * The user only chooses predefined diameter and height values.
 */
const WALL = 2.0;
const BOTTOM = 2.0;
const TOP = 2.0;

const THREAD_PITCH = 3.0;
const THREAD_HEIGHT = 1.20;
const THREAD_LENGTH = 7.0;
const THREAD_CLEARANCE = 0.65;

const THREAD_STEPS_PER_PITCH = 22;
const MAX_ARC_SEGMENT = 1.15;

const LID_EXTRA_HEIGHT = 1.0;

const E = {};
let scene, camera, renderer, controls, root = null;
let boxMesh = null;
let lidMesh = null;

document.addEventListener('DOMContentLoaded', () => {
    [
        'preview',
        'diameter',
        'height',
        'outer-diameter',
        'outer-height',
        'lid-height',
        'message',
        'download-box',
        'download-lid'
    ].forEach(key => E[key] = document.getElementById('sl-' + key));

    if (!E.preview) return;

    initPreview();
    bind();
    generate();
});

function initPreview() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);

    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    E.preview.replaceChildren(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;

    scene.add(new THREE.AmbientLight(0xffffff, 1.65));

    const key = new THREE.DirectionalLight(0xffffff, 1.25);
    key.position.set(160, -210, 180);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xffffff, 0.45);
    fill.position.set(-120, 150, 100);
    scene.add(fill);

    new ResizeObserver(resize).observe(E.preview);
    resize();
    animate();
}

function bind() {
    ['diameter', 'height'].forEach(key => {
        E[key].addEventListener('input', generate);
        E[key].addEventListener('change', generate);
    });

    E['download-box'].addEventListener('click', downloadBox);
    E['download-lid'].addEventListener('click', downloadLid);
}

function params() {
    return {
        diameter: +E.diameter.value,
        height: +E.height.value
    };
}

function calc(a) {
    const innerR = a.diameter / 2;
    const bodyR = innerR + WALL;
    const boxH = a.height + BOTTOM;
    const lidH = THREAD_LENGTH + TOP + LID_EXTRA_HEIGHT;
    const lidOuterR = bodyR + THREAD_CLEARANCE + THREAD_HEIGHT + WALL;

    return {
        innerR,
        bodyR,
        boxH,
        lidH,
        lidOuterR,
        outerDiameter: bodyR * 2,
        totalClosedHeight: boxH + (lidH - THREAD_LENGTH)
    };
}

function generate() {
    const a = params();
    const d = calc(a);

    removeModel();

    const boxGeometry = createContainerGeometry(a, d);
    const lidGeometry = createLidGeometry(a, d);

    boxMesh = new THREE.Mesh(
        boxGeometry,
        material(0x3b82f6)
    );

    lidMesh = new THREE.Mesh(
        lidGeometry,
        material(0x60a5fa)
    );

    /*
     * Preview parts separated so the external and internal threads
     * can be inspected independently.
     */
    const previewGap = Math.max(14, a.diameter * 0.18);
    lidMesh.position.x =
        d.lidOuterR +
        d.bodyR +
        previewGap;

    root = new THREE.Group();
    root.add(boxMesh, lidMesh);
    scene.add(root);

    updateResults(d);
    fitCamera(a, d);
    msg(T.ok, 'success');
}

function createContainerGeometry(a, d) {
    const radialSegments = radialSegmentCount(d.bodyR + THREAD_HEIGHT);
    const threadStart = Math.max(BOTTOM + 2, d.boxH - THREAD_LENGTH);

    const outerZ = buildZRows(
        0,
        d.boxH,
        threadStart,
        d.boxH,
        THREAD_PITCH
    );

    const innerZ = buildSimpleRows(
        BOTTOM,
        d.boxH,
        1.25
    );

    const outerRadius = (theta, z) => {
        let radius = d.bodyR;

        if (z >= threadStart && z <= d.boxH) {
            const localZ = z - threadStart;
            const amp = threadRamp(localZ, THREAD_LENGTH);
            radius +=
                THREAD_HEIGHT *
                amp *
                threadWave(localZ, theta);
        }

        return radius;
    };

    const innerRadius = () => d.innerR;

    return makeOpenContainerMesh({
        radialSegments,
        outerZ,
        innerZ,
        outerRadius,
        innerRadius
    });
}

function createLidGeometry(a, d) {
    const radialSegments = radialSegmentCount(d.lidOuterR);
    const innerTopZ = d.lidH - TOP;

    const outerZ = buildSimpleRows(
        0,
        d.lidH,
        1.25
    );

    /*
     * Female thread continues through the full usable internal height of the lid.
     * This prevents the box thread from reaching an abrupt unthreaded section.
     */
    const lidThreadLength = innerTopZ;

    const innerZ = buildZRows(
        0,
        innerTopZ,
        0,
        lidThreadLength,
        THREAD_PITCH
    );

    const outerRadius = () => d.lidOuterR;

    const femaleBaseR = d.bodyR + THREAD_CLEARANCE;

    const innerRadius = (theta, z) => {
        let radius = femaleBaseR;

        if (z >= 0 && z <= lidThreadLength) {
            const amp = threadRamp(z, lidThreadLength);
            radius +=
                THREAD_HEIGHT *
                amp *
                threadWave(z, theta);
        }

        return radius;
    };

    return makeOpenBottomLidMesh({
        radialSegments,
        outerZ,
        innerZ,
        outerRadius,
        innerRadius
    });
}

function makeOpenContainerMesh({
    radialSegments,
    outerZ,
    innerZ,
    outerRadius,
    innerRadius
}) {
    const vertices = [];
    const indices = [];

    const addVertex = (x, y, z) => {
        const i = vertices.length / 3;
        vertices.push(x, y, z);
        return i;
    };

    const addRing = (z, radiusFn) => {
        const ring = [];

        for (let i = 0; i < radialSegments; i++) {
            const theta = i / radialSegments * Math.PI * 2;
            const r = radiusFn(theta, z);

            ring.push(addVertex(
                r * Math.cos(theta),
                r * Math.sin(theta),
                z
            ));
        }

        return ring;
    };

    const quad = (a, b, c, d) => {
        indices.push(a, b, c, a, c, d);
    };

    const outerRings = outerZ.map(
        z => addRing(z, outerRadius)
    );

    const innerRings = innerZ.map(
        z => addRing(z, innerRadius)
    );

    // Outer surface.
    for (let j = 0; j < outerRings.length - 1; j++) {
        const a = outerRings[j];
        const b = outerRings[j + 1];

        for (let i = 0; i < radialSegments; i++) {
            const n = (i + 1) % radialSegments;
            quad(a[i], a[n], b[n], b[i]);
        }
    }

    // Inner surface, reversed winding.
    for (let j = 0; j < innerRings.length - 1; j++) {
        const a = innerRings[j];
        const b = innerRings[j + 1];

        for (let i = 0; i < radialSegments; i++) {
            const n = (i + 1) % radialSegments;
            quad(a[i], b[i], b[n], a[n]);
        }
    }

    // Solid outside bottom.
    const outerBottomCenter = addVertex(0, 0, outerZ[0]);

    for (let i = 0; i < radialSegments; i++) {
        const n = (i + 1) % radialSegments;
        indices.push(
            outerBottomCenter,
            outerRings[0][n],
            outerRings[0][i]
        );
    }

    // Inside floor.
    const innerFloorCenter = addVertex(0, 0, innerZ[0]);

    for (let i = 0; i < radialSegments; i++) {
        const n = (i + 1) % radialSegments;
        indices.push(
            innerFloorCenter,
            innerRings[0][i],
            innerRings[0][n]
        );
    }

    // Top rim closes outer and inner walls.
    const outerTop = outerRings[outerRings.length - 1];
    const innerTop = innerRings[innerRings.length - 1];

    for (let i = 0; i < radialSegments; i++) {
        const n = (i + 1) % radialSegments;
        quad(
            outerTop[i],
            outerTop[n],
            innerTop[n],
            innerTop[i]
        );
    }

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(
            new Float32Array(vertices),
            3
        )
    );

    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
}

function makeOpenBottomLidMesh({
    radialSegments,
    outerZ,
    innerZ,
    outerRadius,
    innerRadius
}) {
    const vertices = [];
    const indices = [];

    const addVertex = (x, y, z) => {
        const i = vertices.length / 3;
        vertices.push(x, y, z);
        return i;
    };

    const addRing = (z, radiusFn) => {
        const ring = [];

        for (let i = 0; i < radialSegments; i++) {
            const theta = i / radialSegments * Math.PI * 2;
            const r = radiusFn(theta, z);

            ring.push(addVertex(
                r * Math.cos(theta),
                r * Math.sin(theta),
                z
            ));
        }

        return ring;
    };

    const quad = (a, b, c, d) => {
        indices.push(a, b, c, a, c, d);
    };

    const outerRings = outerZ.map(
        z => addRing(z, outerRadius)
    );

    const innerRings = innerZ.map(
        z => addRing(z, innerRadius)
    );

    // Outer cylinder.
    for (let j = 0; j < outerRings.length - 1; j++) {
        const a = outerRings[j];
        const b = outerRings[j + 1];

        for (let i = 0; i < radialSegments; i++) {
            const n = (i + 1) % radialSegments;
            quad(a[i], a[n], b[n], b[i]);
        }
    }

    // Inner threaded surface, reversed winding.
    for (let j = 0; j < innerRings.length - 1; j++) {
        const a = innerRings[j];
        const b = innerRings[j + 1];

        for (let i = 0; i < radialSegments; i++) {
            const n = (i + 1) % radialSegments;
            quad(a[i], b[i], b[n], a[n]);
        }
    }

    // Bottom annular rim.
    const outerBottom = outerRings[0];
    const innerBottom = innerRings[0];

    for (let i = 0; i < radialSegments; i++) {
        const n = (i + 1) % radialSegments;
        quad(
            outerBottom[i],
            innerBottom[i],
            innerBottom[n],
            outerBottom[n]
        );
    }

    // Outer top face.
    const outerTop = outerRings[outerRings.length - 1];
    const topCenter = addVertex(0, 0, outerZ[outerZ.length - 1]);

    for (let i = 0; i < radialSegments; i++) {
        const n = (i + 1) % radialSegments;
        indices.push(
            topCenter,
            outerTop[i],
            outerTop[n]
        );
    }

    // Internal ceiling face.
    const innerTop = innerRings[innerRings.length - 1];
    const ceilingCenter = addVertex(0, 0, innerZ[innerZ.length - 1]);

    for (let i = 0; i < radialSegments; i++) {
        const n = (i + 1) % radialSegments;
        indices.push(
            ceilingCenter,
            innerTop[n],
            innerTop[i]
        );
    }

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(
            new Float32Array(vertices),
            3
        )
    );

    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
}

function threadWave(z, theta) {
    /*
     * Rounded single-start helical thread.
     * Smooth sinusoidal crest avoids razor-thin triangular thread tips.
     */
    const phase =
        (z / THREAD_PITCH) -
        (theta / (Math.PI * 2));

    return 0.5 + 0.5 * Math.cos(
        Math.PI * 2 * phase
    );
}

function threadRamp(localZ, length) {
    const runout = THREAD_PITCH * 0.55;

    const start = clamp(localZ / runout, 0, 1);
    const end = clamp((length - localZ) / runout, 0, 1);

    return smoothstep(start) * smoothstep(end);
}

function smoothstep(t) {
    return t * t * (3 - 2 * t);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function radialSegmentCount(radius) {
    const circumference = Math.PI * 2 * radius;

    return Math.max(
        96,
        Math.min(
            320,
            Math.ceil(circumference / MAX_ARC_SEGMENT)
        )
    );
}

function buildSimpleRows(start, end, step) {
    const values = [start];

    let z = start + step;

    while (z < end - 1e-6) {
        values.push(z);
        z += step;
    }

    if (Math.abs(values[values.length - 1] - end) > 1e-6) {
        values.push(end);
    }

    return values;
}

function buildZRows(
    start,
    end,
    threadStart,
    threadEnd,
    pitch
) {
    const values = [];

    const push = value => {
        const v = clamp(value, start, end);

        if (
            values.length === 0 ||
            Math.abs(values[values.length - 1] - v) > 1e-6
        ) {
            values.push(v);
        }
    };

    push(start);

    // Coarse region before the thread.
    let z = start + 1.25;

    while (z < threadStart - 1e-6) {
        push(z);
        z += 1.25;
    }

    push(threadStart);

    // Fine rows through the thread.
    const fineStep = pitch / THREAD_STEPS_PER_PITCH;
    z = threadStart + fineStep;

    while (z < threadEnd - 1e-6) {
        push(z);
        z += fineStep;
    }

    push(threadEnd);

    // Coarse region after the thread.
    z = threadEnd + 1.25;

    while (z < end - 1e-6) {
        push(z);
        z += 1.25;
    }

    push(end);

    return values;
}

function material(color) {
    return new THREE.MeshStandardMaterial({
        color,
        roughness: 0.56,
        metalness: 0.02,
        side: THREE.DoubleSide
    });
}

function updateResults(d) {
    E['outer-diameter'].textContent =
        `${fmt(d.outerDiameter)} mm`;

    E['outer-height'].textContent =
        `${fmt(d.boxH)} mm`;

    E['lid-height'].textContent =
        `${fmt(d.lidH)} mm`;
}

function downloadBox() {
    if (!boxMesh) {
        msg(T.first, 'error');
        return;
    }

    const a = params();

    exportSTL(
        boxMesh,
        `vekmaker-round-screw-box-${a.diameter}x${a.height}mm.stl`,
        {
            rotateForPrint: false,
            centerXY: true,
            placeOnBed: true
        }
    );

    msg(T.box, 'success');
}

function downloadLid() {
    if (!lidMesh) {
        msg(T.first, 'error');
        return;
    }

    const a = params();

    /*
     * Lid is already modeled open side down.
     * Export without preview translation.
     */
    const lid = lidMesh.clone(true);
    lid.position.set(0, 0, 0);
    lid.updateMatrix();
    lid.updateMatrixWorld(true);

    exportSTL(
        lid,
        `vekmaker-round-screw-lid-${a.diameter}mm.stl`,
        {
            rotateForPrint: false,
            centerXY: true,
            placeOnBed: true
        }
    );

    msg(T.lid, 'success');
}

function fitCamera(a, d) {
    const fullW =
        d.lidOuterR * 2 +
        d.bodyR * 2 +
        Math.max(14, a.diameter * 0.18);

    const size = Math.max(
        fullW,
        d.boxH,
        d.lidH
    );

    const dist = size * 1.65;

    camera.position.set(
        dist * 0.85,
        -dist,
        dist * 0.62
    );

    camera.near = Math.max(0.1, dist / 100);
    camera.far = Math.max(5000, dist * 20);
    camera.updateProjectionMatrix();

    controls.target.set(
        (d.lidOuterR + d.bodyR) * 0.35,
        0,
        Math.max(d.boxH, d.lidH) * 0.43
    );

    controls.update();
}

function removeModel() {
    if (!root) return;

    scene.remove(root);

    root.traverse(obj => {
        if (!obj.isMesh) return;
        obj.geometry?.dispose();

        if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
        } else {
            obj.material?.dispose();
        }
    });

    root = null;
    boxMesh = null;
    lidMesh = null;
}

function msg(text, type = '') {
    E.message.textContent = text;
    E.message.className = 'validation-message';

    if (type) {
        E.message.classList.add(type);
    }
}

function fmt(value) {
    return Number(value)
        .toFixed(2)
        .replace(/\.00$/, '')
        .replace(/(\.\d)0$/, '$1');
}

function resize() {
    const w = Math.max(E.preview.clientWidth, 1);
    const h = Math.max(E.preview.clientHeight, 320);

    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
}

function animate() {
    requestAnimationFrame(animate);
    controls?.update();
    renderer?.render(scene, camera);
}
