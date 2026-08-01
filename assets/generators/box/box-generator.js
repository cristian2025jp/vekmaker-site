// Densidade média do PLA (g/cm³)
const PLA_DENSITY = 1.24;

const BOX_I18N = {
    en: {
        minWidth: 'Minimum width is 10 mm.',
        minDepth: 'Minimum depth is 10 mm.',
        minHeight: 'Minimum height is 10 mm.',
        minWall: 'Minimum wall thickness is 1 mm.',
        minBottom: 'Minimum bottom thickness is 1 mm.',
        wallWidth: 'Wall thickness is too large for the selected width.',
        wallDepth: 'Wall thickness is too large for the selected depth.'
    },
    pt: {
        minWidth: 'A largura mínima é 10 mm.',
        minDepth: 'A profundidade mínima é 10 mm.',
        minHeight: 'A altura mínima é 10 mm.',
        minWall: 'A espessura mínima da parede é 1 mm.',
        minBottom: 'A espessura mínima do fundo é 1 mm.',
        wallWidth: 'A espessura da parede é muito grande para a largura selecionada.',
        wallDepth: 'A espessura da parede é muito grande para a profundidade selecionada.'
    },
    ja: {
        minWidth: '幅は10 mm以上にしてください。',
        minDepth: '奥行きは10 mm以上にしてください。',
        minHeight: '高さは10 mm以上にしてください。',
        minWall: '壁の厚さは1 mm以上にしてください。',
        minBottom: '底の厚さは1 mm以上にしてください。',
        wallWidth: '選択した幅に対して壁が厚すぎます。',
        wallDepth: '選択した奥行きに対して壁が厚すぎます。'
    }
};

const BOX_LANG = ['en', 'pt', 'ja'].includes(document.documentElement.lang)
    ? document.documentElement.lang
    : 'en';

const BOX_TEXT = BOX_I18N[BOX_LANG];


const validationMessage =
    document.getElementById(
        'validationMessage'
    );

// Elementos de entrada
const widthInput = document.getElementById('width');
const depthInput = document.getElementById('depth');
const heightInput = document.getElementById('height');
const wallInput = document.getElementById('wall');
const bottomInput = document.getElementById('bottom');

// Elementos de saída
//const extWidthEl = document.getElementById('extWidth');
//const extDepthEl = document.getElementById('extDepth');
//const extHeightEl = document.getElementById('extHeight');

const externalSizeEl =
    document.getElementById('externalSize');

const volumeEl = document.getElementById('volume');
const weightEl = document.getElementById('weight');

function calculate() {

    // Valores
    const internalWidth = parseFloat(widthInput.value) || 0;
    const internalDepth = parseFloat(depthInput.value) || 0;
    const internalHeight = parseFloat(heightInput.value) || 0;

    const wall = parseFloat(wallInput.value) || 0;
    const bottom = parseFloat(bottomInput.value) || 0;

    validationMessage.classList.remove(
    'validation-success'
);

if (internalWidth < 10) {

    validationMessage.textContent =
        BOX_TEXT.minWidth;
    validationMessage.classList.add('active');
    return;

}

if (internalDepth < 10) {

    validationMessage.textContent =
        BOX_TEXT.minDepth;
    validationMessage.classList.add('active');
        return;

}

if (internalHeight < 10) {

    validationMessage.textContent =
        BOX_TEXT.minHeight;
    validationMessage.classList.add('active');
    return;

}

if (wall < 1) {

    validationMessage.textContent =
        BOX_TEXT.minWall;
    validationMessage.classList.add('active');
    return;

}

if (bottom < 1) {

    validationMessage.textContent =
        BOX_TEXT.minBottom;
    validationMessage.classList.add('active');
    return;

}

if (
    wall * 2 >= internalWidth
) {

    validationMessage.textContent =
        BOX_TEXT.wallWidth;
    validationMessage.classList.add('active');
    return;

}

if (
    wall * 2 >= internalDepth
) {

    validationMessage.textContent =
        BOX_TEXT.wallDepth;
    validationMessage.classList.add('active');
    return;

}

validationMessage.textContent = '';
validationMessage.classList.remove('active');

validationMessage.className =
    'validation-message';

    if (
    internalWidth < 10 ||
    internalDepth < 10 ||
    internalHeight < 10 ||
    wall < 1 ||
    bottom < 1
    ) {
        return;
    }

    // Dimensões externas
    const externalWidth = internalWidth + (wall * 2);
    const externalDepth = internalDepth + (wall * 2);
    const externalHeight = internalHeight + bottom;

    // Atualizar interface
    //extWidthEl.textContent = `${externalWidth.toFixed(1)} mm`;
    //extDepthEl.textContent = `${externalDepth.toFixed(1)} mm`;
    //extHeightEl.textContent = `${externalHeight.toFixed(1)} mm`;

    externalSizeEl.textContent =
    `${externalWidth.toFixed(1)} × ${externalDepth.toFixed(1)} × ${externalHeight.toFixed(1)} mm`;
    
    // Volume externo (mm³)
    const outerVolume =
        externalWidth *
        externalDepth *
        externalHeight;

    // Volume interno (mm³)
    const innerVolume =
        internalWidth *
        internalDepth *
        internalHeight;

    // Material utilizado (mm³)
    const materialVolumeMm3 =
        outerVolume - innerVolume;

    // Converter para cm³
    const materialVolumeCm3 =
        materialVolumeMm3 / 1000;

    // Peso estimado
    const estimatedWeight =
        materialVolumeCm3 * PLA_DENSITY;

    // Atualizar interface
    volumeEl.textContent =
        `${materialVolumeCm3.toFixed(1)} cm³`;

    weightEl.textContent =
        `${estimatedWeight.toFixed(1)} g`;
		
	if (window.BoxViewer) {

    window.BoxViewer.updateBox(
         internalWidth,
        internalDepth,
        internalHeight,
        wall,
        bottom
    );

	}
}

// Eventos
widthInput.addEventListener('input', calculate);
depthInput.addEventListener('input', calculate);
heightInput.addEventListener('input', calculate);
wallInput.addEventListener('input', calculate);
bottomInput.addEventListener('input', calculate);

// Primeira execução
calculate();

window.addEventListener('load', () => {

    if (window.BoxViewer) {

        window.BoxViewer.initViewer();

        calculate();

    }

    const downloadBtn =
        document.getElementById(
            'downloadStlBtn'
        );

    if (downloadBtn) {

        downloadBtn.addEventListener(
            'click',
            () => {

                window.BoxViewer
                    .downloadSTL();

            }
        );

    }

});