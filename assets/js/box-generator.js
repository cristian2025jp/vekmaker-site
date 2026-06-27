// Densidade média do PLA (g/cm³)
const PLA_DENSITY = 1.24;

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
        'Minimum width is 10 mm.';
    validationMessage.classList.add('active');
    return;

}

if (internalDepth < 10) {

    validationMessage.textContent =
        'Minimum depth is 10 mm.';
    validationMessage.classList.add('active');
        return;

}

if (internalHeight < 10) {

    validationMessage.textContent =
        'Minimum height is 10 mm.';
    validationMessage.classList.add('active');
    return;

}

if (wall < 1) {

    validationMessage.textContent =
        'Minimum wall thickness is 1 mm.';
    validationMessage.classList.add('active');
    return;

}

if (bottom < 1) {

    validationMessage.textContent =
        'Minimum bottom thickness is 1 mm.';
    validationMessage.classList.add('active');
    return;

}

if (
    wall * 2 >= internalWidth
) {

    validationMessage.textContent =
        'Wall thickness is too large for the selected width.';
    validationMessage.classList.add('active');
    return;

}

if (
    wall * 2 >= internalDepth
) {

    validationMessage.textContent =
        'Wall thickness is too large for the selected depth.';
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