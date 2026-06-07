/* ================================================
   ORVANE - Main JavaScript
================================================ */

document.addEventListener('DOMContentLoaded', function() {

    // ===== Mobile Bottom Navigation =====
    (function injectMobileBottomNav() {
        if (document.getElementById('mobileBottomNav')) return;

        const path = window.location.pathname.toLowerCase();
        const inPagesFolder = path.includes('/pages/');
        const homeLink = inPagesFolder ? '../index.html' : 'index.html';
        const productsLink = inPagesFolder ? 'products.html' : 'pages/products.html';

        const isHome = !inPagesFolder && (path.endsWith('/') || path.endsWith('/index.html'));
        const isProducts = path.includes('products.html');

        const nav = document.createElement('nav');
        nav.id = 'mobileBottomNav';
        nav.className = 'mobile-bottom-nav';
        nav.setAttribute('aria-label', 'تنقل سفلي');
        nav.innerHTML =
            '<a href="' + homeLink + '" class="mbn-item ' + (isHome ? 'active' : '') + '">' +
                '<i class="fas fa-home"></i>' +
                '<span>الرئيسية</span>' +
            '</a>' +
            '<a href="' + productsLink + '" class="mbn-item ' + (isProducts ? 'active' : '') + '">' +
                '<i class="fas fa-store"></i>' +
                '<span>المتجر</span>' +
            '</a>' +
            '<button type="button" class="mbn-item cart-btn" aria-label="السلة">' +
                '<i class="fas fa-shopping-bag"></i>' +
                '<span>السلة</span>' +
                '<span class="mbn-badge cart-count">0</span>' +
            '</button>' +
            '<a href="#" class="mbn-item">' +
                '<i class="far fa-user"></i>' +
                '<span>حسابي</span>' +
            '</a>';
        document.body.appendChild(nav);
    })();

    // ===== PWA: Service Worker Registration =====
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            const swPath = window.location.pathname.includes('/pages/') ? '../sw.js' : 'sw.js';
            navigator.serviceWorker.register(swPath).catch((err) => {
                console.warn('Service Worker registration failed:', err);
            });
        });
    }

    // ===== PWA: Install Prompt =====
    let deferredInstallPrompt = null;
    let installBtn = null;

    function createInstallButton() {
        if (installBtn) return installBtn;
        installBtn = document.createElement('button');
        installBtn.id = 'pwaInstallBtn';
        installBtn.className = 'pwa-install-btn';
        installBtn.setAttribute('aria-label', 'تثبيت التطبيق');
        installBtn.innerHTML =
            '<i class="fas fa-download"></i>' +
            '<div class="pwa-install-text">' +
                '<strong>ثبّت التطبيق</strong>' +
                '<span>للوصول السريع من شاشتك</span>' +
            '</div>' +
            '<button class="pwa-install-close" aria-label="إغلاق"><i class="fas fa-times"></i></button>';
        document.body.appendChild(installBtn);

        installBtn.addEventListener('click', async (e) => {
            if (e.target.closest('.pwa-install-close')) {
                e.stopPropagation();
                installBtn.classList.remove('visible');
                try { localStorage.setItem('orvane_install_dismissed', Date.now().toString()); } catch (er) {}
                return;
            }
            if (!deferredInstallPrompt) return;
            deferredInstallPrompt.prompt();
            const choice = await deferredInstallPrompt.userChoice;
            if (choice.outcome === 'accepted') {
                installBtn.classList.remove('visible');
            }
            deferredInstallPrompt = null;
        });
        return installBtn;
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredInstallPrompt = e;

        // Check if user dismissed within last 7 days
        try {
            const dismissed = parseInt(localStorage.getItem('orvane_install_dismissed') || '0');
            const sevenDays = 7 * 24 * 60 * 60 * 1000;
            if (Date.now() - dismissed < sevenDays) return;
        } catch (err) {}

        // Show install button after a delay (don't be intrusive)
        setTimeout(() => {
            const btn = createInstallButton();
            btn.classList.add('visible');
        }, 4000);
    });

    window.addEventListener('appinstalled', () => {
        if (installBtn) installBtn.classList.remove('visible');
        deferredInstallPrompt = null;
    });

    // ===== Mobile Menu =====
    const menuToggle = document.getElementById('mobileMenuToggle');
    const closeNav = document.getElementById('closeNav');
    const mainNav = document.getElementById('mainNav');

    // Inject close button into mobile nav if missing
    if (mainNav && !mainNav.querySelector('.close-nav')) {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-nav';
        closeBtn.id = 'closeNav';
        closeBtn.setAttribute('aria-label', 'סגור');
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        mainNav.insertBefore(closeBtn, mainNav.firstChild);

        closeBtn.addEventListener('click', () => {
            mainNav.classList.remove('active');
            document.body.style.overflow = '';
        });
    }

    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', () => {
            mainNav.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    if (closeNav && mainNav) {
        closeNav.addEventListener('click', () => {
            mainNav.classList.remove('active');
            document.body.style.overflow = '';
        });
    }

    // Close mobile menu on link click
    document.querySelectorAll('#mainNav a').forEach(link => {
        link.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && !e.target.closest('.has-dropdown > a')) {
                mainNav?.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });

    // Mobile dropdown toggle
    document.querySelectorAll('.has-dropdown > a').forEach(link => {
        link.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                e.preventDefault();
                link.parentElement.classList.toggle('open');
            }
        });
    });

    // Header search form submission
    const headerSearchForm = document.getElementById('headerSearchForm');
    if (headerSearchForm) {
        headerSearchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = headerSearchForm.querySelector('input').value.trim();
            if (query) {
                window.location.href = (window.location.pathname.includes('/pages/') ? '' : 'pages/') + 'products.html?search=' + encodeURIComponent(query);
            }
        });
    }

    // ===== Search Overlay =====
    const searchBtn = document.getElementById('searchBtn');
    const searchOverlay = document.getElementById('searchOverlay');
    const closeSearch = document.getElementById('closeSearch');

    if (searchBtn && searchOverlay) {
        searchBtn.addEventListener('click', () => {
            searchOverlay.classList.add('active');
            setTimeout(() => searchOverlay.querySelector('input')?.focus(), 100);
        });
    }

    if (closeSearch && searchOverlay) {
        closeSearch.addEventListener('click', () => {
            searchOverlay.classList.remove('active');
        });
    }

    // ESC closes overlays
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchOverlay?.classList.remove('active');
            document.getElementById('quickViewModal')?.classList.remove('active');
            mainNav?.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    // ===== Header Scroll Effect =====
    const header = document.getElementById('header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }

    // ===== Hero Slider =====
    const heroSlides = document.querySelectorAll('.hero-slide');
    const heroDots = document.querySelectorAll('.hero-dot');
    let currentSlide = 0;
    let slideInterval;

    function showSlide(index) {
        heroSlides.forEach(s => s.classList.remove('active'));
        heroDots.forEach(d => d.classList.remove('active'));
        heroSlides[index]?.classList.add('active');
        heroDots[index]?.classList.add('active');
        currentSlide = index;
    }

    function nextSlide() {
        showSlide((currentSlide + 1) % heroSlides.length);
    }

    if (heroSlides.length > 1) {
        slideInterval = setInterval(nextSlide, 6000);

        heroDots.forEach((dot, i) => {
            dot.addEventListener('click', () => {
                clearInterval(slideInterval);
                showSlide(i);
                slideInterval = setInterval(nextSlide, 6000);
            });
        });
    }

    // ===== Render Products =====
    function renderProducts(gridId, filter, limit = 5) {
        const grid = document.getElementById(gridId);
        if (!grid || typeof PRODUCTS === 'undefined') return;

        const hasImg = (p) => p.image && typeof p.image === 'string' && p.image.startsWith('http');
        let filtered = PRODUCTS;

        switch (filter) {
            case 'perfumes':
                filtered = PRODUCTS.filter(p => (p.type === 'perfume' || p.category === 'perfume') && hasImg(p));
                break;
            case 'bakhoor':
                filtered = PRODUCTS.filter(p => p.type === 'bakhoor');
                break;
            case 'offers':
            case 'sale':
                filtered = PRODUCTS.filter(p =>
                    (p.originalPrice && p.originalPrice > p.price) ||
                    (p.badges && p.badges.includes('sale')) ||
                    p.price <= 30
                ).filter(hasImg);
                break;
            case 'skincare':
                filtered = PRODUCTS.filter(p =>
                    (p.category === 'face' || ['serum','cream','toner','cleanser','sunscreen','mask'].includes(p.type)) && hasImg(p)
                );
                break;
            case 'korean':
                const koreanBrands = ['Beauty of Joseon', 'Purito', 'Medicube', 'Dr. Althea', 'Arencia', 'COSRX', 'SKIN1004', 'Anua', "A'pieu", "I'm From", 'Mediheal', 'Some By Mi'];
                filtered = PRODUCTS.filter(p => koreanBrands.includes(p.brand) && hasImg(p));
                break;
            case 'new':
            case 'newArrivals':
                // Use higher product IDs as proxy for "newer"
                filtered = PRODUCTS.filter(hasImg)
                    .slice()
                    .sort((a, b) => (b.id || 0) - (a.id || 0))
                    .slice(0, 100);
                break;
            case 'makeup':
                filtered = PRODUCTS.filter(p =>
                    (['lips','eyes','cheeks','face_makeup','tools'].includes(p.category) ||
                     ['lipstick','lipgloss','lipbalm','mascara','eyeliner','eyeshadow','concealer','foundation','powder','blush','primer','contour','brush','brow'].includes(p.type)) && hasImg(p)
                );
                break;
            case 'bestsellers':
                filtered = PRODUCTS.filter(p => p.bestseller || hasImg(p));
                break;
            case 'featured':
                filtered = PRODUCTS.filter(p => p.featured || hasImg(p));
                break;
        }

        // Stable selection with variety - distribute across the filtered set
        if (filtered.length > limit) {
            const step = Math.max(1, Math.floor(filtered.length / (limit * 1.5)));
            const seedOffset = (gridId.charCodeAt(0) * 7) % step;
            const picked = [];
            for (let i = seedOffset; i < filtered.length && picked.length < limit; i += step) {
                picked.push(filtered[i]);
            }
            // Fill remaining from start if needed
            for (let i = 0; picked.length < limit && i < filtered.length; i++) {
                if (!picked.includes(filtered[i])) picked.push(filtered[i]);
            }
            filtered = picked;
        }

        filtered = filtered.slice(0, limit);
        grid.innerHTML = filtered.map(createProductCard).join('');
    }

    renderProducts('perfumesGrid', 'perfumes', 5);
    renderProducts('creamsGrid', 'offers', 5);
    renderProducts('bestsellersGrid', 'bestsellers', 5);
    renderProducts('skincareGrid', 'skincare', 5);
    renderProducts('koreanGrid', 'korean', 5);
    renderProducts('newArrivalsGrid', 'newArrivals', 5);
    renderProducts('makeupGrid', 'makeup', 5);

    // ===== Cart Management =====
    let cart = JSON.parse(localStorage.getItem('orvane_cart') || '[]');
    const FREE_SHIPPING_THRESHOLD = 299;

    function updateCartCount() {
        const count = cart.reduce((sum, item) => sum + item.qty, 0);
        document.querySelectorAll('.cart-count').forEach(el => {
            el.textContent = count;
            el.style.display = 'flex';
        });
    }

    function saveCart() {
        localStorage.setItem('orvane_cart', JSON.stringify(cart));
        updateCartCount();
    }

    function addToCart(productId) {
        const product = PRODUCTS.find(p => p.id === productId);
        if (!product) return;

        const existing = cart.find(item => item.id === productId);
        if (existing) {
            existing.qty += 1;
        } else {
            cart.push({
                id: product.id,
                name: product.arName || product.name,
                price: product.price,
                image: product.image,
                qty: 1
            });
        }
        saveCart();
        showToast(`تمت إضافة ${product.arName || product.name} للسلة`);
        // Auto-open cart briefly to show what's been added
        if (document.getElementById('cartDrawer')) {
            renderCart();
        }
    }

    updateCartCount();

    // ===== Cart Drawer =====
    function ensureCartDrawer() {
        if (document.getElementById('cartDrawer')) return;
        const drawer = document.createElement('div');
        drawer.id = 'cartDrawer';
        drawer.className = 'cart-drawer';
        drawer.innerHTML = `
            <div class="cart-overlay"></div>
            <aside class="cart-panel">
                <div class="cart-header">
                    <h3><i class="fas fa-shopping-bag"></i> سلة التسوق <span id="cartItemCount">(0)</span></h3>
                    <button class="cart-close" aria-label="إغلاق"><i class="fas fa-times"></i></button>
                </div>
                <div class="cart-items" id="cartItems"></div>
                <div class="cart-footer" id="cartFooter">
                    <div id="cartProgress"></div>
                    <div class="cart-subtotal">
                        <span>المجموع الفرعي</span>
                        <strong id="cartSubtotal">0 ₪</strong>
                    </div>
                    <div class="cart-shipping-note"><i class="fas fa-truck"></i> الشحن يُحسب عند الدفع</div>
                    <button class="btn cart-checkout">إتمام الشراء <i class="fas fa-arrow-left"></i></button>
                    <button class="btn cart-continue">متابعة التسوق</button>
                </div>
            </aside>
        `;
        document.body.appendChild(drawer);

        drawer.querySelector('.cart-overlay').addEventListener('click', closeCart);
        drawer.querySelector('.cart-close').addEventListener('click', closeCart);
        drawer.querySelector('.cart-continue').addEventListener('click', closeCart);
        drawer.querySelector('.cart-checkout').addEventListener('click', () => {
            if (cart.length === 0) {
                showToast('السلة فارغة - أضف منتجات أولاً');
                return;
            }
            showToast('جاري نقلك لصفحة الدفع... 💳');
            // TODO: redirect to actual checkout page
        });
    }

    function openCart() {
        ensureCartDrawer();
        renderCart();
        document.getElementById('cartDrawer').classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeCart() {
        document.getElementById('cartDrawer')?.classList.remove('active');
        document.body.style.overflow = '';
    }

    function renderCart() {
        ensureCartDrawer();
        const itemsEl = document.getElementById('cartItems');
        const subtotalEl = document.getElementById('cartSubtotal');
        const countEl = document.getElementById('cartItemCount');
        const footerEl = document.getElementById('cartFooter');
        const progressEl = document.getElementById('cartProgress');

        if (cart.length === 0) {
            itemsEl.innerHTML = `
                <div class="cart-empty">
                    <i class="fas fa-shopping-bag"></i>
                    <h4>السلة فارغة</h4>
                    <p>أضف منتجات لتراها هنا</p>
                    <a href="${window.location.pathname.includes('/pages/') ? 'products.html' : 'pages/products.html'}" class="btn btn-dark">تسوّق الآن</a>
                </div>
            `;
            footerEl.style.display = 'none';
            countEl.textContent = '(0)';
            return;
        }

        footerEl.style.display = 'block';
        let subtotal = 0;
        let totalQty = 0;

        itemsEl.innerHTML = cart.map(item => {
            const product = PRODUCTS.find(p => p.id === item.id);
            if (!product) return '';
            const imgSrc = (typeof getProductImage === 'function') ? getProductImage(product) : '';
            subtotal += item.price * item.qty;
            totalQty += item.qty;
            return `
                <div class="cart-item" data-id="${item.id}">
                    <div class="cart-item-img-wrap">
                        <img src="${imgSrc}" alt="${item.name}" onerror="handleImgError(this, ${product.id})">
                    </div>
                    <div class="cart-item-info">
                        <div class="cart-item-brand">${product.brand}</div>
                        <h5>${item.name}</h5>
                        <div class="cart-item-price">${(item.price * item.qty).toLocaleString('ar-EG')} ₪</div>
                        <div class="cart-item-qty">
                            <button class="qty-btn qty-decrease" data-id="${item.id}" aria-label="نقصان">−</button>
                            <span>${item.qty}</span>
                            <button class="qty-btn qty-increase" data-id="${item.id}" aria-label="زيادة">+</button>
                        </div>
                    </div>
                    <button class="cart-item-remove" data-id="${item.id}" aria-label="حذف"><i class="fas fa-trash-alt"></i></button>
                </div>
            `;
        }).join('');

        countEl.textContent = `(${totalQty})`;
        subtotalEl.textContent = subtotal.toLocaleString('ar-EG') + ' ₪';

        // Free shipping progress
        if (subtotal < FREE_SHIPPING_THRESHOLD) {
            const remaining = FREE_SHIPPING_THRESHOLD - subtotal;
            const percent = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
            progressEl.innerHTML = `
                <div class="cart-progress">
                    <span>أضف <strong>${remaining.toLocaleString('ar-EG')} ₪</strong> للحصول على <strong>شحن مجاني</strong> 🚚</span>
                    <div class="cart-progress-bar">
                        <div class="cart-progress-fill" style="width:${percent}%;"></div>
                    </div>
                </div>
            `;
        } else {
            progressEl.innerHTML = `
                <div class="cart-progress" style="border-color: #2ecc71; background: #f0fbf5;">
                    <span style="color: #1e8449;">🎉 مبروك! حصلت على <strong>شحن مجاني</strong></span>
                </div>
            `;
        }

        // Wire up controls
        itemsEl.querySelectorAll('.qty-increase').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                const item = cart.find(i => i.id === id);
                if (item) {
                    item.qty++;
                    saveCart();
                    renderCart();
                }
            });
        });

        itemsEl.querySelectorAll('.qty-decrease').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                const item = cart.find(i => i.id === id);
                if (item && item.qty > 1) {
                    item.qty--;
                    saveCart();
                    renderCart();
                } else if (item && item.qty === 1) {
                    cart = cart.filter(i => i.id !== id);
                    saveCart();
                    renderCart();
                }
            });
        });

        itemsEl.querySelectorAll('.cart-item-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseInt(btn.dataset.id);
                const item = cart.find(i => i.id === id);
                cart = cart.filter(i => i.id !== id);
                saveCart();
                renderCart();
                if (item) showToast(`تم حذف ${item.name} من السلة`);
            });
        });
    }

    // Wire up cart buttons (all .cart-btn instances)
    document.querySelectorAll('.cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            openCart();
        });
    });

    // ESC closes cart too
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeCart();
    });

    // Cart button delegation
    document.addEventListener('click', (e) => {
        const addBtn = e.target.closest('.add-to-cart-btn');
        if (addBtn) {
            e.preventDefault();
            e.stopPropagation();
            const id = parseInt(addBtn.dataset.id);
            addToCart(id);
        }

        const wishBtn = e.target.closest('.wishlist-btn');
        if (wishBtn) {
            e.preventDefault();
            e.stopPropagation();
            wishBtn.classList.toggle('active');
            const icon = wishBtn.querySelector('i');
            if (wishBtn.classList.contains('active')) {
                icon.classList.remove('far');
                icon.classList.add('fas');
                icon.style.color = '#e74c3c';
                showToast('تمت الإضافة للمفضلة');
            } else {
                icon.classList.remove('fas');
                icon.classList.add('far');
                icon.style.color = '';
            }
        }
    });

    // ===== Quick View Modal =====
    const modal = document.getElementById('quickViewModal');
    const modalBody = document.getElementById('modalBody');
    const modalClose = document.getElementById('modalClose');
    const modalOverlay = modal?.querySelector('.modal-overlay');

    function openQuickView(productId) {
        const product = PRODUCTS.find(p => p.id === productId);
        if (!product || !modal) return;

        const sizes = product.sizes.map((s, i) =>
            `<button class="size-option ${i === 0 ? 'selected' : ''}">${s}</button>`
        ).join('');

        const modalImage = (typeof getProductImage === 'function') ? getProductImage(product) : product.image;
        modalBody.innerHTML = `
            <div class="modal-product">
                <div class="modal-product-image">
                    <img src="${modalImage}" alt="${product.arName || product.name}" onerror="handleImgError(this, ${product.id})">
                </div>
                <div class="modal-product-info">
                    <div class="product-brand" style="display:inline-block;">${product.brand || 'Laverne'}</div>
                    <div class="product-category" style="text-align:right; margin-top:8px;">${product.categoryLabel}</div>
                    <h2>${product.arName || product.name}</h2>
                    <p style="font-size:13px; color:var(--color-text-light); margin:-8px 0 12px; font-style:italic;">${product.name}</p>
                    ${getRatingHTML(product.rating, product.reviews)}
                    ${getPriceHTML(product.price, product.originalPrice)}
                    <p class="description">${product.description}</p>
                    <div class="modal-options">
                        <label>الحجم</label>
                        <div class="size-options">${sizes}</div>
                    </div>
                    <div class="modal-actions">
                        <button class="btn btn-dark add-to-cart-btn" data-id="${product.id}">
                            <i class="fas fa-shopping-bag"></i> أضف للسلة
                        </button>
                        <button class="btn btn-outline-dark wishlist-btn">
                            <i class="far fa-heart"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Size selector
        modalBody.querySelectorAll('.size-option').forEach(btn => {
            btn.addEventListener('click', () => {
                modalBody.querySelectorAll('.size-option').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    document.addEventListener('click', (e) => {
        const quickBtn = e.target.closest('.quick-view-btn');
        if (quickBtn) {
            e.preventDefault();
            e.stopPropagation();
            const id = parseInt(quickBtn.dataset.id);
            openQuickView(id);
        }
    });

    function closeModal() {
        modal?.classList.remove('active');
        document.body.style.overflow = '';
    }

    modalClose?.addEventListener('click', closeModal);
    modalOverlay?.addEventListener('click', closeModal);

    // ===== Back to Top =====
    const backToTop = document.getElementById('backToTop');
    if (backToTop) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 400) {
                backToTop.classList.add('visible');
            } else {
                backToTop.classList.remove('visible');
            }
        });

        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // ===== Newsletter Form =====
    const newsletterForm = document.getElementById('newsletterForm');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = newsletterForm.querySelector('input').value;
            if (email) {
                showToast('شكراً! تم اشتراكك بنجاح في النشرة البريدية 🎉');
                newsletterForm.reset();
            }
        });
    }

    // ===== Contact Form =====
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            showToast('تم إرسال رسالتك! سنتواصل معك قريباً.');
            contactForm.reset();
        });
    }

    // ===== Toast Notification =====
    function showToast(message) {
        let toast = document.querySelector('.toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add('visible');
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => {
            toast.classList.remove('visible');
        }, 3000);
    }

    // Inject toast styles
    if (!document.getElementById('toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            .toast {
                position: fixed;
                bottom: 30px;
                right: 30px;
                background-color: #1a1a1a;
                color: white;
                padding: 16px 24px;
                font-size: 14px;
                font-weight: 500;
                box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                transform: translateY(120%);
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                z-index: 3000;
                border-right: 3px solid #f5b8c4;
                max-width: 350px;
            }
            .toast.visible {
                transform: translateY(0);
            }
            @media (max-width: 768px) {
                .toast {
                    right: 16px;
                    left: 16px;
                    bottom: 16px;
                    text-align: center;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // ===== Scroll Animations =====
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));

    // Apply auto-animation to sections
    document.querySelectorAll('.section-header, .product-card, .category-card, .feature-item, .testimonial-card, .value-card, .stat-item').forEach(el => {
        el.classList.add('animate-on-scroll');
        observer.observe(el);
    });

    // ===== Products Page Functionality =====
    initProductsPage();
});

// ===== Products Page Init =====
function initProductsPage() {
    const productsContainer = document.getElementById('productsListing');
    if (!productsContainer) return;

    const urlParams = new URLSearchParams(window.location.search);
    const initialCat = urlParams.get('cat') || 'all';

    const initialBrand = urlParams.get('brand');
    const initialSearch = urlParams.get('search') || '';

    let activeFilters = {
        category: initialCat,
        types: [],
        brands: [],
        search: initialSearch,
        priceMax: 1500
    };

    let activeSort = 'popular';
    let loadedCount = 0;
    let lastFiltered = [];
    const PER_PAGE = 24;

    // Sync search input with URL param
    const searchEl = document.querySelector('#searchInput');
    if (searchEl && initialSearch) searchEl.value = initialSearch;

    function applyFilters(reset = true) {
        // When loading more (reset=false), skip re-filtering and use cached results
        if (!reset && lastFiltered.length > 0) {
            const totalResults = lastFiltered.length;
            if (loadedCount >= totalResults) {
                renderLoadMore(totalResults);
                return;
            }
            const nextCount = Math.min(loadedCount + PER_PAGE, totalResults);
            const newItems = lastFiltered.slice(loadedCount, nextCount);
            productsContainer.insertAdjacentHTML('beforeend', newItems.map(createProductCard).join(''));
            loadedCount = nextCount;
            updateResultsCounter(loadedCount, totalResults);
            renderLoadMore(totalResults);
            return;
        }

        let filtered = [...PRODUCTS];

        // Text search across name, brand, description
        if (activeFilters.search) {
            const q = activeFilters.search.toLowerCase().trim();
            filtered = filtered.filter(p =>
                (p.name && p.name.toLowerCase().includes(q)) ||
                (p.brand && p.brand.toLowerCase().includes(q)) ||
                (p.arName && p.arName.toLowerCase().includes(q)) ||
                (p.description && p.description.toLowerCase().includes(q))
            );
        }

        if (activeFilters.category && activeFilters.category !== 'all') {
            const c = activeFilters.category;
            if (c === 'perfumes') {
                filtered = filtered.filter(p => p.type === 'perfume' || p.category === 'perfume');
            } else if (c === 'bakhoor') {
                filtered = filtered.filter(p => p.type === 'bakhoor' || p.category === 'bakhoor');
            } else if (c === 'skincare' || c === 'care' || c === 'skin' || c === 'face') {
                filtered = filtered.filter(p => p.category === 'face' || ['serum','cream','toner','cleanser','sunscreen','spray','treatment','mask','exfoliator'].includes(p.type));
            } else if (c === 'makeup') {
                filtered = filtered.filter(p => ['lips','eyes','cheeks','face_makeup','tools'].includes(p.category));
            } else if (c === 'hair') {
                filtered = filtered.filter(p => p.category === 'hair');
            } else if (c === 'oral') {
                filtered = filtered.filter(p => p.category === 'oral');
            } else if (c === 'body') {
                filtered = filtered.filter(p => p.category === 'body' || p.category === 'bodyspray');
            } else if (c === 'home') {
                filtered = filtered.filter(p => p.category === 'home');
            } else if (c === 'new') {
                filtered = filtered.filter(p => p.badges?.includes('new'));
            } else if (c === 'sale') {
                filtered = filtered.filter(p => p.badges?.includes('sale'));
            } else if (c === 'bestseller') {
                filtered = filtered.filter(p => p.bestseller);
            } else {
                filtered = filtered.filter(p => p.category === c);
            }
        }

        if (activeFilters.types.length > 0) {
            filtered = filtered.filter(p => activeFilters.types.includes(p.type));
        }

        if (activeFilters.brands.length > 0) {
            filtered = filtered.filter(p => activeFilters.brands.includes(p.brand));
        }

        filtered = filtered.filter(p => p.price <= activeFilters.priceMax);

        // Sort
        switch(activeSort) {
            case 'price-low':
                filtered.sort((a,b) => a.price - b.price);
                break;
            case 'price-high':
                filtered.sort((a,b) => b.price - a.price);
                break;
            case 'rating':
                filtered.sort((a,b) => b.rating - a.rating);
                break;
            case 'newest':
                filtered = filtered.filter(p => p.badges?.includes('new')).concat(filtered.filter(p => !p.badges?.includes('new')));
                break;
            default:
                filtered.sort((a,b) => b.reviews - a.reviews);
        }

        // If this is a reset (filter change), recompute and replace
        if (reset) {
            lastFiltered = filtered;
            loadedCount = 0;
            productsContainer.innerHTML = '';
        }

        const totalResults = lastFiltered.length;

        if (totalResults === 0) {
            productsContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 60px 0; color: #666;"><i class="far fa-frown" style="font-size: 48px; margin-bottom: 16px; display: block;"></i><p>لم نجد منتجات في هذا القسم</p></div>';
            renderLoadMore(0);
            updateResultsCounter(0, 0);
            return;
        }

        // Append next batch
        const nextCount = Math.min(loadedCount + PER_PAGE, totalResults);
        const newItems = lastFiltered.slice(loadedCount, nextCount);
        const html = newItems.map(createProductCard).join('');
        productsContainer.insertAdjacentHTML('beforeend', html);
        loadedCount = nextCount;

        updateResultsCounter(loadedCount, totalResults);
        renderLoadMore(totalResults);
    }

    function updateResultsCounter(loaded, total) {
        const countEl = document.getElementById('resultsCount');
        if (countEl) {
            countEl.textContent = total === 0
                ? '0 منتج'
                : `عرض ${loaded.toLocaleString('ar-EG')} من ${total.toLocaleString('ar-EG')} منتج`;
        }
    }

    function renderLoadMore(totalResults) {
        let lmEl = document.getElementById('loadMoreWrap');
        if (!lmEl) {
            lmEl = document.createElement('div');
            lmEl.id = 'loadMoreWrap';
            lmEl.className = 'load-more-wrap';
            productsContainer.parentNode.appendChild(lmEl);
        }

        if (totalResults === 0) { lmEl.innerHTML = ''; return; }

        const remaining = totalResults - loadedCount;

        if (remaining <= 0) {
            lmEl.innerHTML = '<div class="all-loaded"><i class="fas fa-check-circle"></i> تم عرض جميع المنتجات (' + totalResults.toLocaleString('ar-EG') + ')</div>';
            return;
        }

        // Show progress bar + load-more button + sentinel for infinite scroll
        const pct = Math.round((loadedCount / totalResults) * 100);
        lmEl.innerHTML = `
            <div class="load-progress">
                <div class="load-progress-bar"><div class="load-progress-fill" style="width:${pct}%;"></div></div>
                <div class="load-progress-text">${loadedCount.toLocaleString('ar-EG')} / ${totalResults.toLocaleString('ar-EG')}</div>
            </div>
            <button class="load-more-btn" id="loadMoreBtn">
                <i class="fas fa-plus-circle"></i>
                عرض المزيد
                <span class="load-more-remaining">(${remaining.toLocaleString('ar-EG')} متبقي)</span>
            </button>
            <div id="loadMoreSentinel" style="height: 1px;"></div>
        `;

        document.getElementById('loadMoreBtn').addEventListener('click', () => {
            applyFilters(false);
        });

        // Set up infinite scroll observer
        setupInfiniteScroll();
    }

    let infiniteScrollObserver = null;
    function setupInfiniteScroll() {
        if (infiniteScrollObserver) infiniteScrollObserver.disconnect();

        const sentinel = document.getElementById('loadMoreSentinel');
        if (!sentinel || !('IntersectionObserver' in window)) return;

        infiniteScrollObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && loadedCount < lastFiltered.length) {
                    applyFilters(false);
                }
            });
        }, { rootMargin: '400px' });

        infiniteScrollObserver.observe(sentinel);
    }

    function resetAndApply() {
        currentPage = 1;
        applyFilters();
    }

    // Populate brand filter dynamically from PRODUCTS data
    function populateBrandFilter() {
        const container = document.getElementById('dynamicBrandList');
        if (!container || !PRODUCTS || PRODUCTS.length === 0) return;

        const brandCounts = {};
        PRODUCTS.forEach(p => {
            if (p.brand) brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
        });

        const sortedBrands = Object.entries(brandCounts)
            .sort((a, b) => b[1] - a[1]); // sort by count descending

        container.innerHTML = sortedBrands.map(([brand, count]) => `
            <label>
                <input type="checkbox" name="brand-filter" value="${brand.replace(/"/g, '&quot;')}">
                <span>${brand}</span>
                <span class="filter-count">(${count.toLocaleString('ar-EG')})</span>
            </label>
        `).join('');

        // Re-wire up brand checkbox listeners (since we replaced the DOM)
        container.querySelectorAll('[name="brand-filter"]').forEach(cb => {
            if (initialBrand && cb.value.toLowerCase().replace(/[^a-z]/g,'') === initialBrand.toLowerCase().replace(/[^a-z]/g,'')) {
                cb.checked = true;
                if (!activeFilters.brands.includes(cb.value)) activeFilters.brands.push(cb.value);
            }
            cb.addEventListener('change', () => {
                activeFilters.brands = Array.from(document.querySelectorAll('[name="brand-filter"]:checked')).map(c => c.value);
                resetAndApply();
            });
        });
    }
    populateBrandFilter();

    // Type filter checkboxes
    document.querySelectorAll('[name="type-filter"]').forEach(cb => {
        cb.addEventListener('change', () => {
            activeFilters.types = Array.from(document.querySelectorAll('[name="type-filter"]:checked')).map(c => c.value);
            resetAndApply();
        });
    });

    // Brand filter checkboxes
    document.querySelectorAll('[name="brand-filter"]').forEach(cb => {
        if (initialBrand && cb.value.toLowerCase().replace(/[^a-z]/g,'') === initialBrand.toLowerCase().replace(/[^a-z]/g,'')) {
            cb.checked = true;
            activeFilters.brands.push(cb.value);
        }
        cb.addEventListener('change', () => {
            activeFilters.brands = Array.from(document.querySelectorAll('[name="brand-filter"]:checked')).map(c => c.value);
            resetAndApply();
        });
    });

    // Category sidebar
    document.querySelectorAll('[name="category-filter"]').forEach(cb => {
        cb.addEventListener('change', () => {
            activeFilters.category = cb.value;
            resetAndApply();
        });
    });

    // Search input on products page
    const productsSearchInput = document.getElementById('productsSearchInput');
    if (productsSearchInput) {
        if (initialSearch) productsSearchInput.value = initialSearch;
        let searchTimer;
        productsSearchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => {
                activeFilters.search = e.target.value.trim();
                resetAndApply();
            }, 300);
        });
    }

    // Price range
    const priceRange = document.getElementById('priceRange');
    const priceValue = document.getElementById('priceValue');
    if (priceRange && priceValue) {
        priceRange.addEventListener('input', () => {
            activeFilters.priceMax = parseInt(priceRange.value);
            priceValue.textContent = `עד ₪${priceRange.value}`;
            applyFilters();
        });
    }

    // Sort
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            activeSort = sortSelect.value;
            applyFilters();
        });
    }

    // Set initial category in heading
    const pageTitle = document.getElementById('productsPageTitle');
    if (pageTitle) {
        const titles = {
            all: 'جميع المنتجات',
            women: 'عطور نسائية',
            men: 'عطور رجالية',
            unisex: 'عطور للجنسين',
            bakhoor: 'بخور ومسك',
            perfumes: 'جميع العطور',
            sets: 'مجموعات الإهداء',
            gifts: 'فن الإهداء',
            new: 'وصل حديثاً',
            sale: 'العروض والتخفيضات',
            bestseller: 'الأكثر مبيعاً',
            makeup: 'المكياج',
            care: 'العناية',
            face: 'منتجات الوجه',
            eyes: 'منتجات العيون',
            lips: 'منتجات الشفاه',
            cheeks: 'منتجات الخدود',
            skin: 'العناية بالبشرة',
            hair: 'العناية بالشعر',
            oral: 'العناية بالأسنان',
            brands: 'جميع الماركات'
        };
        pageTitle.textContent = titles[initialCat] || 'جميع المنتجات';
        document.title = (titles[initialCat] || 'جميع المنتجات') + ' | ORVANE';
    }

    applyFilters();
}
