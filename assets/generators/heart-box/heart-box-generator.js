import * as THREE from '../../libs/three/three.module.js';
import { OrbitControls } from '../../libs/three/OrbitControls.js';
import { exportSTL } from '../../js/core/stl-exporter.js';

const LANG = ['en', 'pt', 'ja'].includes(document.documentElement.lang)
    ? document.documentElement.lang
    : 'en';

const T = {
    en: {
        ok: 'Heart box generated successfully.',
        first: 'Generate the heart box before downloading.',
        box: 'Heart box STL downloaded successfully.',
        lid: 'Heart lid STL downloaded successfully.'
    },
    pt: {
        ok: 'Caixa em formato de coração gerada com sucesso.',
        first: 'Gere a caixa em formato de coração antes de baixar.',
        box: 'STL da caixa em formato de coração baixado com sucesso.',
        lid: 'STL da tampa em formato de coração baixado com sucesso.'
    },
    ja: {
        ok: 'ハート型ボックスを生成しました。',
        first: 'ダウンロードする前にハート型ボックスを生成してください。',
        box: 'ハート型ボックス本体STLをダウンロードしました。',
        lid: 'ハート型ふたSTLをダウンロードしました。'
    }
}[LANG];

const WALL = 2.0;
const BOTTOM = 2.0;
const LID_WALL = 2.0;
const LID_TOP = 2.0;
const LID_SKIRT = 6.0;
const LID_CLEARANCE = 0.45;
const HEART_POINTS = 240;
const DEPTH_RATIO = 0.88;

const E = {};
let scene, camera, renderer, controls, root = null;
let boxMesh = null;
let lidMesh = null;

document.addEventListener('DOMContentLoaded', () => {
    [
        'preview','width','height',
        'outer-width','outer-depth','outer-height',
        'message','download-box','download-lid'
    ].forEach(key => E[key] = document.getElementById('hb-' + key));

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
    ['width', 'height'].forEach(key => {
        E[key].addEventListener('input', generate);
        E[key].addEventListener('change', generate);
    });

    E['download-box'].addEventListener('click', downloadBox);
    E['download-lid'].addEventListener('click', downloadLid);
}

function params() {
    return {
        width: +E.width.value,
        height: +E.height.value
    };
}

function calc(a) {
    const outerW = a.width + 2 * WALL;
    const outerD = outerW * DEPTH_RATIO;

    const innerW = a.width;
    const innerD = innerW * DEPTH_RATIO;

    const holderH = a.height + BOTTOM;

    const lidInnerW = outerW + 2 * LID_CLEARANCE;
    const lidInnerD = outerD + 2 * LID_CLEARANCE * DEPTH_RATIO;

    const lidOuterW = lidInnerW + 2 * LID_WALL;
    const lidOuterD = lidInnerD + 2 * LID_WALL * DEPTH_RATIO;

    return {
        outerW,
        outerD,
        innerW,
        innerD,
        holderH,
        lidInnerW,
        lidInnerD,
        lidOuterW,
        lidOuterD,
        lidH: LID_SKIRT + LID_TOP
    };
}

function generate() {
    const a = params();
    const d = calc(a);

    removeModel();

    boxMesh = new THREE.Mesh(
        makeHeartBoxGeometry(d),
        material(0xef4444)
    );

    lidMesh = new THREE.Mesh(
        makeHeartLidGeometry(d),
        material(0xf87171)
    );

    const gap = Math.max(14, a.width * 0.15);

    lidMesh.position.x =
        d.outerW / 2 +
        d.lidOuterW / 2 +
        gap;

    root = new THREE.Group();
    root.add(boxMesh, lidMesh);
    scene.add(root);

    updateResults(d);
    fitCamera(a, d);
    msg(T.ok, 'success');
}

function makeHeartBoxGeometry(d) {
    /*
     * Build the outer heart first, then derive the cavity by a geometric
     * inward offset. This keeps the wall thickness uniform even at the
     * concave upper notch of the heart.
     */
    const outer2D = heartPoints(
        d.outerW,
        d.outerD,
        HEART_POINTS
    );

    const inner2D = offsetHeartContour(
        outer2D,
        -WALL
    );

    return makeOpenContainerMesh(
        outer2D,
        inner2D,
        d.holderH,
        BOTTOM
    );
}

function makeHeartLidGeometry(d) {
    /*
     * Derive the lid from the exact box contour: first expand for the
     * printing clearance, then expand again for the lid wall thickness.
     */
    const boxOuter2D = heartPoints(
        d.outerW,
        d.outerD,
        HEART_POINTS
    );

    const inner2D = offsetHeartContour(
        boxOuter2D,
        LID_CLEARANCE
    );

    const outer2D = offsetHeartContour(
        inner2D,
        LID_WALL
    );

    return makeOpenBottomLidMesh(
        outer2D,
        inner2D,
        d.lidH,
        LID_SKIRT
    );
}

function offsetHeartContour(points, distance) {
    /*
     * points are counter-clockwise. For a CCW contour, the right-hand
     * normal points outward. Moving each sample by the local normal gives
     * a near-constant geometric offset, unlike independent X/Y scaling.
     *
     * At the concave upper notch, a positive offset can self-cross. When
     * that happens, keep the main heart loop and replace the tiny crossing
     * loop with the exact intersection point. This closes the contour
     * cleanly without leaving an overlap or a gap.
     */
    const n = points.length;
    let result = [];

    for (let i = 0; i < n; i++) {
        const prev = points[(i - 1 + n) % n];
        const curr = points[i];
        const next = points[(i + 1) % n];

        let tx = next.x - prev.x;
        let ty = next.y - prev.y;

        const len = Math.hypot(tx, ty);

        if (len < 1e-9) {
            result.push(curr.clone());
            continue;
        }

        tx /= len;
        ty /= len;

        const nx = ty;
        const ny = -tx;

        result.push(
            new THREE.Vector2(
                curr.x + nx * distance,
                curr.y + ny * distance
            )
        );
    }

    if (distance > 0) {
        result = trimHeartTopOverlap(result);
    }

    return result;
}

function trimHeartTopOverlap(points) {
    const n = points.length;
    const scan = Math.min(28, Math.max(10, Math.floor(n / 7)));

    for (let i = 0; i < scan; i++) {
        const a = points[i];
        const b = points[(i + 1) % n];

        for (let j = Math.max(i + 2, n - scan); j < n - 1; j++) {
            const c = points[j];
            const d = points[(j + 1) % n];

            const intersection = segmentIntersectionPoint(a, b, c, d);

            if (!intersection) {
                continue;
            }

            /*
             * The contour order is:
             * notch -> left lobe -> bottom -> right lobe -> notch.
             * If the two notch sides cross after an outward offset, the
             * printable outer boundary is the large middle loop. Start at
             * the exact crossing point, follow the large loop, and close
             * back to the crossing point automatically.
             */
            const repaired = [intersection];

            for (let k = i + 1; k <= j; k++) {
                repaired.push(points[k].clone());
            }

            if (THREE.ShapeUtils.isClockWise(repaired)) {
                repaired.reverse();
            }

            return repaired;
        }
    }

    return points;
}

function segmentIntersectionPoint(a, b, c, d) {
    const x1 = a.x;
    const y1 = a.y;
    const x2 = b.x;
    const y2 = b.y;
    const x3 = c.x;
    const y3 = c.y;
    const x4 = d.x;
    const y4 = d.y;

    const denominator =
        (x1 - x2) * (y3 - y4) -
        (y1 - y2) * (x3 - x4);

    if (Math.abs(denominator) < 1e-10) {
        return null;
    }

    const t =
        ((x1 - x3) * (y3 - y4) -
         (y1 - y3) * (x3 - x4)) /
        denominator;

    const u =
        -((x1 - x2) * (y1 - y3) -
          (y1 - y2) * (x1 - x3)) /
        denominator;

    const eps = 1e-7;

    if (
        t <= eps || t >= 1 - eps ||
        u <= eps || u >= 1 - eps
    ) {
        return null;
    }

    return new THREE.Vector2(
        x1 + t * (x2 - x1),
        y1 + t * (y2 - y1)
    );
}

function heartPoints(width, depth, count) {
    /*
     * Custom Bézier heart profile.
     * Compared with the original mathematical heart, this version:
     * - has smoother upper lobes;
     * - has a deliberately rounded lower point;
     * - keeps the contour stable for the box and matching lid.
     */
    const segments = [
        [
            [0.000,  0.280],
            [-0.055, 0.500],
            [-0.260, 0.560],
            [-0.405, 0.460]
        ],
        [
            [-0.405, 0.460],
            [-0.565, 0.350],
            [-0.555, 0.105],
            [-0.425,-0.080]
        ],
        [
            [-0.425,-0.080],
            [-0.300,-0.250],
            [-0.160,-0.395],
            [-0.065,-0.465]
        ],
        [
            [-0.065,-0.465],
            [-0.0175,-0.500],
            [ 0.0175,-0.500],
            [ 0.065,-0.465]
        ],
        [
            [ 0.065,-0.465],
            [ 0.160,-0.395],
            [ 0.300,-0.250],
            [ 0.425,-0.080]
        ],
        [
            [ 0.425,-0.080],
            [ 0.555, 0.105],
            [ 0.565, 0.350],
            [ 0.405, 0.460]
        ],
        [
            [ 0.405, 0.460],
            [ 0.260, 0.560],
            [ 0.055, 0.500],
            [ 0.000, 0.280]
        ]
    ];

    const cubic = (p0, p1, p2, p3, t) => {
        const u = 1 - t;
        const a = u * u * u;
        const b = 3 * u * u * t;
        const c = 3 * u * t * t;
        const d = t * t * t;

        return new THREE.Vector2(
            a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
            a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]
        );
    };

    const raw = [];
    const perSegment = Math.max(16, Math.ceil(count / segments.length));

    segments.forEach((segment, segmentIndex) => {
        for (let i = 0; i <= perSegment; i++) {
            const t = i / perSegment;

            /*
             * Keep the shared joint only once, but do include the exact
             * end point of each Bézier segment. This avoids tiny straight
             * chords at the segment transitions, especially around the
             * lower heart tip where the curvature changes more quickly.
             */
            if (segmentIndex > 0 && i === 0) {
                continue;
            }

            raw.push(
                cubic(
                    segment[0],
                    segment[1],
                    segment[2],
                    segment[3],
                    t
                )
            );
        }
    });

    // Remove duplicated closing point if present.
    if (raw.length > 1) {
        const a = raw[0];
        const b = raw[raw.length - 1];
        if (a.distanceTo(b) < 1e-9) {
            raw.pop();
        }
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    raw.forEach(p => {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
    });

    const rawW = maxX - minX;
    const rawD = maxY - minY;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    const points = raw.map(p =>
        new THREE.Vector2(
            (p.x - cx) / rawW * width,
            (p.y - cy) / rawD * depth
        )
    );

    if (THREE.ShapeUtils.isClockWise(points)) {
        points.reverse();
    }

    return points;
}

function buildRows(start, end, step) {
    const rows = [start];
    let z = start + step;

    while (z < end - 1e-6) {
        rows.push(z);
        z += step;
    }

    if (Math.abs(rows[rows.length - 1] - end) > 1e-6) {
        rows.push(end);
    }

    return rows;
}

function makeOpenContainerMesh(outer2D, inner2D, height, bottom) {
    const n = outer2D.length;
    const vertices = [];
    const indices = [];

    const addVertex = (x, y, z) => {
        const i = vertices.length / 3;
        vertices.push(x, y, z);
        return i;
    };

    const addRing = (points, z) =>
        points.map(p => addVertex(p.x, p.y, z));

    const quad = (a, b, c, d) => {
        indices.push(a, b, c, a, c, d);
    };

    const outerRows = buildRows(0, height, 2.0);
    const innerRows = buildRows(bottom, height, 2.0);

    // Outer walls: keep their own vertices so normals stay independent.
    const outerRings = outerRows.map(z => addRing(outer2D, z));
    for (let j = 0; j < outerRings.length - 1; j++) {
        const a = outerRings[j];
        const b = outerRings[j + 1];

        for (let i = 0; i < n; i++) {
            const k = (i + 1) % n;
            quad(a[i], a[k], b[k], b[i]);
        }
    }

    // Inner walls: separate vertices as well.
    const innerRings = innerRows.map(z => addRing(inner2D, z));
    for (let j = 0; j < innerRings.length - 1; j++) {
        const a = innerRings[j];
        const b = innerRings[j + 1];

        for (let i = 0; i < n; i++) {
            const k = (i + 1) % n;
            quad(a[i], b[i], b[k], a[k]);
        }
    }

    // Exterior bottom face (normal down).
    const bottomOuter = addRing(outer2D, 0);
    addTriangulatedFace(outer2D, bottomOuter, indices, true);

    // Interior floor face (normal up).
    const floorInner = addRing(inner2D, bottom);
    addTriangulatedFace(inner2D, floorInner, indices, false);

    // Top rim bridge between outer and inner wall.
    const topOuter = addRing(outer2D, height);
    const topInner = addRing(inner2D, height);
    for (let i = 0; i < n; i++) {
        const k = (i + 1) % n;
        quad(topOuter[i], topOuter[k], topInner[k], topInner[i]);
    }

    return finishGeometry(vertices, indices);
}

function makeOpenBottomLidMesh(outer2D, inner2D, height, skirtHeight) {
    const n = outer2D.length;
    const vertices = [];
    const indices = [];

    const addVertex = (x, y, z) => {
        const i = vertices.length / 3;
        vertices.push(x, y, z);
        return i;
    };

    const addRing = (points, z) =>
        points.map(p => addVertex(p.x, p.y, z));

    const quad = (a, b, c, d) => {
        indices.push(a, b, c, a, c, d);
    };

    const outerRows = buildRows(0, height, 1.5);
    const innerRows = buildRows(0, skirtHeight, 1.5);

    // Outer wall shell.
    const outerRings = outerRows.map(z => addRing(outer2D, z));
    for (let j = 0; j < outerRings.length - 1; j++) {
        const a = outerRings[j];
        const b = outerRings[j + 1];

        for (let i = 0; i < n; i++) {
            const k = (i + 1) % n;
            quad(a[i], a[k], b[k], b[i]);
        }
    }

    // Inner skirt wall.
    const innerRings = innerRows.map(z => addRing(inner2D, z));
    for (let j = 0; j < innerRings.length - 1; j++) {
        const a = innerRings[j];
        const b = innerRings[j + 1];

        for (let i = 0; i < n; i++) {
            const k = (i + 1) % n;
            quad(a[i], b[i], b[k], a[k]);
        }
    }

    // Bottom opening rim / annulus (normal down).
    const bottomOuter = addRing(outer2D, 0);
    const bottomInner = addRing(inner2D, 0);
    for (let i = 0; i < n; i++) {
        const k = (i + 1) % n;
        quad(bottomOuter[i], bottomInner[i], bottomInner[k], bottomOuter[k]);
    }

    // Top exterior face (normal up).
    const outerTop = addRing(outer2D, height);
    addTriangulatedFace(outer2D, outerTop, indices, false);

    // Inner ceiling face (normal down).
    const innerCeiling = addRing(inner2D, skirtHeight);
    addTriangulatedFace(inner2D, innerCeiling, indices, true);

    return finishGeometry(vertices, indices);
}

function addTriangulatedFace(points, ring, indices, reverse) {
    const triangles = THREE.ShapeUtils.triangulateShape(points, []);

    triangles.forEach(tri => {
        if (reverse) {
            indices.push(ring[tri[2]], ring[tri[1]], ring[tri[0]]);
        } else {
            indices.push(ring[tri[0]], ring[tri[1]], ring[tri[2]]);
        }
    });
}

function finishGeometry(vertices, indices) {
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

function material(color) {
    return new THREE.MeshStandardMaterial({
        color,
        roughness: 0.58,
        metalness: 0.02,
        side: THREE.FrontSide
    });
}

function updateResults(d) {
    E['outer-width'].textContent = `${fmt(d.outerW)} mm`;
    E['outer-depth'].textContent = `${fmt(d.outerD)} mm`;
    E['outer-height'].textContent = `${fmt(d.holderH)} mm`;
}

function downloadBox() {
    if (!boxMesh) {
        msg(T.first, 'error');
        return;
    }

    const a = params();

    exportSTL(
        boxMesh,
        `vekmaker-heart-box-${a.width}x${a.height}mm.stl`,
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
    const lid = lidMesh.clone(true);

    lid.position.set(0, 0, 0);
    lid.updateMatrix();
    lid.updateMatrixWorld(true);

    exportSTL(
        lid,
        `vekmaker-heart-box-lid-${a.width}mm.stl`,
        {
            rotateForPrint: false,
            centerXY: true,
            placeOnBed: true
        }
    );

    msg(T.lid, 'success');
}

function fitCamera(a, d) {
    const gap = Math.max(14, a.width * 0.15);
    const fullW = d.outerW + d.lidOuterW + gap;
    const size = Math.max(fullW, d.outerD, d.holderH);
    const dist = size * 1.65;

    camera.position.set(
        dist * 0.82,
        -dist,
        dist * 0.62
    );

    camera.near = Math.max(0.1, dist / 100);
    camera.far = Math.max(5000, dist * 20);
    camera.updateProjectionMatrix();

    controls.target.set(
        d.lidOuterW * 0.3,
        0,
        d.holderH * 0.4
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
