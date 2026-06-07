# ORVANE

موقع تجارة إلكترونية للعطور ومنتجات التجميل والعناية بالبشرة - عربي / RTL.

E-commerce site for perfumes, cosmetics, and skincare products - Arabic / RTL.

## 🚀 الميزات

- **+1,900 منتج** من **53+ ماركة** عالمية
- **بحث وفلترة متقدمة** (ماركة، فئة، نوع، سعر)
- **Infinite scroll** للتصفّح المتواصل
- **سلة تسوق** كاملة بـ localStorage
- **لوحة إدارة** لرفع صور المنتجات وشعارات الماركات
- **Quick view modal** للعرض السريع
- **متجاوب** لجميع الأجهزة
- **بدون backend** - يعمل من أي host ثابت (GitHub Pages, Netlify, Vercel)

## 📁 بنية المشروع

```
orvane2/
├── index.html              # الصفحة الرئيسية
├── admin.html              # لوحة إدارة الصور والشعارات
├── pages/
│   ├── products.html       # كتالوج المنتجات + فلاتر
│   ├── about.html          # من نحن
│   └── contact.html        # اتصل بنا
├── css/
│   └── style.css           # كل التصميم
├── js/
│   ├── products-data.js    # بيانات المنتجات (مولّدة من CSV)
│   ├── products.js         # دوال المنتجات + توليد SVG
│   ├── main.js             # المنطق الرئيسي (سلة، فلترة، إلخ)
│   └── admin.js            # منطق لوحة الإدارة
├── assets/
│   └── logo.png            # شعار الموقع
└── import_csv.js           # سكريبت استيراد المنتجات
```

## 🛠️ التشغيل المحلي

ما يحتاج build خطوة. فقط:

```bash
# افتح index.html في المتصفح مباشرة
# أو شغّل server بسيط:
python -m http.server 8000
# ثم افتح: http://localhost:8000
```

## 📥 استيراد منتجات جديدة

```bash
# 1. ضع ملف CSV بصيغة:
#    اسم المنتج, السعر, صورة المنتج, رابط المنتج, البراند, الوصف, SKU

# 2. شغّل السكريبت
node import_csv.js

# 3. حوّل JSON → JS
node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('products.json'));fs.writeFileSync('js/products-data.js','window.PRODUCTS_DATA = '+JSON.stringify(p)+';');"
```

## 🎨 الستاك التقني

- **HTML5 / CSS3** - بدون أي framework
- **Vanilla JavaScript** - بدون React/Vue
- **Font**: Cairo (Arabic) + Open Sans
- **Icons**: Font Awesome 6
- **Storage**: localStorage (سلة، صور مخصصة، شعارات)

## 📱 نظام الصور

3 طبقات احتياطية:
1. **صور مرفوعة** من لوحة الإدارة (localStorage)
2. **صور CDN** من المورد
3. **SVG fallback** - بطاقات أنيقة عند فشل التحميل

## 🌐 النشر

### GitHub Pages
```bash
# في إعدادات الـ Repo:
Settings → Pages → Source: main branch / root
```

### Netlify
```bash
netlify deploy --prod --dir=.
```

### Vercel
```bash
vercel --prod
```

## 📝 License

Private project.

---

Built with ♥
