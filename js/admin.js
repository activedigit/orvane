/* ================================================
   ORVANE - Admin Panel Logic
   Image upload, auto-matching, and product management
================================================ */

const STORAGE_KEY = 'orvane_custom_images';
const BRAND_LOGOS_KEY = 'orvane_brand_logos';
let customImages = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
let brandLogos = JSON.parse(localStorage.getItem(BRAND_LOGOS_KEY) || '{}');
let pendingMatches = []; // Pending matches from bulk upload

// All known brands (including ones we don't have products for yet)
const ALL_BRANDS = [
    'Laverne',
    'Armaf',
    'Christian Breton',
    'Beauty of Joseon',
    'Medicube',
    'Dr. Althea',
    'Purito',
    'Arencia',
    'Flormar',
    'Assaf',
    'Assaf Watches',
    'The Purest Solutions'
];

// ===== Utilities =====
function showToast(message, type = 'default') {
    const toast = document.getElementById('adminToast');
    toast.textContent = message;
    toast.className = 'admin-toast ' + type;
    setTimeout(() => toast.classList.add('visible'), 10);
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('visible'), 3500);
}

function saveCustomImages() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(customImages));
        updateStats();
        updateStorageInfo();
    } catch (e) {
        showToast('فشل الحفظ - مساحة التخزين ممتلئة', 'error');
    }
}

function saveBrandLogos() {
    try {
        localStorage.setItem(BRAND_LOGOS_KEY, JSON.stringify(brandLogos));
    } catch (e) {
        showToast('فشل حفظ الشعارات', 'error');
    }
}

function brandSlug(brand) {
    return String(brand).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
    }[c]));
}

// Normalize string for matching: lowercase, remove spaces/punctuation, keep alphanumeric + Arabic
function normalize(s) {
    return String(s).toLowerCase()
        .replace(/\.(jpg|jpeg|png|webp|gif)$/i, '')
        .replace(/[\s_\-\.]+/g, '')
        .replace(/[^\w؀-ۿ]/g, '');
}

// Find best matching product by filename
function findProductMatch(filename) {
    const normFile = normalize(filename);
    if (!normFile) return null;

    // 1. If filename is just a number, match by product ID
    const numMatch = filename.match(/^(\d+)\./);
    if (numMatch) {
        const id = parseInt(numMatch[1]);
        const byId = PRODUCTS.find(p => p.id === id);
        if (byId) return { product: byId, confidence: 100, method: 'بالرقم' };
    }

    let bestMatch = null;
    let bestScore = 0;

    for (const product of PRODUCTS) {
        const normEn = normalize(product.name);
        const normAr = normalize(product.arName);

        // Exact match (100)
        if (normFile === normEn || normFile === normAr) {
            return { product, confidence: 100, method: 'تطابق تام' };
        }

        // Contains (80-90)
        let score = 0;
        if (normEn && (normFile.includes(normEn) || normEn.includes(normFile))) {
            score = Math.max(score, 85);
        }
        if (normAr && (normFile.includes(normAr) || normAr.includes(normFile))) {
            score = Math.max(score, 85);
        }

        // Word overlap
        const fileWords = filename.toLowerCase().replace(/\.[^.]+$/, '').split(/[\s_\-]+/).filter(w => w.length > 2);
        const productWords = (product.name + ' ' + product.arName).toLowerCase().split(/[\s_\-]+/).filter(w => w.length > 2);
        const overlap = fileWords.filter(w => productWords.some(pw => pw.includes(w) || w.includes(pw))).length;
        if (overlap > 0) {
            score = Math.max(score, 50 + (overlap * 15));
        }

        if (score > bestScore) {
            bestScore = score;
            bestMatch = { product, confidence: score, method: score >= 85 ? 'تطابق جزئي' : 'تخمين' };
        }
    }

    return bestScore >= 50 ? bestMatch : null;
}

// Compress image to base64 (max 800px, JPEG 85% quality)
function compressImage(file, maxSize = 800) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = (e) => {
            const img = new Image();
            img.onerror = reject;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                if (width > height && width > maxSize) {
                    height = Math.round((height * maxSize) / width);
                    width = maxSize;
                } else if (height > maxSize) {
                    width = Math.round((width * maxSize) / height);
                    height = maxSize;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// ===== Dropzone Setup =====
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');

dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
});
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    handleFiles(Array.from(e.dataTransfer.files));
});
fileInput.addEventListener('change', (e) => {
    handleFiles(Array.from(e.target.files));
    fileInput.value = '';
});

async function handleFiles(files) {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
        showToast('لم يتم اختيار صور صالحة', 'error');
        return;
    }

    showToast(`جاري معالجة ${imageFiles.length} صورة...`);
    pendingMatches = [];

    for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        try {
            const dataUri = await compressImage(file);
            const match = findProductMatch(file.name);
            pendingMatches.push({
                index: i,
                filename: file.name,
                size: file.size,
                dataUri: dataUri,
                match: match
            });
        } catch (e) {
            console.error('Error processing', file.name, e);
        }
    }

    renderMatchResults();
    document.getElementById('matchSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderMatchResults() {
    const section = document.getElementById('matchSection');
    const grid = document.getElementById('matchGrid');

    if (pendingMatches.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    grid.innerHTML = pendingMatches.map((item, idx) => {
        const matched = item.match && item.match.confidence >= 70;
        const allOptions = PRODUCTS.map(p =>
            `<option value="${p.id}" ${item.match && item.match.product.id === p.id ? 'selected' : ''}>${escapeHtml(p.arName)} - ${escapeHtml(p.name)} (${escapeHtml(p.brand)})</option>`
        ).join('');

        return `
            <div class="match-card ${matched ? 'matched' : 'unmatched'}" data-idx="${idx}">
                <img src="${item.dataUri}" alt="${escapeHtml(item.filename)}">
                <div class="file-name">📄 ${escapeHtml(item.filename)}</div>
                <span class="match-status">
                    ${matched ? '✓ مطابقة (' + item.match.confidence + '%)' : '⚠ مطابقة يدوية مطلوبة'}
                </span>
                ${matched ? `<div class="product-name">${escapeHtml(item.match.product.arName)}</div>` : ''}
                <select onchange="updateMatch(${idx}, this.value)">
                    <option value="">-- اختر منتج --</option>
                    ${allOptions}
                </select>
                <div class="actions">
                    <button class="admin-btn success" onclick="applyMatch(${idx})">
                        <i class="fas fa-check"></i> تطبيق
                    </button>
                    <button class="admin-btn danger" onclick="skipMatch(${idx})">
                        تخطي
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

window.updateMatch = function(idx, productId) {
    if (!productId) return;
    const product = PRODUCTS.find(p => p.id === parseInt(productId));
    if (product) {
        pendingMatches[idx].match = { product, confidence: 100, method: 'يدوي' };
        renderMatchResults();
    }
};

window.applyMatch = function(idx) {
    const item = pendingMatches[idx];
    if (!item || !item.match) {
        showToast('اختر منتج أولاً', 'error');
        return;
    }
    customImages[item.match.product.id] = item.dataUri;
    saveCustomImages();
    showToast(`✓ تم تعيين الصورة لـ ${item.match.product.arName}`, 'success');
    pendingMatches.splice(idx, 1);
    renderMatchResults();
    renderAdminGrid();
};

window.skipMatch = function(idx) {
    pendingMatches.splice(idx, 1);
    renderMatchResults();
};

document.getElementById('applyAllMatched').addEventListener('click', () => {
    const matched = pendingMatches.filter(m => m.match && m.match.confidence >= 70);
    if (matched.length === 0) {
        showToast('لا توجد مطابقات مؤكدة لتطبيقها', 'error');
        return;
    }
    matched.forEach(item => {
        customImages[item.match.product.id] = item.dataUri;
    });
    saveCustomImages();
    pendingMatches = pendingMatches.filter(m => !m.match || m.match.confidence < 70);
    showToast(`✓ تم تطبيق ${matched.length} صورة بنجاح`, 'success');
    renderMatchResults();
    renderAdminGrid();
});

document.getElementById('clearMatches').addEventListener('click', () => {
    pendingMatches = [];
    renderMatchResults();
});

// ===== Brand Filter Setup =====
const filterBrand = document.getElementById('filterBrand');
const brands = [...new Set(PRODUCTS.map(p => p.brand))].sort();
brands.forEach(b => {
    const opt = document.createElement('option');
    opt.value = b;
    opt.textContent = b;
    filterBrand.appendChild(opt);
});

// ===== Filters =====
let searchTerm = '';
let filterBrandValue = '';
let filterStatusValue = '';

document.getElementById('searchInput').addEventListener('input', (e) => {
    searchTerm = e.target.value.toLowerCase().trim();
    renderAdminGrid();
});
filterBrand.addEventListener('change', (e) => {
    filterBrandValue = e.target.value;
    renderAdminGrid();
});
document.getElementById('filterStatus').addEventListener('change', (e) => {
    filterStatusValue = e.target.value;
    renderAdminGrid();
});

// ===== Render Admin Product Grid =====
function renderAdminGrid() {
    const grid = document.getElementById('adminGrid');
    let filtered = [...PRODUCTS];

    if (searchTerm) {
        filtered = filtered.filter(p =>
            p.name.toLowerCase().includes(searchTerm) ||
            p.arName.toLowerCase().includes(searchTerm) ||
            p.brand.toLowerCase().includes(searchTerm)
        );
    }
    if (filterBrandValue) {
        filtered = filtered.filter(p => p.brand === filterBrandValue);
    }
    if (filterStatusValue === 'custom') {
        filtered = filtered.filter(p => customImages[p.id]);
    } else if (filterStatusValue === 'default') {
        filtered = filtered.filter(p => !customImages[p.id]);
    }

    if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:60px; color:#999;"><i class="far fa-frown" style="font-size:48px; margin-bottom:12px; display:block;"></i><p>لا توجد منتجات مطابقة</p></div>';
        return;
    }

    grid.innerHTML = filtered.map(p => {
        const hasCustom = !!customImages[p.id];
        const imgSrc = customImages[p.id] || getProductImage(p);
        return `
            <div class="admin-product ${hasCustom ? 'has-custom' : ''}">
                <div class="img-wrap">
                    <img src="${imgSrc}" alt="${escapeHtml(p.arName)}" onerror="handleImgError(this, ${p.id})">
                    ${hasCustom ? '<div class="custom-badge"><i class="fas fa-check"></i> مخصصة</div>' : ''}
                </div>
                <div class="info">
                    <div class="pid">المنتج رقم ${p.id}</div>
                    <span class="brand-tag">${escapeHtml(p.brand)}</span>
                    <div class="name-ar">${escapeHtml(p.arName)}</div>
                    <div class="name-en">${escapeHtml(p.name)}</div>
                    <div class="upload-zone">
                        <label>
                            <i class="fas fa-upload"></i> ${hasCustom ? 'تغيير' : 'رفع صورة'}
                            <input type="file" accept="image/*" onchange="handleSingleUpload(event, ${p.id})">
                        </label>
                        ${hasCustom ? `<button class="remove-btn" onclick="removeCustomImage(${p.id})" title="إزالة"><i class="fas fa-times"></i></button>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

window.handleSingleUpload = async function(event, productId) {
    const file = event.target.files[0];
    if (!file) return;
    try {
        showToast('جاري الرفع...');
        const dataUri = await compressImage(file);
        customImages[productId] = dataUri;
        saveCustomImages();
        const product = PRODUCTS.find(p => p.id === productId);
        showToast(`✓ تم رفع الصورة لـ ${product.arName}`, 'success');
        renderAdminGrid();
    } catch (e) {
        showToast('فشل الرفع: ' + e.message, 'error');
    }
};

window.removeCustomImage = function(productId) {
    if (!confirm('هل أنت متأكد من إزالة هذه الصورة؟')) return;
    delete customImages[productId];
    saveCustomImages();
    renderAdminGrid();
    showToast('تمت الإزالة', 'success');
};

// ===== Brand Logos Grid =====
function renderBrandsAdminGrid() {
    const grid = document.getElementById('brandsAdminGrid');
    if (!grid) return;

    grid.innerHTML = ALL_BRANDS.map(brand => {
        const slug = brandSlug(brand);
        const logo = brandLogos[slug];
        const productCount = PRODUCTS.filter(p => p.brand === brand).length;
        const hasLogo = !!logo;

        return `
            <div class="brand-admin-card ${hasLogo ? 'has-logo' : ''}">
                <div class="logo-preview">
                    ${hasLogo
                        ? `<img src="${logo}" alt="${escapeHtml(brand)}">`
                        : `<div class="placeholder"><i class="fas fa-image" style="font-size:32px; opacity:0.3; margin-bottom:6px; display:block;"></i>لا يوجد شعار</div>`
                    }
                </div>
                <div class="brand-title">${escapeHtml(brand)}</div>
                <div class="product-count">${productCount} منتج</div>
                <div class="upload-controls">
                    <label>
                        <i class="fas fa-upload"></i> ${hasLogo ? 'تغيير' : 'رفع شعار'}
                        <input type="file" accept="image/*" onchange="handleBrandLogoUpload(event, '${slug}', '${escapeHtml(brand)}')">
                    </label>
                    ${hasLogo ? `<button class="remove-logo" onclick="removeBrandLogo('${slug}')" title="إزالة"><i class="fas fa-times"></i></button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

window.handleBrandLogoUpload = async function(event, slug, brandName) {
    const file = event.target.files[0];
    if (!file) return;
    try {
        showToast('جاري رفع الشعار...');
        // Logos use smaller maxSize and PNG-friendly compression
        const dataUri = await compressLogoImage(file);
        brandLogos[slug] = dataUri;
        saveBrandLogos();
        showToast(`✓ تم رفع شعار ${brandName}`, 'success');
        renderBrandsAdminGrid();
    } catch (e) {
        showToast('فشل رفع الشعار: ' + e.message, 'error');
    }
};

window.removeBrandLogo = function(slug) {
    if (!confirm('هل أنت متأكد من إزالة هذا الشعار؟')) return;
    delete brandLogos[slug];
    saveBrandLogos();
    renderBrandsAdminGrid();
    showToast('تمت الإزالة', 'success');
};

// Compress logo (preserves transparency for PNG, max 400px)
function compressLogoImage(file, maxSize = 400) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = (e) => {
            const img = new Image();
            img.onerror = reject;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                if (width > height && width > maxSize) {
                    height = Math.round((height * maxSize) / width);
                    width = maxSize;
                } else if (height > maxSize) {
                    width = Math.round((width * maxSize) / height);
                    height = maxSize;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Keep PNG format for transparency support
                const format = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                const quality = format === 'image/jpeg' ? 0.9 : undefined;
                resolve(canvas.toDataURL(format, quality));
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// ===== Stats =====
function updateStats() {
    const total = PRODUCTS.length;
    const withCustom = Object.keys(customImages).length;
    const withoutCustom = total - withCustom;
    const pct = total > 0 ? Math.round((withCustom / total) * 100) : 0;

    document.getElementById('statTotal').textContent = total;
    document.getElementById('statWithCustom').textContent = withCustom;
    document.getElementById('statWithoutCustom').textContent = withoutCustom;
    document.getElementById('statProgress').textContent = pct + '%';

    const progEl = document.getElementById('statProgress');
    progEl.className = 'num ' + (pct === 100 ? 'green' : pct > 50 ? 'pink' : 'red');
}

function updateStorageInfo() {
    const json = JSON.stringify(customImages);
    const bytes = new Blob([json]).size;
    const mb = bytes / (1024 * 1024);
    const maxMb = 5;
    const pct = Math.min(100, (mb / maxMb) * 100);

    document.getElementById('storageFill').style.width = pct + '%';
    document.getElementById('storageText').textContent =
        mb.toFixed(2) + ' / ' + maxMb + ' MB (' + Object.keys(customImages).length + ' صورة)';
}

// ===== Export / Clear =====
document.getElementById('exportBtn').addEventListener('click', () => {
    const data = {
        exportDate: '2026-06-07',
        productsCount: PRODUCTS.length,
        customImagesCount: Object.keys(customImages).length,
        customImages: customImages
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orvane-custom-images.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('✓ تم تنزيل النسخة الاحتياطية', 'success');
});

document.getElementById('exportImagesBtn').addEventListener('click', () => {
    const count = Object.keys(customImages).length;
    if (count === 0) {
        showToast('لا توجد صور مخصصة للتصدير', 'error');
        return;
    }
    // Export as JSON (since ZIP would need a library)
    document.getElementById('exportBtn').click();
});

document.getElementById('clearAllBtn').addEventListener('click', () => {
    const count = Object.keys(customImages).length;
    if (count === 0) {
        showToast('لا توجد صور مخصصة', 'error');
        return;
    }
    if (!confirm(`هل أنت متأكد من حذف كل الـ ${count} صورة المخصصة؟ لا يمكن التراجع.`)) return;
    customImages = {};
    saveCustomImages();
    renderAdminGrid();
    showToast('✓ تم مسح كل الصور', 'success');
});

// ===== Initial Render =====
updateStats();
updateStorageInfo();
renderAdminGrid();
renderBrandsAdminGrid();

// Welcome message
setTimeout(() => {
    if (Object.keys(customImages).length === 0) {
        showToast('👋 مرحباً! ابدأ بسحب صور المنتجات للأعلى');
    }
}, 500);
