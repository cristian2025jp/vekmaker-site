import * as THREE from '../../libs/three/three.module.js';
import { OrbitControls } from '../../libs/three/OrbitControls.js';
import { FontLoader } from '../../libs/three/FontLoader.js';
import { TTFLoader } from '../../libs/three/TTFLoader.js';
import { TextGeometry } from '../../libs/three/TextGeometry.js';
import { exportSTL } from '../../js/core/stl-exporter.js';

const MODEL_COLOR = 0x3b82f6;

const NAME_PLATE_I18N = {
en:{previewMissing:'Name plate preview container was not found.',enterText:'Enter text for the name plate.',maxChars:'Text must contain no more than 24 characters.',kanaOnly:'Japanese mode supports hiragana and katakana only. Kanji is not supported.',latinOnly:'Latin mode supports English and Portuguese characters only.',widthRange:'Plate width must be between 30 mm and 300 mm.',heightRange:'Plate height must be between 15 mm and 150 mm.',baseRange:'Base thickness must be between 1 mm and 20 mm.',textHeightRange:'Text height must be between 0.4 mm and 10 mm.',fontSizeRange:'Font size must be between 5 mm and 80 mm.',cornerRadius:max=>`Corner radius must be between 0 mm and ${max} mm.`,holesValid:'Select a valid number of mounting holes.',holeRange:'Hole diameter must be between 1 mm and 20 mm.',holeTooLarge:'Hole diameter is too large for the plate height.',loading:'Loading font...',generated:'Name plate generated successfully.',fontError:'The selected font could not be loaded.',generateFirst:'Generate the name plate before downloading.',downloaded:'STL downloaded successfully.'},
pt:{previewMissing:'A área de visualização da placa não foi encontrada.',enterText:'Digite um texto para a placa.',maxChars:'O texto deve ter no máximo 24 caracteres.',kanaOnly:'O modo Japonês aceita apenas hiragana e katakana. Kanji não é suportado.',latinOnly:'O modo Latino aceita apenas caracteres do inglês e do português.',widthRange:'A largura da placa deve estar entre 30 mm e 300 mm.',heightRange:'A altura da placa deve estar entre 15 mm e 150 mm.',baseRange:'A espessura da base deve estar entre 1 mm e 20 mm.',textHeightRange:'A altura do relevo do texto deve estar entre 0,4 mm e 10 mm.',fontSizeRange:'O tamanho da fonte deve estar entre 5 mm e 80 mm.',cornerRadius:max=>`O raio dos cantos deve estar entre 0 mm e ${max} mm.`,holesValid:'Selecione uma quantidade válida de furos de fixação.',holeRange:'O diâmetro do furo deve estar entre 1 mm e 20 mm.',holeTooLarge:'O diâmetro do furo é muito grande para a altura da placa.',loading:'Carregando fonte...',generated:'Placa gerada com sucesso.',fontError:'Não foi possível carregar a fonte selecionada.',generateFirst:'Gere a placa antes de baixar.',downloaded:'STL baixado com sucesso.'},
ja:{previewMissing:'ネームプレートのプレビュー領域が見つかりません。',enterText:'ネームプレートの文字を入力してください。',maxChars:'文字数は24文字以内にしてください。',kanaOnly:'日本語モードはひらがなとカタカナのみに対応しています。漢字には対応していません。',latinOnly:'ラテン文字モードは英語とポルトガル語の文字のみに対応しています。',widthRange:'プレート幅は30 mmから300 mmの範囲で指定してください。',heightRange:'プレート高さは15 mmから150 mmの範囲で指定してください。',baseRange:'ベース厚さは1 mmから20 mmの範囲で指定してください。',textHeightRange:'文字の高さは0.4 mmから10 mmの範囲で指定してください。',fontSizeRange:'フォントサイズは5 mmから80 mmの範囲で指定してください。',cornerRadius:max=>`角の半径は0 mmから${max} mmの範囲で指定してください。`,holesValid:'有効な取付穴の数を選択してください。',holeRange:'穴の直径は1 mmから20 mmの範囲で指定してください。',holeTooLarge:'穴の直径がプレート高さに対して大きすぎます。',loading:'フォントを読み込んでいます...',generated:'ネームプレートを生成しました。',fontError:'選択したフォントを読み込めませんでした。',generateFirst:'ダウンロードする前にネームプレートを生成してください。',downloaded:'STLをダウンロードしました。'}
};
const NAME_PLATE_LANG=['en','pt','ja'].includes(document.documentElement.lang)?document.documentElement.lang:'en';
const NAME_PLATE_TEXT=NAME_PLATE_I18N[NAME_PLATE_LANG];
const LATIN_FONT_URL =
    '/assets/libs/three/fonts/noto-sans-latin-portuguese.ttf';
const KANA_FONT_URL =
    '/assets/libs/three/fonts/noto-sans-jp-kana.otf';

const fonts = new Map();
const elements = {};

let scene;
let camera;
let renderer;
let controls;
let modelGroup = null;
let resizeObserver = null;
let generationToken = 0;

document.addEventListener('DOMContentLoaded', () => {
    cacheElements();

    if (!elements.preview) {
        console.error(NAME_PLATE_TEXT.previewMissing);
        return;
    }

    initPreview();
    bindEvents();
    updateHoleControls();
    generateNamePlate();
});

function cacheElements() {
    elements.preview = document.getElementById('name-plate-preview');
    elements.text = document.getElementById('name-plate-text');
    elements.characterSet = document.getElementById(
        'name-plate-character-set'
    );
    elements.width = document.getElementById('name-plate-width');
    elements.height = document.getElementById('name-plate-height');
    elements.baseThickness = document.getElementById(
        'name-plate-base-thickness'
    );
    elements.textHeight = document.getElementById(
        'name-plate-text-height'
    );
    elements.fontSize = document.getElementById('name-plate-font-size');
    elements.cornerRadius = document.getElementById(
        'name-plate-corner-radius'
    );
    elements.holeCount = document.getElementById(
        'name-plate-hole-count'
    );
    elements.holeDiameter = document.getElementById(
        'name-plate-hole-diameter'
    );
    elements.validationMessage = document.getElementById(
        'name-plate-validation-message'
    );
    elements.generateButton = document.getElementById(
        'generate-name-plate'
    );
    elements.downloadButton = document.getElementById(
        'download-name-plate'
    );
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

    scene.add(new THREE.AmbientLight(0xffffff, 1.5));

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.25);
    mainLight.position.set(100, 160, 120);
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.55);
    fillLight.position.set(-100, 60, -80);
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
        elements.text,
        elements.characterSet,
        elements.width,
        elements.height,
        elements.baseThickness,
        elements.textHeight,
        elements.fontSize,
        elements.cornerRadius,
        elements.holeCount,
        elements.holeDiameter
    ].forEach((element) => {
        element?.addEventListener('input', handleInput);
        element?.addEventListener('change', handleInput);
    });

    elements.generateButton?.addEventListener(
        'click',
        generateNamePlate
    );

    elements.downloadButton?.addEventListener(
        'click',
        downloadNamePlateSTL
    );
}

function handleInput() {
    updateHoleControls();
    generateNamePlate();
}

function updateHoleControls() {
    const holeCount = Number.parseInt(elements.holeCount?.value, 10);
    if (elements.holeDiameter) {
        elements.holeDiameter.disabled = holeCount === 0;
    }
}

function readParameters() {
    return {
        text: String(elements.text?.value || '').trim(),
        characterSet: elements.characterSet?.value || 'latin',
        width: Number(elements.width?.value),
        height: Number(elements.height?.value),
        baseThickness: Number(elements.baseThickness?.value),
        textHeight: Number(elements.textHeight?.value),
        fontSize: Number(elements.fontSize?.value),
        cornerRadius: Number(elements.cornerRadius?.value),
        holeCount: Number.parseInt(elements.holeCount?.value, 10),
        holeDiameter: Number(elements.holeDiameter?.value)
    };
}

function validateParameters(params) {
    if (!params.text) {
        return NAME_PLATE_TEXT.enterText;
    }

    if (params.text.length > 24) {
        return NAME_PLATE_TEXT.maxChars;
    }

    if (containsUnsupportedScript(params.text, params.characterSet)) {
        return params.characterSet === 'kana'
            ? NAME_PLATE_TEXT.kanaOnly
            : NAME_PLATE_TEXT.latinOnly;
    }

    if (!isBetween(params.width, 30, 300)) {
        return NAME_PLATE_TEXT.widthRange;
    }

    if (!isBetween(params.height, 15, 150)) {
        return NAME_PLATE_TEXT.heightRange;
    }

    if (!isBetween(params.baseThickness, 1, 20)) {
        return NAME_PLATE_TEXT.baseRange;
    }

    if (!isBetween(params.textHeight, 0.4, 10)) {
        return NAME_PLATE_TEXT.textHeightRange;
    }

    if (!isBetween(params.fontSize, 5, 80)) {
        return NAME_PLATE_TEXT.fontSizeRange;
    }

    const maximumRadius = Math.min(params.width, params.height) / 2;
    if (
        !Number.isFinite(params.cornerRadius) ||
        params.cornerRadius < 0 ||
        params.cornerRadius > maximumRadius
    ) {
        return NAME_PLATE_TEXT.cornerRadius(formatNumber(maximumRadius));
    }

    if (![0, 1, 2].includes(params.holeCount)) {
        return NAME_PLATE_TEXT.holesValid;
    }

    if (
        params.holeCount > 0 &&
        !isBetween(params.holeDiameter, 1, 20)
    ) {
        return NAME_PLATE_TEXT.holeRange;
    }

    if (
        params.holeCount > 0 &&
        params.holeDiameter >= params.height - 4
    ) {
        return NAME_PLATE_TEXT.holeTooLarge;
    }

    return '';
}

function containsUnsupportedScript(text, characterSet) {
    const characters = Array.from(text);

    if (characterSet === 'kana') {
        return characters.some((character) => {
            if (/[\s0-9A-Za-zー・。、「」！？]/u.test(character)) {
                return false;
            }

            const code = character.codePointAt(0);
            const isHiragana = code >= 0x3041 && code <= 0x309f;
            const isKatakana = code >= 0x30a1 && code <= 0x30ff;

            return !isHiragana && !isKatakana;
        });
    }

    return characters.some((character) => {
        return !/[A-Za-zÀ-ÖØ-öø-ÿ0-9\s.,!?'"()\-_/:[\]@#&+%°ºª]/u.test(
            character
        );
    });
}

async function generateNamePlate() {
    const token = ++generationToken;
    const params = readParameters();
    const error = validateParameters(params);

    if (error) {
        setValidationMessage(error, 'error');
        setDownloadEnabled(false);
        return false;
    }

    setValidationMessage(NAME_PLATE_TEXT.loading, '');
    setDownloadEnabled(false);

    try {
        const font = await loadFont(params.characterSet);

        if (token !== generationToken) {
            return false;
        }

        removeCurrentModel();

        const baseGeometry = createBaseGeometry(params);
        const textGeometry = createTextGeometry(font, params);

        const material = new THREE.MeshStandardMaterial({
            color: MODEL_COLOR,
            roughness: 0.58,
            metalness: 0.04,
            side: THREE.DoubleSide
        });

        const baseMesh = new THREE.Mesh(baseGeometry, material);
        const textMesh = new THREE.Mesh(textGeometry, material);

        modelGroup = new THREE.Group();
        modelGroup.add(baseMesh);
        modelGroup.add(textMesh);
        scene.add(modelGroup);

        fitCamera(params);
        setValidationMessage(
            NAME_PLATE_TEXT.generated,
            'success'
        );
        setDownloadEnabled(true);

        return true;
    } catch (fontError) {
        console.error(fontError);
        setValidationMessage(
            NAME_PLATE_TEXT.fontError,
            'error'
        );
        setDownloadEnabled(false);
        return false;
    }
}

function loadFont(characterSet) {
    if (fonts.has(characterSet)) {
        return Promise.resolve(fonts.get(characterSet));
    }

    const fontUrl =
        characterSet === 'kana' ? KANA_FONT_URL : LATIN_FONT_URL;

    return new Promise((resolve, reject) => {
        const ttfLoader = new TTFLoader();

        /*
         * The Japanese subset uses the opposite contour winding direction
         * from the Latin subset. Reversing only the kana font prevents
         * solid strokes from being interpreted as holes by TextGeometry.
         */
        ttfLoader.reversed = characterSet === 'kana';

        ttfLoader.load(
            fontUrl,
            (fontData) => {
                try {
                    const font = new FontLoader().parse(fontData);
                    fonts.set(characterSet, font);
                    resolve(font);
                } catch (error) {
                    reject(error);
                }
            },
            undefined,
            reject
        );
    });
}

function createBaseGeometry(params) {
    const shape = createRoundedRectangleShape(
        params.width,
        params.height,
        params.cornerRadius
    );

    addMountingHoles(shape, params);

    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: params.baseThickness,
        bevelEnabled: false,
        curveSegments: 32,
        steps: 1
    });

    geometry.translate(
        -params.width / 2,
        -params.height / 2,
        0
    );
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
        shape.quadraticCurveTo(
            width,
            height,
            width - r,
            height
        );
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

function addMountingHoles(shape, params) {
    if (params.holeCount === 0) {
        return;
    }

    const radius = params.holeDiameter / 2;
    const edgeMargin = Math.max(radius + 3, 6);
    const centerY = params.height / 2;

    const positions =
        params.holeCount === 1
            ? [params.width / 2]
            : [edgeMargin, params.width - edgeMargin];

    positions.forEach((x) => {
        const hole = new THREE.Path();
        hole.absarc(x, centerY, radius, 0, Math.PI * 2, true);
        shape.holes.push(hole);
    });
}

function createTextGeometry(font, params) {
    let geometry = new TextGeometry(params.text, {
        font,
        size: params.fontSize,
        height: params.textHeight,
        curveSegments: 8,
        bevelEnabled: false
    });

    geometry.computeBoundingBox();

    const safeWidth = getSafeTextWidth(params);
    const safeHeight = Math.max(params.height - 8, 1);
    const box = geometry.boundingBox;
    const textWidth = Math.max(box.max.x - box.min.x, 0.001);
    const textHeight = Math.max(box.max.y - box.min.y, 0.001);
    const scale = Math.min(
        1,
        safeWidth / textWidth,
        safeHeight / textHeight
    );

    if (scale < 1) {
        geometry.scale(scale, scale, 1);
        geometry.computeBoundingBox();
    }

    const finalBox = geometry.boundingBox;
    const centerX = (finalBox.min.x + finalBox.max.x) / 2;
    const centerY = (finalBox.min.y + finalBox.max.y) / 2;

    geometry.translate(
        -centerX,
        -centerY,
        params.baseThickness
    );

    geometry.computeVertexNormals();
    return geometry;
}

function getSafeTextWidth(params) {
    const baseMargin = 8;

    if (params.holeCount === 0) {
        return Math.max(params.width - baseMargin * 2, 1);
    }

    if (params.holeCount === 1) {
        const centerClearance =
            params.holeDiameter + baseMargin * 2;
        return Math.max(params.width - centerClearance, 1);
    }

    const sideClearance =
        params.holeDiameter + baseMargin * 2;
    return Math.max(params.width - sideClearance * 2, 1);
}

function removeCurrentModel() {
    if (!modelGroup) {
        return;
    }

    scene.remove(modelGroup);

    modelGroup.traverse((child) => {
        if (!child.isMesh) {
            return;
        }

        child.geometry?.dispose();
        child.material?.dispose();
    });

    modelGroup = null;
}

function fitCamera(params) {
    const largestDimension = Math.max(
        params.width,
        params.height,
        params.baseThickness + params.textHeight
    );

    const distance = Math.max(70, largestDimension * 1.25);

    camera.position.set(
        distance,
        -distance,
        distance * 0.9
    );
    camera.near = Math.max(0.1, distance / 100);
    camera.far = Math.max(5000, distance * 20);
    camera.updateProjectionMatrix();

    controls.target.set(
        0,
        0,
        (params.baseThickness + params.textHeight) / 2
    );
    controls.update();
}

function downloadNamePlateSTL() {
    const params = readParameters();
    const error = validateParameters(params);

    if (error) {
        setValidationMessage(error, 'error');
        setDownloadEnabled(false);
        return;
    }

    if (!modelGroup) {
        setValidationMessage(
            NAME_PLATE_TEXT.generateFirst,
            'error'
        );
        return;
    }

    exportSTL(
        modelGroup,
        buildFilename(params),
        {
            rotateForPrint: false
        }
    );

    setValidationMessage(NAME_PLATE_TEXT.downloaded, 'success');
}

function buildFilename(params) {
    const safeText = params.text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 24);

    const name = safeText || 'custom';
    return `vekmaker-name-plate-${name}.stl`;
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
    const height = Math.max(
        elements.preview?.clientHeight || 420,
        1
    );

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
