/* ================================================
   ORVANE - Products Database (Laverne Collection)
================================================ */

// ===== Stock Image Pools (Unsplash - free for commercial use) =====
// Each product type has 3-5 photos that rotate based on product ID.
// Real photos load first; if any fail, SVG fallback kicks in via onerror.
const IMAGE_POOLS = {
    perfume_women: [
        'https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&h=600&fit=crop&q=80',
        'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&h=600&fit=crop&q=80',
        'https://images.unsplash.com/photo-1588405748880-12d1d2a59d75?w=600&h=600&fit=crop&q=80',
        'https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=600&h=600&fit=crop&q=80',
        'https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=600&h=600&fit=crop&q=80'
    ],
    perfume_men: [
        'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=600&h=600&fit=crop&q=80',
        'https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=600&h=600&fit=crop&q=80',
        'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=600&h=600&fit=crop&q=80'
    ],
    perfume_unisex: [
        'https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=600&h=600&fit=crop&q=80',
        'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=600&h=600&fit=crop&q=80',
        'https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=600&h=600&fit=crop&q=80',
        'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&h=600&fit=crop&q=80'
    ],
    bakhoor: [
        'https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=600&h=600&fit=crop&q=80',
        'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=600&h=600&fit=crop&q=80'
    ],
    set: [
        'https://images.unsplash.com/photo-1607602132700-068258431c6c?w=600&h=600&fit=crop&q=80',
        'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600&h=600&fit=crop&q=80'
    ],
    cream: [
        'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&h=600&fit=crop&q=80',
        'https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?w=600&h=600&fit=crop&q=80',
        'https://images.unsplash.com/photo-1599751449128-eb7249c3d6b1?w=600&h=600&fit=crop&q=80',
        'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&h=600&fit=crop&q=80'
    ],
    serum: [
        'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&h=600&fit=crop&q=80',
        'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&h=600&fit=crop&q=80',
        'https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?w=600&h=600&fit=crop&q=80'
    ],
    toner: [
        'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&h=600&fit=crop&q=80',
        'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&h=600&fit=crop&q=80',
        'https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?w=600&h=600&fit=crop&q=80'
    ],
    cleanser: [
        'https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?w=600&h=600&fit=crop&q=80',
        'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&h=600&fit=crop&q=80',
        'https://images.unsplash.com/photo-1599751449128-eb7249c3d6b1?w=600&h=600&fit=crop&q=80'
    ],
    sunscreen: [
        'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&h=600&fit=crop&q=80',
        'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&h=600&fit=crop&q=80'
    ],
    spray: [
        'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&h=600&fit=crop&q=80',
        'https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?w=600&h=600&fit=crop&q=80'
    ],
    treatment: [
        'https://images.unsplash.com/photo-1599751449128-eb7249c3d6b1?w=600&h=600&fit=crop&q=80',
        'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=600&h=600&fit=crop&q=80'
    ],
    bodyspray: [
        'https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=600&h=600&fit=crop&q=80',
        'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=600&h=600&fit=crop&q=80',
        'https://images.unsplash.com/photo-1594035910387-fea47794261f?w=600&h=600&fit=crop&q=80'
    ]
};

// Get the appropriate image for a product
// Priority: 1) Custom uploaded image (from admin panel) → 2) product.image URL → 3) Unsplash pool → 4) SVG fallback (via onerror)
function getProductImage(product) {
    // 1. Custom image uploaded via admin panel (stored in localStorage)
    try {
        if (typeof localStorage !== 'undefined') {
            const customImages = JSON.parse(localStorage.getItem('orvane_custom_images') || '{}');
            if (customImages[product.id]) {
                return customImages[product.id];
            }
        }
    } catch (e) { /* localStorage unavailable */ }

    // 2. Product-specific image URL
    if (product.image && typeof product.image === 'string' && product.image.startsWith('http')) {
        return product.image;
    }

    // 3. Stock photo from pool based on type/category
    let poolKey;
    if (product.type === 'perfume') {
        if (product.category === 'women') poolKey = 'perfume_women';
        else if (product.category === 'men') poolKey = 'perfume_men';
        else poolKey = 'perfume_unisex';
    } else {
        poolKey = product.type;
    }

    const pool = IMAGE_POOLS[poolKey] || IMAGE_POOLS.perfume_unisex;
    return pool[product.id % pool.length];
}

// Global error handler for images - swaps to SVG fallback if real photo fails
if (typeof window !== 'undefined') {
    window.handleImgError = function(img, productId) {
        if (img.dataset.fallbackUsed === '1') return;
        img.dataset.fallbackUsed = '1';
        const product = PRODUCTS.find(p => p.id === productId);
        if (product && typeof generateProductImage === 'function') {
            img.src = generateProductImage(product);
        }
    };
}

// Generate elegant SVG placeholder for each product (used as fallback)
function generateProductImage(product) {
    const brand = String(product.brand || 'ORVANE').toUpperCase().replace(/[<>&"]/g, '');
    const productName = String(product.name || '').toUpperCase().replace(/[<>&"]/g, '').substring(0, 30);

    // Color schemes by product type
    const schemes = {
        bakhoor:   { bg: '#2a1810', accent: '#d4af7a', label: 'BAKHOOR',     icon: 'bottle' },
        set:       { bg: '#1a1a1a', accent: '#f5b8c4', label: 'GIFT SET',    icon: 'box' },
        cream:     { bg: '#3a2520', accent: '#e8c4a8', label: 'CREAM',       icon: 'jar' },
        serum:     { bg: '#1a2530', accent: '#9ec8e0', label: 'SERUM',       icon: 'dropper' },
        toner:     { bg: '#1a2a2f', accent: '#a8c8d0', label: 'TONER',       icon: 'tall' },
        cleanser:  { bg: '#1f2a25', accent: '#a8d0b8', label: 'CLEANSER',    icon: 'tall' },
        sunscreen: { bg: '#3a2510', accent: '#f0c080', label: 'SUN CARE',    icon: 'tall' },
        spray:     { bg: '#1a2530', accent: '#a8c0d0', label: 'MIST',        icon: 'tall' },
        treatment: { bg: '#2a1a2a', accent: '#e0b0c8', label: 'TREATMENT',   icon: 'jar' },
        bodyspray: { bg: '#1a2030', accent: '#90a8c0', label: 'BODY SPRAY',  icon: 'spray' },
        perfume:   { bg: '#1a1a1a', accent: '#f5b8c4', label: 'EAU DE PARFUM', icon: 'bottle' }
    };

    let scheme = schemes[product.type] || schemes.perfume;

    // Adjust perfume color by gender
    if (product.type === 'perfume') {
        if (product.category === 'men') scheme = { ...scheme, accent: '#a8b0b8' };
        else if (product.category === 'women') scheme = { ...scheme, accent: '#f5b8c4' };
        else scheme = { ...scheme, accent: '#e8c4cf' };
    }
    if (product.type === 'bodyspray') {
        if (product.category === 'women') scheme = { ...scheme, accent: '#e8a4b5' };
    }

    const bg = scheme.bg;
    const accent = scheme.accent;
    const label = scheme.label;

    // Icon shapes
    const icons = {
        bottle: '<g transform="translate(165,80)" opacity="0.7"><rect x="25" y="0" width="20" height="10" fill="' + accent + '" opacity="0.9"/><rect x="20" y="10" width="30" height="8" fill="' + accent + '" opacity="0.7"/><rect x="18" y="18" width="34" height="22" fill="' + accent + '" opacity="0.85"/><path d="M 5 40 Q 0 40 0 52 L 0 170 Q 0 185 15 185 L 55 185 Q 70 185 70 170 L 70 52 Q 70 40 65 40 Z" fill="' + accent + '" opacity="0.6"/><rect x="10" y="80" width="50" height="70" fill="' + bg + '" opacity="0.5"/></g>',
        box: '<g transform="translate(150,95)" opacity="0.65"><rect x="0" y="30" width="100" height="115" fill="' + accent + '" opacity="0.55"/><rect x="-6" y="22" width="112" height="18" fill="' + accent + '" opacity="0.75"/><rect x="44" y="22" width="12" height="123" fill="' + accent + '"/><rect x="-6" y="75" width="112" height="8" fill="' + accent + '"/><circle cx="50" cy="25" r="6" fill="' + accent + '"/></g>',
        jar: '<g transform="translate(150,95)" opacity="0.75"><ellipse cx="50" cy="10" rx="55" ry="9" fill="' + accent + '"/><rect x="-5" y="10" width="110" height="16" fill="' + accent + '" opacity="0.85"/><path d="M -5 26 L 0 135 Q 0 150 15 150 L 85 150 Q 100 150 100 135 L 105 26 Z" fill="' + accent + '" opacity="0.6"/></g>',
        dropper: '<g transform="translate(170,75)" opacity="0.75"><rect x="20" y="0" width="20" height="15" fill="' + accent + '"/><rect x="15" y="15" width="30" height="25" fill="' + accent + '" opacity="0.85"/><path d="M 0 40 L 0 200 Q 0 215 15 215 L 45 215 Q 60 215 60 200 L 60 40 Z" fill="' + accent + '" opacity="0.55"/></g>',
        tall: '<g transform="translate(175,65)" opacity="0.75"><rect x="20" y="0" width="10" height="20" fill="' + accent + '"/><rect x="15" y="20" width="20" height="12" fill="' + accent + '" opacity="0.85"/><path d="M 5 32 L 5 230 Q 5 245 18 245 L 32 245 Q 45 245 45 230 L 45 32 Z" fill="' + accent + '" opacity="0.6"/></g>',
        spray: '<g transform="translate(175,55)" opacity="0.75"><circle cx="25" cy="6" r="4" fill="' + accent + '"/><rect x="18" y="8" width="14" height="8" fill="' + accent + '"/><rect x="13" y="16" width="24" height="10" fill="' + accent + '" opacity="0.7"/><path d="M 5 26 L 5 250 Q 5 265 18 265 L 32 265 Q 45 265 45 250 L 45 26 Z" fill="' + accent + '" opacity="0.6"/></g>'
    };

    const iconSvg = icons[scheme.icon] || icons.bottle;

    // Brand name to show (truncated for fit)
    const brandShort = brand.length > 12 ? brand.substring(0, 12) : brand;

    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">' +
        '<defs>' +
        '<linearGradient id="g' + product.id + '" x1="0%" y1="0%" x2="0%" y2="100%">' +
        '<stop offset="0%" stop-color="' + bg + '"/>' +
        '<stop offset="100%" stop-color="#000000"/>' +
        '</linearGradient>' +
        '</defs>' +
        '<rect width="400" height="400" fill="url(#g' + product.id + ')"/>' +
        iconSvg +
        '<text x="200" y="295" text-anchor="middle" fill="' + accent + '" font-family="serif" font-size="26" font-weight="700" letter-spacing="6">' + brandShort + '</text>' +
        '<line x1="160" y1="312" x2="240" y2="312" stroke="' + accent + '" stroke-width="0.8" opacity="0.5"/>' +
        '<text x="200" y="335" text-anchor="middle" fill="#ffffff" opacity="0.9" font-family="sans-serif" font-size="11" font-weight="600" letter-spacing="2">' + productName + '</text>' +
        '<text x="200" y="358" text-anchor="middle" fill="' + accent + '" opacity="0.6" font-family="sans-serif" font-size="9" letter-spacing="4">' + label + '</text>' +
        '</svg>';

    // Use base64 encoding for maximum browser compatibility
    try {
        return 'data:image/svg+xml;base64,' + btoa(svg);
    } catch (e) {
        return 'data:image/svg+xml,' + encodeURIComponent(svg);
    }
}

// PRODUCTS loaded from products-data.js (auto-generated from CSV)
const PRODUCTS = (typeof window !== 'undefined' && window.PRODUCTS_DATA) ? window.PRODUCTS_DATA : [];


function formatPrice(price) {
    return price.toLocaleString('ar-EG') + ' ₪';
}

function getProductBadgeHTML(badges) {
    if (!badges || badges.length === 0) return '';
    const labels = {
        new: 'جديد',
        sale: 'تخفيض',
        bestseller: 'الأكثر مبيعاً'
    };
    return `<div class="product-badges">${badges.map(b =>
        `<span class="badge badge-${b}">${labels[b]}</span>`
    ).join('')}</div>`;
}

function getRatingHTML(rating, reviews) {
    const r = Number(rating) || 0;
    const rev = Number(reviews) || 0;
    if (r === 0 && rev === 0) return ''; // no rating data → hide entirely
    const fullStars = Math.floor(r);
    const hasHalf = r % 1 >= 0.5;
    let starsHTML = '';
    for (let i = 0; i < fullStars; i++) starsHTML += '<i class="fas fa-star"></i>';
    if (hasHalf) starsHTML += '<i class="fas fa-star-half-alt"></i>';
    const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) starsHTML += '<i class="far fa-star"></i>';
    const countHTML = rev > 0 ? `<span class="count">(${rev})</span>` : '';
    return `<div class="product-rating">${starsHTML}${countHTML}</div>`;
}

function getPriceHTML(price, originalPrice) {
    if (originalPrice) {
        const discount = Math.round((1 - price/originalPrice) * 100);
        return `<div class="product-price">
            <span class="current">${formatPrice(price)}</span>
            <span class="original">${formatPrice(originalPrice)}</span>
            <span class="discount-pct">-${discount}%</span>
        </div>`;
    }
    return `<div class="product-price"><span class="current">${formatPrice(price)}</span></div>`;
}

function createProductCard(product) {
    const imageSrc = getProductImage(product);
    // Smart name display: use arName as primary, show English only if different
    const primaryName = product.arName || product.name || 'منتج';
    const secondaryName = (product.name && product.arName && product.name !== product.arName) ? product.name : '';
    const category = product.categoryLabel || '';
    const brand = product.brand || 'ORVANE';
    const altText = primaryName.replace(/"/g, '&quot;');

    return `
        <div class="product-card" data-product-id="${product.id}">
            <div class="product-image">
                ${getProductBadgeHTML(product.badges)}
                <div class="product-actions">
                    <button class="product-action-btn quick-view-btn" data-id="${product.id}" aria-label="عرض سريع">
                        <i class="far fa-eye"></i>
                    </button>
                    <button class="product-action-btn wishlist-btn" aria-label="إضافة للمفضلة">
                        <i class="far fa-heart"></i>
                    </button>
                </div>
                <img src="${imageSrc}" alt="${altText}" loading="lazy" onerror="handleImgError(this, ${product.id})">
            </div>
            <div class="product-info">
                <div class="product-brand">${brand}</div>
                <h3 class="product-name">${primaryName}</h3>
                ${secondaryName ? `<div class="product-en-name">${secondaryName}</div>` : (category ? `<div class="product-en-name">${category}</div>` : '')}
                ${getRatingHTML(product.rating, product.reviews)}
                ${getPriceHTML(product.price, product.originalPrice)}
                <button class="product-quick-add add-to-cart-btn" data-id="${product.id}">
                    <i class="fas fa-shopping-bag"></i> أضف للسلة
                </button>
            </div>
        </div>
    `;
}
