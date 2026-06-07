/* ================================================
   ORVANE - CSV Importer
   Processes lifestyle_products.csv and generates products.json
================================================ */

const fs = require('fs');
const path = require('path');

const CSV_FILE = path.join(__dirname, 'lifestyle_products.csv');
const OUTPUT_FILE = path.join(__dirname, 'products.json');
const PRODUCTS_JS = path.join(__dirname, 'js', 'products.js');

// ===== Brand Detection Patterns =====
// Map of brand keywords (Arabic + English) → canonical brand name
const BRAND_PATTERNS = [
    { keys: ['capitano', 'كابيتانو', 'كابتانو', 'p.d capitano', 'كابيتانو 1905'], brand: 'Capitano' },
    { keys: ['cera di cupra', 'سيرا دي كوبرا'], brand: 'Cera di Cupra' },
    { keys: ['my perfume', 'ماي بيرفيوم', 'ماي بيرفيومز', 'ماي برفوم', 'ماي برفيوم'], brand: 'My Perfume' },
    { keys: ['chupa chups', 'تشوبا تشوبس', 'تشوباتشوبس'], brand: 'Chupa Chups' },
    { keys: ['laverne', 'لافيرن', 'لافرن'], brand: 'Laverne' },
    { keys: ['armaf', 'آرماف', 'ارماف'], brand: 'Armaf' },
    { keys: ['beauty of joseon', 'بيوتي اوف جوسون', 'بيوتي اوف جوزيون'], brand: 'Beauty of Joseon' },
    { keys: ['medicube', 'ميديكيوب', 'ميديكوب'], brand: 'Medicube' },
    { keys: ['dr. althea', 'dr althea', 'دكتور ألثيا', 'دكتور التيا', 'دكتورالثيا', 'د. ألثيا', 'در ألثيا'], brand: 'Dr. Althea' },
    { keys: ['arencia', 'أرينسيا', 'ارينسيا'], brand: 'Arencia' },
    { keys: ['purito', 'بوريتو', 'بريتو'], brand: 'Purito' },
    { keys: ['christian breton', 'كريستيان بريتون'], brand: 'Christian Breton' },
    { keys: ['flormar', 'فلورمار'], brand: 'Flormar' },
    { keys: ['assaf', 'عساف'], brand: 'Assaf' },
    { keys: ['beauty formula', 'بيوتي فورميولا', 'بيوتي فورميولاز'], brand: 'Beauty Formulas' },
    { keys: ["l'oreal", "l'oréal", 'لوريال', 'loreal'], brand: "L'Oreal" },
    { keys: ['maybelline', 'مايبيلين', 'مايبيلاين'], brand: 'Maybelline' },
    { keys: ['st. dalfour', 'سانت دالفور', 'st dalfour'], brand: 'St. Dalfour' },
    { keys: ['crest', 'كريست'], brand: 'Crest' },
    { keys: ['real techniques', 'ريل تكنيكس', 'ريال تكنيكس'], brand: 'Real Techniques' },
    { keys: ['cosrx', 'كوزركس', 'كوسركس'], brand: 'COSRX' },
    { keys: ['the purest', 'بيورست'], brand: 'The Purest Solutions' },
    { keys: ['nivea', 'نيفيا'], brand: 'Nivea' },
    { keys: ['garnier', 'غارنييه'], brand: 'Garnier' },
    { keys: ['vaseline', 'فازلين'], brand: 'Vaseline' },
    { keys: ['neutrogena', 'نيوتروجينا'], brand: 'Neutrogena' },
    { keys: ['olay', 'أولاي'], brand: 'Olay' },
    { keys: ['dove', 'دوف'], brand: 'Dove' },
    { keys: ['cetaphil', 'سيتافيل'], brand: 'Cetaphil' },
    { keys: ['eucerin', 'يوسرين'], brand: 'Eucerin' },
    { keys: ['avene', 'أفين'], brand: 'Avène' },
    { keys: ['la roche', 'لاروش'], brand: 'La Roche-Posay' },
    { keys: ['vichy', 'فيشي'], brand: 'Vichy' },
    { keys: ['bioderma', 'بيوديرما'], brand: 'Bioderma' },
    { keys: ['mac', 'ماك'], brand: 'MAC' },
    { keys: ['nyx', 'نيكس'], brand: 'NYX' },
    { keys: ['essence', 'إيسنس'], brand: 'Essence' },
    { keys: ['catrice', 'كاتريس'], brand: 'Catrice' },
    { keys: ['apieu', 'أبيب', 'أبيو'], brand: "A'pieu" },
    { keys: ['anua', 'أنوا'], brand: 'Anua' },
    { keys: ['skin1004', 'سكين1004'], brand: 'SKIN1004' },
    { keys: ['some by mi', 'سم باي مي'], brand: 'Some By Mi' },
    { keys: ['mediheal', 'ميديهيل'], brand: 'Mediheal' },
    { keys: ["i'm from", 'ام فروم'], brand: "I'm From" },
    { keys: ['head & shoulders', 'هيد اند شولدرز', 'هيد اند شولدر'], brand: 'Head & Shoulders' },
    { keys: ['pantene', 'بانتين'], brand: 'Pantene' },
    { keys: ['herbal essences', 'هيربال اسنسز'], brand: 'Herbal Essences' },
    { keys: ['palmolive', 'بالموليف'], brand: 'Palmolive' },
    { keys: ['axe', 'آكس', 'اكس'], brand: 'Axe' },
    { keys: ['rexona', 'ريكسونا'], brand: 'Rexona' },
    { keys: ['adidas', 'أديداس', 'اديداس'], brand: 'Adidas' },
    { keys: ['nike', 'نايك'], brand: 'Nike' },
    { keys: ['rich', 'ريتش'], brand: 'Rich' },
    { keys: ['oral-b', 'أورال بي', 'اورال بي'], brand: 'Oral-B' },
    { keys: ['colgate', 'كولجيت'], brand: 'Colgate' },
    { keys: ['sensodyne', 'سنسوداين'], brand: 'Sensodyne' },
    { keys: ['listerine', 'ليسترين'], brand: 'Listerine' }
];

// ===== Category Detection =====
const CATEGORY_PATTERNS = [
    // Oral care
    { keys: ['معجون أسنان', 'معجون اسنان'], cat: 'oral', type: 'toothpaste', label: 'معجون أسنان' },
    { keys: ['فرشاة أسنان', 'فرشاة اسنان', 'فرشاه اسنان'], cat: 'oral', type: 'toothbrush', label: 'فرشاة أسنان' },
    { keys: ['مضمضة', 'غسول فم', 'غسول الفم'], cat: 'oral', type: 'mouthwash', label: 'مضمضة' },
    { keys: ['خيط أسنان', 'خيط اسنان'], cat: 'oral', type: 'floss', label: 'خيط أسنان' },

    // Perfume / Fragrance
    { keys: ['عطر '], cat: 'perfume', type: 'perfume', label: 'عطر' },
    { keys: ['eau de parfum', 'edp', 'edt', 'eau de toilette'], cat: 'perfume', type: 'perfume', label: 'عطر' },
    { keys: ['بخور'], cat: 'bakhoor', type: 'bakhoor', label: 'بخور' },
    { keys: ['مسك'], cat: 'bakhoor', type: 'bakhoor', label: 'مسك' },
    { keys: ['ديودورانت', 'مزيل عرق', 'دييودورانت'], cat: 'bodyspray', type: 'deodorant', label: 'مزيل عرق' },
    { keys: ['body spray', 'بادي سبراي', 'بخاخ للجسم'], cat: 'bodyspray', type: 'bodyspray', label: 'بخاخ للجسم' },
    { keys: ['سبلاش للجسم', 'بادي ميست', 'body mist', 'بادي سبلاش'], cat: 'bodyspray', type: 'bodymist', label: 'سبلاش للجسم' },
    { keys: ['معطر جو', 'معطر منزل', 'معطر للجو', 'معطر بخاخ', 'room spray', 'معطر سيارة', 'معطر مفارش'], cat: 'home', type: 'roomspray', label: 'معطر جو' },

    // Skincare
    { keys: ['سيروم', 'serum'], cat: 'face', type: 'serum', label: 'سيروم' },
    { keys: ['كريم العين', 'كريم عين', 'eye cream'], cat: 'eye', type: 'cream', label: 'كريم عين' },
    { keys: ['كريم اليدين', 'كريم يدين'], cat: 'body', type: 'cream', label: 'كريم يدين' },
    { keys: ['كريم وجه', 'كريم للوجه', 'face cream'], cat: 'face', type: 'cream', label: 'كريم وجه' },
    { keys: ['كريم ترطيب', 'مرطب'], cat: 'face', type: 'cream', label: 'كريم ترطيب' },
    { keys: ['كريم نهار'], cat: 'face', type: 'cream', label: 'كريم نهار' },
    { keys: ['كريم ليل'], cat: 'face', type: 'cream', label: 'كريم ليل' },
    { keys: ['كريم جسم', 'كريم للجسم', 'لوشن'], cat: 'body', type: 'cream', label: 'كريم جسم' },
    { keys: ['كريم'], cat: 'face', type: 'cream', label: 'كريم' },
    { keys: ['تونر', 'toner', 'تونيك'], cat: 'face', type: 'toner', label: 'تونر' },
    { keys: ['غسول وجه', 'غسول للوجه', 'غسول الوجه', 'منظف وجه'], cat: 'face', type: 'cleanser', label: 'غسول وجه' },
    { keys: ['غسول المناطق', 'غسول مناطق'], cat: 'body', type: 'cleanser', label: 'غسول مناطق حساسة' },
    { keys: ['غسول'], cat: 'face', type: 'cleanser', label: 'غسول' },
    { keys: ['زيت تنظيف', 'cleansing oil'], cat: 'face', type: 'cleanser', label: 'زيت تنظيف' },
    { keys: ['مقشر', 'بيلينج', 'peeling'], cat: 'face', type: 'exfoliator', label: 'مقشر' },
    { keys: ['قناع', 'ماسك', 'mask'], cat: 'face', type: 'mask', label: 'قناع' },
    { keys: ['واقي شمس', 'واقي شمسي', 'sunscreen', 'spf'], cat: 'face', type: 'sunscreen', label: 'واقي شمس' },
    { keys: ['لاصقات', 'لصقات', 'باد', 'pad', 'patch'], cat: 'face', type: 'treatment', label: 'باد علاج' },
    { keys: ['إيسنس', 'essence'], cat: 'face', type: 'serum', label: 'إيسنس' },

    // Makeup
    { keys: ['أحمر شفاه', 'احمر شفاه', 'lipstick', 'روج'], cat: 'lips', type: 'lipstick', label: 'أحمر شفاه' },
    { keys: ['ليب جلوس', 'lip gloss', 'ملمع شفاه'], cat: 'lips', type: 'lipgloss', label: 'ملمع شفاه' },
    { keys: ['ليب بالم', 'lip balm', 'مرطب شفاه'], cat: 'lips', type: 'lipbalm', label: 'مرطب شفاه' },
    { keys: ['مسكارا', 'mascara'], cat: 'eyes', type: 'mascara', label: 'ماسكرا' },
    { keys: ['ايلاينر', 'eyeliner', 'كحل'], cat: 'eyes', type: 'eyeliner', label: 'إيلاينر' },
    { keys: ['ظلال', 'ايشادو', 'eyeshadow'], cat: 'eyes', type: 'eyeshadow', label: 'ظلال عيون' },
    { keys: ['كونسيلر', 'خافي عيوب', 'concealer'], cat: 'face_makeup', type: 'concealer', label: 'خافي عيوب' },
    { keys: ['فاونديشن', 'foundation', 'كريم أساس'], cat: 'face_makeup', type: 'foundation', label: 'فاونديشن' },
    { keys: ['بودرة', 'powder'], cat: 'face_makeup', type: 'powder', label: 'بودرة' },
    { keys: ['بلاشر', 'blush', 'احمر خدود'], cat: 'cheeks', type: 'blush', label: 'بلاشر' },
    { keys: ['برايمر', 'primer'], cat: 'face_makeup', type: 'primer', label: 'برايمر' },
    { keys: ['كونتور', 'contour', 'هايلايتر', 'highlighter'], cat: 'cheeks', type: 'contour', label: 'كونتور/هايلايتر' },
    { keys: ['فرشاة مكياج', 'فرشة مكياج', 'فرش مكياج', 'makeup brush'], cat: 'tools', type: 'brush', label: 'فرشاة مكياج' },
    { keys: ['حواجب', 'eyebrow', 'جل حواجب'], cat: 'eyes', type: 'brow', label: 'حواجب' },

    // Hair
    { keys: ['شامبو', 'shampoo'], cat: 'hair', type: 'shampoo', label: 'شامبو' },
    { keys: ['بلسم شعر', 'بلسم للشعر', 'conditioner'], cat: 'hair', type: 'conditioner', label: 'بلسم' },
    { keys: ['ماسك شعر', 'قناع شعر', 'hair mask'], cat: 'hair', type: 'mask', label: 'ماسك شعر' },
    { keys: ['زيت شعر', 'hair oil'], cat: 'hair', type: 'oil', label: 'زيت شعر' },
    { keys: ['سيروم شعر'], cat: 'hair', type: 'serum', label: 'سيروم شعر' },
    { keys: ['كريم شعر'], cat: 'hair', type: 'cream', label: 'كريم شعر' },
    { keys: ['صبغة شعر', 'صبغة'], cat: 'hair', type: 'color', label: 'صبغة' },

    // Body
    { keys: ['صابون', 'soap'], cat: 'body', type: 'soap', label: 'صابون' },
    { keys: ['شاور جل', 'شامبو جسم', 'body wash', 'shower gel'], cat: 'body', type: 'wash', label: 'غسول جسم' },
    { keys: ['سكراب', 'scrub', 'مقشر جسم'], cat: 'body', type: 'scrub', label: 'سكراب' },
    { keys: ['زيت جسم'], cat: 'body', type: 'oil', label: 'زيت جسم' }
];

// ===== Helpers =====
function detectBrand(name) {
    const low = name.toLowerCase();
    for (const pat of BRAND_PATTERNS) {
        for (const k of pat.keys) {
            if (low.includes(k.toLowerCase())) return pat.brand;
        }
    }
    return 'LifeStyle';
}

function detectCategory(name) {
    const low = name.toLowerCase();
    for (const pat of CATEGORY_PATTERNS) {
        for (const k of pat.keys) {
            if (low.includes(k.toLowerCase())) return { cat: pat.cat, type: pat.type, label: pat.label };
        }
    }
    return { cat: 'other', type: 'other', label: 'منوعات' };
}

function summarize(desc, maxLen = 120) {
    if (!desc) return '';
    // Strip HTML entities and decode common ones
    let s = String(desc)
        .replace(/&#8211;/g, '-')
        .replace(/&#8217;/g, "'")
        .replace(/&#8220;|&#8221;/g, '"')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
    // Take first sentence or first N chars
    const firstSentence = s.split(/[.!؟\n]/)[0];
    if (firstSentence.length <= maxLen) return firstSentence.trim();
    return s.substring(0, maxLen).trim() + '...';
}

// ===== CSV Parser =====
// Simple CSV parser that handles quoted fields with commas
function parseCSV(text) {
    const lines = [];
    let currentLine = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === '"') inQuotes = !inQuotes;
        if (ch === '\n' && !inQuotes) {
            lines.push(currentLine);
            currentLine = '';
        } else {
            currentLine += ch;
        }
    }
    if (currentLine) lines.push(currentLine);

    return lines.map(line => {
        const fields = [];
        let cur = '';
        let q = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') { q = !q; continue; }
            if (ch === ',' && !q) {
                fields.push(cur);
                cur = '';
            } else {
                cur += ch;
            }
        }
        fields.push(cur);
        return fields;
    });
}

// ===== Main =====
console.log('Reading CSV...');
const csvText = fs.readFileSync(CSV_FILE, 'utf-8');
const rows = parseCSV(csvText);
const header = rows[0];
console.log('Headers:', header);
console.log('Total rows:', rows.length - 1);

const products = [];
const brandStats = {};
const catStats = {};
let skipped = 0;

for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 4) { skipped++; continue; }

    const name = (row[0] || '').trim().replace(/^"|"$/g, '');
    const priceStr = (row[1] || '').trim().replace(/^"|"$/g, '');
    const image = (row[2] || '').trim().replace(/^"|"$/g, '');
    const link = (row[3] || '').trim().replace(/^"|"$/g, '');
    const descRaw = (row[5] || '').trim().replace(/^"|"$/g, '');
    const sku = (row[6] || '').trim().replace(/^"|"$/g, '');

    if (!name || !priceStr) { skipped++; continue; }

    const price = parseInt(priceStr.replace(/[^\d]/g, ''));
    if (!price || price < 1) { skipped++; continue; }

    const brand = detectBrand(name);
    const { cat, type, label } = detectCategory(name);

    brandStats[brand] = (brandStats[brand] || 0) + 1;
    catStats[cat] = (catStats[cat] || 0) + 1;

    // Generate a stable pseudo-random rating (4.3 - 4.9) based on id
    const rating = (4.3 + ((i * 7) % 7) / 10).toFixed(1) * 1;
    const reviews = 30 + ((i * 13) % 250);

    products.push({
        id: i,
        name: name,         // Arabic name from CSV (used for product-name)
        arName: name,       // Same name (for backward compatibility with createProductCard)
        brand: brand,
        category: cat,
        categoryLabel: label,
        type: type,
        price: price,
        originalPrice: null,
        image: image,
        link: link,
        description: summarize(descRaw, 120),
        sku: sku,
        rating: rating,
        reviews: reviews,
        badges: [],
        sizes: []
    });
}

console.log('\n=== Processed ===');
console.log('Total products:', products.length);
console.log('Skipped:', skipped);

console.log('\n=== Brands (top 20) ===');
Object.entries(brandStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .forEach(([b, c]) => console.log(`  ${b}: ${c}`));

console.log('\n=== Categories ===');
Object.entries(catStats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([c, n]) => console.log(`  ${c}: ${n}`));

// Write JSON file
const json = JSON.stringify(products);
fs.writeFileSync(OUTPUT_FILE, json, 'utf-8');
const sizeMB = (json.length / 1024 / 1024).toFixed(2);
console.log(`\n✓ Wrote products.json (${sizeMB} MB)`);
console.log(`✓ Path: ${OUTPUT_FILE}`);
