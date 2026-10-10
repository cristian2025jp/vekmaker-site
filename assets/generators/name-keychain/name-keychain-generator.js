import * as THREE from '../../libs/three/three.module.js';
import { OrbitControls } from '../../libs/three/OrbitControls.js';
import { FontLoader } from '../../libs/three/FontLoader.js';
import { TTFLoader } from '../../libs/three/TTFLoader.js';
import { TextGeometry } from '../../libs/three/TextGeometry.js';
import { exportSTL } from '../../js/core/stl-exporter.js';

const LANG = ['en', 'pt', 'ja'].includes(document.documentElement.lang)
    ? document.documentElement.lang
    : 'en';

const T = {
    en: {
        ok: 'Keychain generated successfully.',
        loading: 'Loading font...',
        first: 'Generate the keychain before downloading.',
        base: 'Base STL downloaded successfully.',
        relief: 'Text and symbol STL downloaded successfully.',
        combined: 'Combined keychain STL downloaded successfully.',
        empty: 'Enter a name or short text.',
        long: 'Use no more than 16 characters.',
        unsupportedLatin: 'Use Latin letters, numbers and common punctuation only.',
        unsupportedHiragana: 'Hiragana mode supports hiragana, numbers and common punctuation only.',
        unsupportedKatakana: 'Katakana mode supports katakana, numbers and common punctuation only.',
        fontFail: 'The font could not be loaded.'
    },
    pt: {
        ok: 'Chaveiro gerado com sucesso.',
        loading: 'Carregando fonte...',
        first: 'Gere o chaveiro antes de baixar.',
        base: 'STL da base baixado com sucesso.',
        relief: 'STL do texto e símbolo baixado com sucesso.',
        combined: 'STL completo do chaveiro baixado com sucesso.',
        empty: 'Digite um nome ou texto curto.',
        long: 'Use no máximo 16 caracteres.',
        unsupportedLatin: 'Use apenas letras latinas, números e pontuação comum.',
        unsupportedHiragana: 'O modo Hiragana aceita hiragana, números e pontuação comum.',
        unsupportedKatakana: 'O modo Katakana aceita katakana, números e pontuação comum.',
        fontFail: 'Não foi possível carregar a fonte.'
    },
    ja: {
        ok: 'ネームキーホルダーを生成しました。',
        loading: 'フォントを読み込み中...',
        first: 'ダウンロードする前にキーホルダーを生成してください。',
        base: 'ベースSTLをダウンロードしました。',
        relief: '文字とシンボルのSTLをダウンロードしました。',
        combined: 'キーホルダー全体のSTLをダウンロードしました。',
        empty: '名前または短いテキストを入力してください。',
        long: '16文字以内で入力してください。',
        unsupportedLatin: 'ラテン文字、数字、一般的な記号のみ使用できます。',
        unsupportedHiragana: 'ひらがなモードでは、ひらがな・数字・一般的な記号を使用できます。',
        unsupportedKatakana: 'カタカナモードでは、カタカナ・数字・一般的な記号を使用できます。',
        fontFail: 'フォントを読み込めませんでした。'
    }
}[LANG];

const LATIN_FONT_URL = '/assets/libs/three/fonts/noto-sans-latin-portuguese.ttf';
const KANA_FONT_URL = '/assets/libs/three/fonts/noto-sans-jp-kana.otf';

const PLATE_HEIGHT = 30;
const BASE_THICKNESS = 3;
const RELIEF_HEIGHT = 1;
const CORNER_RADIUS = 5;
const HOLE_DIAMETER = 5;
const HOLE_MARGIN_X = 8.2;
const MIN_WIDTH = 72;
const MAX_WIDTH = 138;
const SYMBOL_BOX = 18;
const SIDE_MARGIN = 6;
const TEXT_SYMBOL_GAP = 3.5;
const RELIEF_Z = BASE_THICKNESS;

const FONT_STYLES = {
    bold:    { label: 'Rounded Bold', targetHeight: 16.6, xScale: 1.00, bevelSize: 0.34, bevelThickness: 0.20, letterSpacing: 0.0, playful: false },
    soft:    { label: 'Rounded Soft', targetHeight: 15.6, xScale: 0.94, bevelSize: 0.42, bevelThickness: 0.22, letterSpacing: 0.2, playful: false },
    playful: { label: 'Rounded Playful', targetHeight: 16.0, xScale: 1.00, bevelSize: 0.38, bevelThickness: 0.22, letterSpacing: 0.35, playful: true },
    japanese: { label: 'Japanese', targetHeight: 15.2, xScale: 1.00, bevelSize: 0.24, bevelThickness: 0.16, letterSpacing: 0.15, playful: false }
};

const E = {};
let scene, camera, renderer, controls;
let root = null;
let baseGroup = null;
let reliefGroup = null;
const loadedFonts = new Map();
const loadPromises = new Map();
let generationToken = 0;

const COLORS = {
    base: 0xf59e0b,
    relief: 0xf8fafc
};

document.addEventListener('DOMContentLoaded', () => {
    [
        'preview', 'text', 'character-set', 'font', 'symbol', 'symbol-position',
        'plate-width', 'text-size', 'message',
        'download-base', 'download-relief', 'download-combined'
    ].forEach(key => E[key] = document.getElementById('nk-' + key));

    if (!E.preview) return;
    initPreview();
    bind();
    updateFontOptions();
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
    key.position.set(120, -160, 160);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.45);
    fill.position.set(-120, 100, 90);
    scene.add(fill);

    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(E.preview);
    else window.addEventListener('resize', resize);
    resize();
    animate();
}

function bind() {
    ['text', 'font', 'symbol', 'symbol-position'].forEach(key => {
        E[key]?.addEventListener('input', generate);
        E[key]?.addEventListener('change', generate);
    });
    E['character-set']?.addEventListener('change', () => {
        updateFontOptions();
        generate();
    });
    E['download-base']?.addEventListener('click', downloadBase);
    E['download-relief']?.addEventListener('click', downloadRelief);
    E['download-combined']?.addEventListener('click', downloadCombined);
}

function params() {
    return {
        text: String(E.text?.value || '').trim(),
        characterSet: E['character-set']?.value || 'latin',
        font: E.font?.value || 'bold',
        symbol: E.symbol?.value || 'heart',
        symbolPosition: E['symbol-position']?.value || 'left'
    };
}

function validate(a) {
    if (!a.text) return T.empty;
    if (Array.from(a.text).length > 16) return T.long;

    const chars = Array.from(a.text);
    if (a.characterSet === 'hiragana') {
        const invalid = chars.some(ch => {
            if (/[\s0-9A-Za-zー・。、「」！？!?,.'’\-&]/u.test(ch)) return false;
            const cp = ch.codePointAt(0);
            return !(cp >= 0x3041 && cp <= 0x309f);
        });
        if (invalid) return T.unsupportedHiragana;
    } else if (a.characterSet === 'katakana') {
        const invalid = chars.some(ch => {
            if (/[\s0-9A-Za-zー・。、「」！？!?,.'’\-&]/u.test(ch)) return false;
            const cp = ch.codePointAt(0);
            return !(cp >= 0x30a1 && cp <= 0x30ff);
        });
        if (invalid) return T.unsupportedKatakana;
    } else if (!/^[A-Za-zÀ-ÖØ-öø-ÿ0-9 .,'’\-!&]+$/u.test(a.text)) {
        return T.unsupportedLatin;
    }
    return '';
}

function updateFontOptions() {
    if (!E.font) return;
    const set = E['character-set']?.value || 'latin';
    const current = E.font.value;
    E.font.replaceChildren();

    if (set === 'latin') {
        [
            ['bold', 'Rounded Bold'],
            ['soft', 'Rounded Soft'],
            ['playful', 'Rounded Playful']
        ].forEach(([value, label]) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            E.font.appendChild(option);
        });
        E.font.value = ['bold', 'soft', 'playful'].includes(current) ? current : 'bold';
        E.font.disabled = false;
    } else {
        const option = document.createElement('option');
        option.value = 'japanese';
        option.textContent = 'Japanese';
        E.font.appendChild(option);
        E.font.value = 'japanese';
        E.font.disabled = true;
    }
}

async function loadFont(characterSet) {
    const key = characterSet === 'latin' ? 'latin' : 'kana';
    if (loadedFonts.has(key)) return loadedFonts.get(key);
    if (loadPromises.has(key)) return loadPromises.get(key);

    const promise = new Promise((resolve, reject) => {
        const ttf = new TTFLoader();
        ttf.reversed = key === 'kana';
        const url = key === 'kana' ? KANA_FONT_URL : LATIN_FONT_URL;
        ttf.load(
            url,
            json => {
                try {
                    const font = new FontLoader().parse(json);
                    loadedFonts.set(key, font);
                    resolve(font);
                } catch (err) { reject(err); }
            },
            undefined,
            reject
        );
    });
    loadPromises.set(key, promise);
    return promise;
}

async function generate() {
    const token = ++generationToken;
    const a = params();
    const error = validate(a);
    if (error) {
        msg(error, 'error');
        enableDownloads(false);
        return;
    }

    msg(T.loading, '');
    enableDownloads(false);

    try {
        const font = await loadFont(a.characterSet);
        if (token !== generationToken) return;

        const layout = calculateLayout(a, font);
        removeModel();

        baseGroup = makeBase(layout);
        reliefGroup = makeRelief(a, layout, font);

        root = new THREE.Group();
        root.add(cloneColored(baseGroup, COLORS.base));
        root.add(cloneColored(reliefGroup, COLORS.relief));
        scene.add(root);

        E['plate-width'].textContent = `${fmt(layout.width)} mm`;
        E['text-size'].textContent = `${fmt(layout.fontSize)} mm`;
        fitCamera(layout);
        msg(T.ok, 'success');
        enableDownloads(true);
    } catch (err) {
        console.error(err);
        msg(T.fontFail, 'error');
        enableDownloads(false);
    }
}

function calculateLayout(a, font) {
    const style = a.characterSet === 'latin'
        ? (FONT_STYLES[a.font] || FONT_STYLES.bold)
        : FONT_STYLES.japanese;
    let fontSize = style.targetHeight;
    let measured = measureText(font, a.text, fontSize, style);

    // Layout reserves one symbol zone and an integrated eyelet zone on the left.
    const fixedSpace = SIDE_MARGIN * 2 + SYMBOL_BOX + TEXT_SYMBOL_GAP + 13;
    let width = clamp(measured.width + fixedSpace, MIN_WIDTH, MAX_WIDTH);

    if (measured.width + fixedSpace > MAX_WIDTH) {
        const targetTextWidth = MAX_WIDTH - fixedSpace;
        const scale = targetTextWidth / Math.max(measured.width, 1);
        fontSize = Math.max(9.5, fontSize * scale);
        measured = measureText(font, a.text, fontSize, style);
        width = MAX_WIDTH;
    }

    const eyeletX = -width / 2 + HOLE_MARGIN_X;
    const contentLeft = -width / 2 + 17;
    const contentRight = width / 2 - SIDE_MARGIN;

    let symbolX;
    let textCenterX;
    let textAvailable;
    if (a.symbolPosition === 'right') {
        symbolX = contentRight - SYMBOL_BOX / 2;
        const textLeft = contentLeft;
        const textRight = symbolX - SYMBOL_BOX / 2 - TEXT_SYMBOL_GAP;
        textCenterX = (textLeft + textRight) / 2;
        textAvailable = textRight - textLeft;
    } else {
        symbolX = contentLeft + SYMBOL_BOX / 2;
        const textLeft = symbolX + SYMBOL_BOX / 2 + TEXT_SYMBOL_GAP;
        const textRight = contentRight;
        textCenterX = (textLeft + textRight) / 2;
        textAvailable = textRight - textLeft;
    }

    // Final safety shrink if actual glyph width still exceeds its content area.
    if (measured.width > textAvailable) {
        const scale = textAvailable / Math.max(measured.width, 1);
        fontSize = Math.max(8.5, fontSize * scale);
        measured = measureText(font, a.text, fontSize, style);
    }

    return {
        width,
        height: PLATE_HEIGHT,
        fontSize,
        style,
        textWidth: measured.width,
        textHeight: measured.height,
        textCenterX,
        symbolX,
        eyeletX,
        symbolSize: 12.5
    };
}

function measureText(font, text, fontSize, style) {
    if (style.playful) {
        let width = 0;
        let maxHeight = 0;
        for (const ch of Array.from(text)) {
            const g = makeTextGeometry(font, ch, fontSize, style);
            g.computeBoundingBox();
            const b = g.boundingBox;
            const w = b ? (b.max.x - b.min.x) * style.xScale : fontSize * 0.6;
            const h = b ? (b.max.y - b.min.y) : fontSize;
            width += w + style.letterSpacing;
            maxHeight = Math.max(maxHeight, h);
            g.dispose();
        }
        return { width: Math.max(1, width - style.letterSpacing), height: maxHeight };
    }

    const g = makeTextGeometry(font, text, fontSize, style);
    g.scale(style.xScale, 1, 1);
    g.computeBoundingBox();
    const b = g.boundingBox;
    const result = {
        width: b ? b.max.x - b.min.x : fontSize,
        height: b ? b.max.y - b.min.y : fontSize
    };
    g.dispose();
    return result;
}

function makeTextGeometry(font, text, size, style) {
    // Set both `depth` and legacy `height` so the text extrusion is always
    // exactly the configured 1 mm regardless of the local Three.js build.
    // Bevel is disabled because it adds extra thickness beyond the nominal
    // extrusion height and the V1 specification fixes relief at 1.0 mm.
    return new TextGeometry(text, {
        font,
        size,
        depth: RELIEF_HEIGHT,
        height: RELIEF_HEIGHT,
        curveSegments: 16,
        bevelEnabled: false
    });
}

function makeBase(layout) {
    const group = new THREE.Group();
    const shape = plateShape(layout.width, PLATE_HEIGHT, CORNER_RADIUS);
    const hole = new THREE.Path();
    hole.absarc(layout.eyeletX, 0, HOLE_DIAMETER / 2, 0, Math.PI * 2, true);
    shape.holes.push(hole);

    const g = new THREE.ExtrudeGeometry(shape, {
        depth: BASE_THICKNESS,
        bevelEnabled: false,
        curveSegments: 28
    });
    group.add(new THREE.Mesh(g));
    return group;
}

function plateShape(width, height, radius) {
    const w = width / 2;
    const h = height / 2;
    const r = radius;
    const s = new THREE.Shape();

    // Distinct silhouette: a softly rounded rectangular tag with a fuller left end.
    s.moveTo(-w + 8, -h);
    s.lineTo(w - r, -h);
    s.quadraticCurveTo(w, -h, w, -h + r);
    s.lineTo(w, h - r);
    s.quadraticCurveTo(w, h, w - r, h);
    s.lineTo(-w + 8, h);
    s.bezierCurveTo(-w + 1, h, -w, h * 0.55, -w, 0);
    s.bezierCurveTo(-w, -h * 0.55, -w + 1, -h, -w + 8, -h);
    s.closePath();
    return s;
}

function makeRelief(a, layout, font) {
    const group = new THREE.Group();
    addText(group, a, layout, font);
    addSymbol(group, a.symbol, layout.symbolX, 0, layout.symbolSize);
    group.position.z = RELIEF_Z;
    return group;
}

function addText(group, a, layout, font) {
    const style = layout.style;

    if (!style.playful) {
        const g = makeTextGeometry(font, a.text, layout.fontSize, style);
        g.scale(style.xScale, 1, 1);
        g.computeBoundingBox();
        const b = g.boundingBox;
        const cx = b ? (b.min.x + b.max.x) / 2 : 0;
        const cy = b ? (b.min.y + b.max.y) / 2 : 0;
        g.translate(layout.textCenterX - cx, -cy, 0);
        group.add(new THREE.Mesh(g));
        return;
    }

    const chars = Array.from(a.text);
    const pieces = [];
    let total = 0;
    chars.forEach((ch, i) => {
        const g = makeTextGeometry(font, ch, layout.fontSize, style);
        g.computeBoundingBox();
        const b = g.boundingBox;
        const w = b ? b.max.x - b.min.x : layout.fontSize * 0.6;
        const h = b ? b.max.y - b.min.y : layout.fontSize;
        pieces.push({ g, w, h, i, minX: b?.min.x || 0, minY: b?.min.y || 0 });
        total += w + (i < chars.length - 1 ? style.letterSpacing : 0);
    });

    let x = layout.textCenterX - total / 2;
    pieces.forEach(p => {
        const mesh = new THREE.Mesh(p.g);
        const wobble = Math.sin((p.i + 1) * 1.7) * 0.7;
        mesh.position.set(x - p.minX, -p.minY - p.h / 2 + wobble, 0);
        mesh.rotation.z = Math.sin((p.i + 2) * 1.3) * 0.035;
        group.add(mesh);
        x += p.w + style.letterSpacing;
    });
}

function addSymbol(group, name, x, y, size) {
    if (name === 'paw') {
        const pad = circleExtrude(size * 0.22, RELIEF_HEIGHT);
        pad.scale.set(1.18, 0.90, 1);
        pad.position.set(x, y - size * 0.10, 0);
        group.add(pad);
        const offsets = [
            [-0.28, 0.22], [-0.10, 0.35], [0.12, 0.35], [0.30, 0.20]
        ];
        offsets.forEach(([ox, oy], i) => {
            const toe = circleExtrude(size * (i === 0 || i === 3 ? 0.095 : 0.105), RELIEF_HEIGHT);
            toe.position.set(x + size * ox, y + size * oy, 0);
            group.add(toe);
        });
        return;
    }

    if (name === 'clover') {
        [[-0.18,0.18],[0.18,0.18],[-0.18,-0.18],[0.18,-0.18]].forEach(([ox,oy]) => {
            const leaf = circleExtrude(size * 0.22, RELIEF_HEIGHT);
            leaf.position.set(x + size*ox, y + size*oy, 0);
            group.add(leaf);
        });
        const stem = new THREE.Mesh(new THREE.BoxGeometry(size*0.12, size*0.34, RELIEF_HEIGHT));
        stem.position.set(x + size*0.08, y - size*0.38, RELIEF_HEIGHT/2);
        stem.rotation.z = -0.35;
        group.add(stem);
        return;
    }

    const shape = symbolShape(name, size);
    const g = new THREE.ExtrudeGeometry(shape, {
        depth: RELIEF_HEIGHT,
        bevelEnabled: false,
        curveSegments: 18
    });
    g.translate(x, y, 0);
    group.add(new THREE.Mesh(g));
}

function symbolShape(name, size) {
    switch (name) {
        case 'star': return starShape(size * 0.48, size * 0.22, 5);
        case 'flower': return flowerShape(size * 0.47, 6);
        case 'moon': return moonShape(size * 0.46);
        case 'lightning': return lightningShape(size * 0.50);
        default: return heartShape(size * 0.50);
    }
}

function heartShape(r) {
    const s = new THREE.Shape();
    const x = 0, y = -r * 0.12;
    s.moveTo(x, y - r * 0.72);
    s.bezierCurveTo(x - r * 1.15, y - r * 0.02, x - r * 0.82, y + r * 0.82, x - r * 0.38, y + r * 0.72);
    s.bezierCurveTo(x - r * 0.08, y + r * 0.66, x, y + r * 0.44, x, y + r * 0.34);
    s.bezierCurveTo(x, y + r * 0.44, x + r * 0.08, y + r * 0.66, x + r * 0.38, y + r * 0.72);
    s.bezierCurveTo(x + r * 0.82, y + r * 0.82, x + r * 1.15, y - r * 0.02, x, y - r * 0.72);
    s.closePath();
    return s;
}

function starShape(ro, ri, points) {
    const s = new THREE.Shape();
    for (let i = 0; i < points * 2; i++) {
        const a = Math.PI / 2 + i * Math.PI / points;
        const r = i % 2 === 0 ? ro : ri;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
    }
    s.closePath();
    return s;
}

function flowerShape(r, petals) {
    const s = new THREE.Shape();
    const steps = petals * 12;
    for (let i = 0; i <= steps; i++) {
        const a = i / steps * Math.PI * 2;
        const rr = r * (0.72 + 0.28 * Math.cos(petals * a));
        const x = Math.cos(a) * rr;
        const y = Math.sin(a) * rr;
        if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
    }
    s.closePath();
    return s;
}

function moonShape(r) {
    // Single-outline crescent to avoid boolean operations.
    const s = new THREE.Shape();
    const pts = [];
    for (let i = 0; i <= 24; i++) {
        const a = Math.PI / 2 + (Math.PI * 2 - Math.PI / 2) * (i / 24);
        pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    for (let i = 24; i >= 0; i--) {
        const a = Math.PI / 2 + (Math.PI * 2 - Math.PI / 2) * (i / 24);
        pts.push([Math.cos(a) * r * 0.68 + r * 0.34, Math.sin(a) * r * 0.68]);
    }
    pts.forEach(([x,y], i) => i === 0 ? s.moveTo(x,y) : s.lineTo(x,y));
    s.closePath();
    return s;
}

function lightningShape(r) {
    const s = new THREE.Shape();
    const p = [
        [-0.10,0.95],[-0.62,0.14],[-0.18,0.14],[-0.48,-0.92],[0.62,0.14],[0.16,0.14],[0.48,0.95]
    ];
    p.forEach(([x,y], i) => i === 0 ? s.moveTo(x*r,y*r) : s.lineTo(x*r,y*r));
    s.closePath();
    return s;
}

function circleExtrude(radius, depth) {
    const g = new THREE.CylinderGeometry(radius, radius, depth, 28);
    g.rotateX(Math.PI / 2);
    g.translate(0, 0, depth / 2);
    return new THREE.Mesh(g);
}

function cloneColored(source, color) {
    const clone = source.clone(true);
    clone.traverse(o => {
        if (!o.isMesh) return;
        o.geometry = o.geometry.clone();
        o.material = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.58,
            metalness: 0.02,
            side: THREE.DoubleSide
        });
    });
    return clone;
}

function downloadBase() {
    if (!baseGroup) return msg(T.first, 'error');
    const a = params();
    const obj = baseGroup.clone(true);
    obj.updateMatrix(); obj.updateMatrixWorld(true);
    exportSTL(obj, `vekmaker-name-keychain-base-${safeName(a.text)}.stl`, {
        rotateForPrint: false, centerXY: true, placeOnBed: true
    });
    msg(T.base, 'success');
}

function downloadRelief() {
    if (!reliefGroup) return msg(T.first, 'error');
    const a = params();
    const obj = reliefGroup.clone(true);
    obj.position.z = 0;
    obj.updateMatrix(); obj.updateMatrixWorld(true);
    exportSTL(obj, `vekmaker-name-keychain-text-symbol-${safeName(a.text)}.stl`, {
        rotateForPrint: false, centerXY: true, placeOnBed: true
    });
    msg(T.relief, 'success');
}

function downloadCombined() {
    if (!baseGroup || !reliefGroup) return msg(T.first, 'error');
    const a = params();
    const obj = new THREE.Group();
    obj.add(baseGroup.clone(true));
    obj.add(reliefGroup.clone(true));
    obj.updateMatrix(); obj.updateMatrixWorld(true);
    exportSTL(obj, `vekmaker-name-keychain-${safeName(a.text)}.stl`, {
        rotateForPrint: false, centerXY: true, placeOnBed: true
    });
    msg(T.combined, 'success');
}

function enableDownloads(enabled) {
    ['download-base','download-relief','download-combined'].forEach(k => {
        if (E[k]) E[k].disabled = !enabled;
    });
}

function fitCamera(layout) {
    const size = Math.max(layout.width, 58);
    const dist = size * 1.55;
    camera.position.set(dist * 0.68, -dist, dist * 0.72);
    camera.near = 0.1;
    camera.far = 5000;
    camera.updateProjectionMatrix();
    controls.target.set(0, 0, BASE_THICKNESS * 0.6);
    controls.update();
}

function removeModel() {
    if (!root) return;
    scene.remove(root);
    root.traverse(o => {
        if (!o.isMesh) return;
        o.geometry?.dispose();
        if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
        else o.material?.dispose();
    });
    root = null;
    baseGroup = null;
    reliefGroup = null;
}

function msg(text, type = '') {
    E.message.textContent = text;
    E.message.className = 'validation-message';
    if (type) E.message.classList.add(type);
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

function safeName(value) {
    return String(value || 'name').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'name';
}
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function fmt(v) { return Number(v).toFixed(1).replace(/\.0$/, ''); }
