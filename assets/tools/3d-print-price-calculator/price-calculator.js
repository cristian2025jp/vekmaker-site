(()=>{
const e={};
const defaults={currency:"JPY",filamentPrice:2500,materialUsed:100,energyCost:0,packagingCost:0,desiredProfit:250,platformFee:10,rounding:10};
const cfg={
JPY:{decimals:0,locale:"ja-JP"},
BRL:{decimals:2,locale:"pt-BR"},
USD:{decimals:2,locale:"en-US"},
EUR:{decimals:2,locale:"en-US"}
};

const I18N={
en:{
labels:{filamentPrice:"Filament price",materialUsed:"Material used",energyCost:"Energy cost",packagingCost:"Packaging cost",desiredProfit:"Desired profit"},
currency:"Select a valid currency.",
nonNegative:label=>`${label} must be 0 or greater.`,
platformFee:"Platform fee must be between 0% and 99%.",
rounding:"Select a valid rounding option.",
success:"Price calculated successfully."
},
pt:{
labels:{filamentPrice:"Preço do filamento",materialUsed:"Material utilizado",energyCost:"Custo de energia",packagingCost:"Custo da embalagem",desiredProfit:"Lucro desejado"},
currency:"Selecione uma moeda válida.",
nonNegative:label=>`${label} deve ser 0 ou maior.`,
platformFee:"A taxa da plataforma deve estar entre 0% e 99%.",
rounding:"Selecione uma opção de arredondamento válida.",
success:"Preço calculado com sucesso."
},
ja:{
labels:{filamentPrice:"フィラメント価格",materialUsed:"使用材料量",energyCost:"電気代",packagingCost:"梱包費",desiredProfit:"希望利益額"},
currency:"有効な通貨を選択してください。",
nonNegative:label=>`${label}は0以上で指定してください。`,
platformFee:"プラットフォーム手数料は0%から99%の範囲で指定してください。",
rounding:"有効な丸め方法を選択してください。",
success:"価格を計算しました。"
}
};

const LANG=["en","pt","ja"].includes(document.documentElement.lang)?document.documentElement.lang:"en";
const TEXT=I18N[LANG];

document.addEventListener("DOMContentLoaded",()=>{cache();bind();calculate()});

function cache(){
const ids={
display:"pc-display",currency:"pc-currency",filamentPrice:"pc-filament-price",
materialUsed:"pc-material-used",energyCost:"pc-energy-cost",packagingCost:"pc-packaging-cost",
desiredProfit:"pc-desired-profit",platformFee:"pc-platform-fee",rounding:"pc-rounding",
calculateButton:"pc-calculate",resetButton:"pc-reset",materialResult:"pc-material-result",
productionResult:"pc-production-result",profitResult:"pc-profit-result",
beforeFeeResult:"pc-before-fee-result",feeResult:"pc-fee-result",exactResult:"pc-exact-result",
message:"pc-message"
};
for(const[k,id]of Object.entries(ids))e[k]=document.getElementById(id);
}

function bind(){
[e.currency,e.filamentPrice,e.materialUsed,e.energyCost,e.packagingCost,e.desiredProfit,e.platformFee,e.rounding].forEach(x=>{
x?.addEventListener("input",calculate);
x?.addEventListener("change",calculate);
});
e.calculateButton?.addEventListener("click",calculate);
e.resetButton?.addEventListener("click",reset);
}

function values(){
return{
currency:e.currency.value,
filamentPrice:+e.filamentPrice.value,
materialUsed:+e.materialUsed.value,
energyCost:+e.energyCost.value,
packagingCost:+e.packagingCost.value,
desiredProfit:+e.desiredProfit.value,
platformFee:+e.platformFee.value,
rounding:+e.rounding.value
};
}

function validate(v){
if(!cfg[v.currency])return TEXT.currency;
for(const[key,n]of[
["filamentPrice",v.filamentPrice],
["materialUsed",v.materialUsed],
["energyCost",v.energyCost],
["packagingCost",v.packagingCost],
["desiredProfit",v.desiredProfit]
]){
if(!Number.isFinite(n)||n<0)return TEXT.nonNegative(TEXT.labels[key]);
}
if(!Number.isFinite(v.platformFee)||v.platformFee<0||v.platformFee>=100)return TEXT.platformFee;
if(![0,1,10,100].includes(v.rounding))return TEXT.rounding;
return"";
}

function calculate(){
const v=values(),err=validate(v);
if(err){clear(v.currency);msg(err,"error");return false}

const material=v.filamentPrice/1000*v.materialUsed;
const production=material+v.energyCost+v.packagingCost;
const profit=v.desiredProfit;
const before=production+profit;
const exact=v.platformFee>0?before/(1-v.platformFee/100):before;
const fee=exact-before;
const rounded=v.rounding>0?Math.round(exact/v.rounding)*v.rounding:exact;

e.display.textContent=money(rounded,v.currency);
e.materialResult.textContent=money(material,v.currency);
e.productionResult.textContent=money(production,v.currency);
e.profitResult.textContent=money(profit,v.currency);
e.beforeFeeResult.textContent=money(before,v.currency);
e.feeResult.textContent=money(fee,v.currency);
e.exactResult.textContent=money(exact,v.currency);
msg(TEXT.success,"success");
return true;
}

function reset(){
e.currency.value=defaults.currency;
e.filamentPrice.value=defaults.filamentPrice;
e.materialUsed.value=defaults.materialUsed;
e.energyCost.value=defaults.energyCost;
e.packagingCost.value=defaults.packagingCost;
e.desiredProfit.value=defaults.desiredProfit;
e.platformFee.value=defaults.platformFee;
e.rounding.value=defaults.rounding;
calculate();
}

function clear(c){
e.display.textContent=money(0,cfg[c]?c:"JPY");
[e.materialResult,e.productionResult,e.profitResult,e.beforeFeeResult,e.feeResult,e.exactResult].forEach(x=>x.textContent="—");
}

function money(v,c){
const x=cfg[c]||cfg.JPY;
return new Intl.NumberFormat(x.locale,{
style:"currency",currency:c||"JPY",
minimumFractionDigits:x.decimals,maximumFractionDigits:x.decimals
}).format(Number.isFinite(v)?v:0);
}

function msg(t,type=""){
e.message.textContent=t;
e.message.classList.remove("error","success","active");
if(t)e.message.classList.add("active");
if(type)e.message.classList.add(type);
}
})();
