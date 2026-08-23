const GENERATORS = [
    {
        id: "favor-box-generator",
        slug: "favor-box-generator",
        name: 'Favor Box Generator',
        icon: "box",
        image: "/assets/images/generators/favor-box-generator.jpg",
        description: 'Create customizable favor boxes with fitted lids for parties, weddings, candy and small gifts.',
        url: "/en/favor-box-generator/",
        status: "available",
        translations: {
            pt: { name: 'Gerador de Caixa de Lembrancinha', description: 'Crie caixas de lembrancinha personalizadas com tampa de encaixe para festas, doces e pequenos presentes.' },
            ja: { name: 'ギフトボックスジェネレーター', description: 'パーティー、お菓子、小さな贈り物用のフィット式ふた付きボックスを作成できます。' }
        }
    },
    {
        id: "decorative-cake-kit-generator",
        slug: "decorative-cake-kit-generator",
        name: 'Decorative Cake Kit Generator',
        icon: "cylinder",
        image: "/assets/images/generators/decorative-cake-kit-generator.jpg",
        description: 'Create decorative cake display bases, pedestal stands and separate trim rings for 3D printing.',
        url: "/en/decorative-cake-kit-generator/",
        status: "available",
        translations: {
            pt: { name: 'Gerador de Kit Decorativo para Bolo', description: 'Crie bases de bolo cenográficas, boleiras e acabamentos decorativos separados para impressão 3D.' },
            ja: { name: 'デコレーションケーキキットジェネレーター', description: 'デコレーション用ケーキベース、スタンド、別パーツの装飾リングを作成できます。' }
        }
    },
    {
        id: "pen-tool-holder-generator",
        slug: "pen-tool-holder-generator",
        name: 'Pen / Tool Holder Generator',
        icon: "organizer",
        image: "/assets/images/generators/pen-tool-holder-generator.jpg",
        description: 'Create desktop holders with individual circular slots for pens, markers, brushes and small tools.',
        url: "/en/pen-tool-holder-generator/",
        status: "available",
        translations: {
            pt: { name: 'Gerador de Porta-Canetas / Ferramentas', description: 'Crie suportes de mesa com espaços circulares individuais para canetas, marcadores, pincéis e pequenas ferramentas.' },
            ja: { name: 'ペン／ツールホルダージェネレーター', description: 'ペン、マーカー、ブラシ、小型工具を1本ずつ収納できるデスクホルダーを作成できます。' }
        }
    },
    {
        id: "box-divider-insert-generator",
        slug: "box-divider-insert-generator",
        name: 'Box Divider Insert Generator',
        icon: "organizer",
        image: "/assets/images/generators/box-divider-insert-generator.jpg",
        description: 'Create removable divider grids sized to fit inside an existing storage box.',
        url: "/en/box-divider-insert-generator/",
        status: "available",
        translations: {
            pt: { name: 'Gerador de Divisória Removível para Caixa', description: 'Crie divisórias removíveis sob medida para organizar os compartimentos de uma caixa existente.' },
            ja: { name: 'ボックス用仕切りインサートジェネレーター', description: '既存の収納ボックスに合わせた取り外し可能な仕切りグリッドを作成できます。' }
        }
    },
    {
        id: "sliding-lid-box-generator",
        slug: "sliding-lid-box-generator",
        name: 'Sliding Lid Box Generator',
        icon: "box",
        image: "/assets/images/generators/sliding-lid-box-generator.jpg",
        description: 'Create storage boxes with a separate sliding lid, adjustable fit clearance and side guide grooves.',
        url: "/en/sliding-lid-box-generator/",
        status: "available",
        translations: {
            pt: { name: 'Gerador de Caixa com Tampa Deslizante', description: 'Crie caixas com tampa deslizante separada, folga de encaixe e canaletas laterais ajustáveis.' },
            ja: { name: 'スライド式フタ付きボックスジェネレーター', description: '別パーツのスライド式フタ、フィット用クリアランス、側面ガイド溝を調整できる収納ボックスを作成できます。' }
        }
    },
    {
        id: "3d-print-price-calculator",
        slug: "3d-print-price-calculator",
        name: '3D Print Price Calculator',
        icon: "organizer",
        image: "/assets/images/generators/3d-print-price-calculator.jpg",
        description: 'Estimate a simple selling price using filament, energy, packaging, desired profit and platform fees.',
        url: "/en/3d-print-price-calculator/",
        status: "available",
        translations: {
            pt: { name: 'Calculadora de Preço para Impressão 3D', description: 'Estime um preço de venda usando filamento, energia, embalagem, lucro desejado e taxas da plataforma.' },
            ja: { name: '3Dプリント価格計算', description: 'フィラメント、電気代、梱包費、希望利益額、プラットフォーム手数料から販売価格を見積もります。' }
        }
    },
    {
        id: "cable-clip-generator",
        slug: "cable-clip-generator",
        name: 'Cable Clip Generator',
        icon: "organizer",
        image: "/assets/images/generators/cable-clip-generator.jpg",
        description: 'Create individual cable clips, multi-cable organizers and screw-mounted holders.',
        url: "/en/cable-clip-generator/",
        status: "available",
        translations: {
            pt: { name: 'Gerador de Clipe para Cabos', description: 'Crie clipes individuais, organizadores para vários cabos e suportes com fixação por parafusos.' },
            ja: { name: 'ケーブルクリップジェネレーター', description: '個別クリップ、複数ケーブルオーガナイザー、ネジ固定ホルダーを作成できます。' }
        }
    },
    {
        id: "phone-stand-generator",
        slug: "phone-stand-generator",
        name: 'Phone Stand Generator',
        icon: "organizer",
        image: "/assets/images/generators/phone-stand-generator.jpg",
        description: 'Create customizable desktop phone stands with adjustable viewing angle and cable opening.',
        url: "/en/phone-stand-generator/",
        status: "available",
        translations: {
            pt: { name: 'Gerador de Suporte para Celular', description: 'Crie suportes de mesa para celular com ângulo de visualização e abertura para cabo ajustáveis.' },
            ja: { name: 'スマートフォンスタンドジェネレーター', description: '角度やケーブル開口を調整できる卓上スマートフォンスタンドを作成できます。' }
        }
    },
    {
        id: "cone-funnel-generator",
        slug: "cone-funnel-generator",
        name: 'Cone / Funnel Generator',
        icon: "cylinder",
        image: "/assets/images/generators/cone-funnel-generator.jpg",
        description: 'Create solid cones, hollow conical adapters and funnels with adjustable dimensions.',
        url: "/en/cone-funnel-generator/",
        status: "available",
        translations: {
            pt: { name: 'Gerador de Cone / Funil', description: 'Crie cones sólidos, adaptadores cônicos ocos e funis com dimensões ajustáveis.' },
            ja: { name: 'コーン / 漏斗ジェネレーター', description: '寸法を調整してソリッドコーン、中空コーンアダプター、漏斗を作成できます。' }
        }
    },
    {
        id: "divider-box-generator",
        slug: "divider-box-generator",
        name: 'Divider Box Generator',
        icon: "organizer",
        image: "/assets/images/generators/divider-box-generator.jpg",
        description: 'Create open storage boxes with integrated rows and columns of compartments.',
        url: "/en/divider-box-generator/",
        status: "available",
        translations: {
            pt: { name: 'Gerador de Caixa com Divisórias', description: 'Crie caixas abertas com linhas e colunas de compartimentos integrados.' },
            ja: { name: '仕切りボックスジェネレーター', description: '行と列に区切られた収納スペースを持つオープンボックスを作成できます。' }
        }
    },
    {
        id: "tray-generator",
        slug: "tray-generator",
        name: 'Tray Generator',
        icon: "organizer",
        image: "/assets/images/generators/tray-generator.jpg",
        description: 'Create shallow organizer trays with adjustable internal dimensions and rounded corners.',
        url: "/en/tray-generator/",
        status: "available",
        translations: {
            pt: { name: 'Gerador de Bandeja', description: 'Crie bandejas organizadoras rasas com dimensões internas e cantos arredondados ajustáveis.' },
            ja: { name: 'トレイジェネレーター', description: '内寸と角丸を調整できる浅型オーガナイザートレイを作成できます。' }
        }
    },
    {
        id: "frame-generator",
        slug: "frame-generator",
        name: 'Frame Generator',
        icon: "frame",
        image: "/assets/images/generators/frame-generator.jpg",
        description: 'Create rectangular display frames with adjustable borders, thickness and rear rebate.',
        url: "/en/frame-generator/",
        status: "available",
        translations: {
            pt: { name: 'Gerador de Moldura', description: 'Crie molduras retangulares com bordas, espessura e rebaixo traseiro ajustáveis.' },
            ja: { name: 'フレームジェネレーター', description: '枠幅、厚さ、背面の段差を調整できる長方形フレームを作成できます。' }
        }
    },
    {
        id: "name-plate-generator",
        slug: "name-plate-generator",
        name: 'Name Plate Generator',
        icon: "nameplate",
        image: "/assets/images/generators/name-plate-generator.jpg",
        description: 'Create custom name plates with raised Latin, Portuguese, hiragana or katakana text.',
        url: "/en/name-plate-generator/",
        status: "available",
        translations: {
            pt: { name: 'Gerador de Placa com Nome', description: 'Crie placas personalizadas com texto em relevo usando caracteres latinos, português, hiragana ou katakana.' },
            ja: { name: 'ネームプレートジェネレーター', description: 'ラテン文字、ポルトガル語、ひらがな、カタカナの浮き出し文字でネームプレートを作成できます。' }
        }
    },
    {
        id: "washer-ring-generator",
        slug: "washer-ring-generator",
        name: 'Washer / Ring Generator',
        icon: "coin",
        image: "/assets/images/generators/washer-ring-generator.jpg",
        description: 'Create custom washers and flat rings with adjustable inner and outer diameters.',
        url: "/en/washer-ring-generator/",
        status: "available",
        translations: {
            pt: { name: 'Gerador de Arruela / Anel', description: 'Crie arruelas e anéis planos com diâmetros interno e externo ajustáveis.' },
            ja: { name: 'ワッシャー / リングジェネレーター', description: '内径と外径を調整してワッシャーや平リングを作成できます。' }
        }
    },
    {
        id: "coin-token-generator",
        slug: "coin-token-generator",
        name: 'Coin / Token Generator',
        icon: "coin",
        image: "/assets/images/generators/coin-token-generator.jpg",
        description: 'Create simple coins, tokens and tags with an optional center hole.',
        url: "/en/coin-token-generator/",
        status: "available",
        translations: {
            pt: { name: 'Gerador de Moeda / Token', description: 'Crie moedas, tokens e etiquetas simples com furo central opcional.' },
            ja: { name: 'コイン / トークンジェネレーター', description: '中央穴を追加できるシンプルなコイン、トークン、タグを作成できます。' }
        }
    },
    {
        id: "cylinder-generator",
        slug: "cylinder-generator",
        name: 'Cylinder Generator',
        icon: "cylinder",
        image: "/assets/images/generators/cylinder-generator.jpg",
        description: 'Create solid or hollow cylinders with an optional fitted lid.',
        url: "/en/cylinder-generator/",
        status: "available",
        translations: {
            pt: { name: 'Gerador de Cilindro', description: 'Crie cilindros sólidos ou ocos com tampa ajustada opcional.' },
            ja: { name: 'シリンダージェネレーター', description: 'ソリッドまたは中空のシリンダーと、オプションのフィットするフタを作成できます。' }
        }
    },
    {
        id: "box-generator",
        slug: "box-generator",
        name: 'Box Generator',
        icon: "box",
        image: "/assets/images/generators/box-generator.jpg",
        description: 'Create open storage boxes with adjustable internal dimensions and wall thickness.',
        url: "/en/box-generator/",
        status: "available",
        translations: {
            pt: { name: 'Gerador de Caixa', description: 'Crie caixas abertas com dimensões internas e espessura de parede ajustáveis.' },
            ja: { name: 'ボックスジェネレーター', description: '内寸と壁厚を調整できるオープン収納ボックスを作成できます。' }
        }
    }
];