const GA_MEASUREMENT_ID="G-FHGHM9C4GS";

function initGoogleAnalytics(){
    const host=window.location.hostname.toLowerCase();

    // Do not count local development/testing in Google Analytics.
    if(host!=="vekmaker.com"&&host!=="www.vekmaker.com")return;

    if(window.__VEKMAKER_GA_INITIALIZED__)return;
    window.__VEKMAKER_GA_INITIALIZED__=true;

    window.dataLayer=window.dataLayer||[];
    window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};

    window.gtag("js",new Date());
    window.gtag("config",GA_MEASUREMENT_ID,{
        send_page_view:true
    });

    const script=document.createElement("script");
    script.async=true;
    script.src=`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
    script.dataset.vekmakerAnalytics="ga4";
    document.head.appendChild(script);
}

initGoogleAnalytics();

const LAYOUT_I18N={
en:{mainNavigation:"Main navigation",tagline:"Online STL Generators",home:"Home",generators:"Generators",priceCalculator:"Price Calculator",about:"About",information:"Information",aboutVekmaker:"About VEKMaker",privacy:"Privacy",terms:"Terms of Use",contact:"Contact",supportVekmaker:"Support VEKMaker ☕",boxGenerator:"Box Generator",cylinderGenerator:"Cylinder Generator",coinTokenGenerator:"Coin / Token Generator",footerDescription:"Browser-based tools for creating customizable STL files for 3D printing.",footerNote:"Models are generated locally in your browser. No file upload is required.",footerBottom:"Simple tools for makers and 3D printing users."},
pt:{mainNavigation:"Navegação principal",tagline:"Geradores STL Online",home:"Início",generators:"Geradores",priceCalculator:"Calculadora de Preço",about:"Sobre",information:"Informações",aboutVekmaker:"Sobre o VEKMaker",privacy:"Privacidade",terms:"Termos de Uso",contact:"Contato",supportVekmaker:"Apoie o VEKMaker ☕",boxGenerator:"Gerador de Caixa",cylinderGenerator:"Gerador de Cilindro",coinTokenGenerator:"Gerador de Moeda / Token",footerDescription:"Ferramentas no navegador para criar arquivos STL personalizáveis para impressão 3D.",footerNote:"Os modelos são gerados localmente no seu navegador. Não é necessário enviar arquivos.",footerBottom:"Ferramentas simples para makers e usuários de impressão 3D."},
ja:{mainNavigation:"メインナビゲーション",tagline:"オンラインSTLジェネレーター",home:"ホーム",generators:"ジェネレーター",priceCalculator:"価格計算",about:"VEKMakerについて",information:"情報",aboutVekmaker:"VEKMakerについて",privacy:"プライバシー",terms:"利用規約",contact:"お問い合わせ",supportVekmaker:"VEKMakerを応援 ☕",boxGenerator:"ボックスジェネレーター",cylinderGenerator:"シリンダージェネレーター",coinTokenGenerator:"コイン / トークンジェネレーター",footerDescription:"3Dプリント用のカスタマイズ可能なSTLファイルをブラウザで作成するツールです。",footerNote:"モデルはブラウザ内で生成されます。ファイルをアップロードする必要はありません。",footerBottom:"メーカーや3Dプリントユーザーのためのシンプルなツールです。"}
};
function currentLayoutLanguage(){const l=(document.documentElement.lang||"en").toLowerCase().split("-")[0];return["en","pt","ja"].includes(l)?l:"en"}
function localizedLayoutPath(k,l){return{home:`/${l}/`,generators:`/${l}/generators/`,priceCalculator:`/${l}/3d-print-price-calculator/`,about:`/${l}/about/`,privacy:`/${l}/privacy/`,terms:`/${l}/terms/`,contact:`/${l}/contact/`,support:`/${l}/support/`}[k]||`/${l}/`}
function localizeLayout(){const l=currentLayoutLanguage(),t=LAYOUT_I18N[l];
document.querySelectorAll("[data-layout-text]").forEach(el=>{const k=el.dataset.layoutText;if(t[k])el.textContent=t[k]});
document.querySelectorAll("[data-layout-link]").forEach(el=>el.href=localizedLayoutPath(el.dataset.layoutLink,l));
document.querySelectorAll("[data-generator-link]").forEach(el=>el.href=`/${l}/${el.dataset.generatorLink}/`);
document.querySelectorAll("[data-layout-aria]").forEach(el=>{const k=el.dataset.layoutAria;if(t[k])el.setAttribute("aria-label",t[k])})}
async function loadComponent(id,path){try{const r=await fetch(path);if(!r.ok)throw new Error(`Component not found: ${path}`);const target=document.getElementById(id);if(target)target.innerHTML=await r.text()}catch(e){console.error("Error loading component:",e)}}
async function loadLayout(){await loadComponent("site-header","/assets/components/layout/header.html");await loadComponent("site-menu","/assets/components/navigation/menu.html");await loadComponent("site-footer","/assets/components/layout/footer.html");localizeLayout()}
document.addEventListener("DOMContentLoaded",loadLayout);