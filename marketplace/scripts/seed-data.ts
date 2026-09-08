/** Realistic Arabic demo data for Saudi Arabia. */
export const CITIES = [
  { slug: 'riyadh', name_ar: 'الرياض', region_ar: 'منطقة الرياض' },
  { slug: 'jeddah', name_ar: 'جدة', region_ar: 'منطقة مكة المكرمة' },
  { slug: 'dammam', name_ar: 'الدمام', region_ar: 'المنطقة الشرقية' },
  { slug: 'khobar', name_ar: 'الخبر', region_ar: 'المنطقة الشرقية' },
  { slug: 'makkah', name_ar: 'مكة المكرمة', region_ar: 'منطقة مكة المكرمة' },
  { slug: 'madinah', name_ar: 'المدينة المنورة', region_ar: 'منطقة المدينة المنورة' },
];

export const CATEGORIES: { slug: string; name_ar: string; description_ar: string; icon: string; keywords: string[]; subs: { slug: string; name_ar: string; keywords: string[] }[] }[] = [
  { slug: 'signage', name_ar: 'اللوحات والإعلانات', description_ar: 'لوحات المحلات، النيون، الأكريليك، الشاشات، تغليف السيارات', icon: 'signpost', keywords: ['لوحة', 'لوحه', 'لوحات', 'اعلان', 'إعلان', 'نيون', 'اكريليك', 'أكريليك', 'واجهة محل', 'بنر', 'استاند', 'ستيكر', 'تغليف'],
    subs: [
      { slug: 'outdoor-signs', name_ar: 'لوحات خارجية للمحلات', keywords: ['لوحة خارجية', 'لوحة محل', 'واجهة', 'كلادينج'] },
      { slug: 'neon-acrylic', name_ar: 'نيون وأكريليك مضيء', keywords: ['نيون', 'اكريليك', 'أكريليك', 'مضيء', 'حروف بارزة'] },
      { slug: 'digital-screens', name_ar: 'شاشات إعلانية', keywords: ['شاشة', 'شاشات', 'led', 'ليد'] },
      { slug: 'vehicle-wrap', name_ar: 'تغليف السيارات', keywords: ['تغليف', 'سيارة', 'سيارات', 'ستيكر'] },
      { slug: 'print', name_ar: 'طباعة وبنرات', keywords: ['طباعة', 'بنر', 'رول اب', 'استاند', 'فلكس'] },
    ] },
  { slug: 'contracting', name_ar: 'المقاولات', description_ar: 'بناء، ترميم، ملاحق، هدم، أعمال هيكلية', icon: 'hard-hat', keywords: ['مقاول', 'مقاولات', 'بناء', 'عظم', 'ملحق', 'ترميم', 'هدم', 'خرسانة', 'أساسات', 'فيلا عظم', 'سور'],
    subs: [
      { slug: 'new-build', name_ar: 'بناء جديد', keywords: ['بناء', 'عظم', 'فيلا', 'عمارة'] },
      { slug: 'extension', name_ar: 'ملاحق وتوسعة', keywords: ['ملحق', 'توسعة', 'دور'] },
      { slug: 'renovation', name_ar: 'ترميم', keywords: ['ترميم', 'تجديد', 'إصلاح'] },
      { slug: 'demolition', name_ar: 'هدم وإزالة', keywords: ['هدم', 'إزالة', 'ازالة'] },
    ] },
  { slug: 'finishing', name_ar: 'التشطيبات', description_ar: 'دهانات، جبس، بلاط، رخام، أبواب، كهرباء وسباكة', icon: 'paint-roller', keywords: ['تشطيب', 'تشطيبات', 'دهان', 'دهانات', 'جبس', 'بلاط', 'رخام', 'بورسلان', 'سيراميك', 'أبواب', 'كهرباء', 'سباكة', 'ديكور'],
    subs: [
      { slug: 'paint', name_ar: 'دهانات', keywords: ['دهان', 'دهانات', 'بوية', 'صبغ'] },
      { slug: 'gypsum', name_ar: 'جبس بورد وأسقف', keywords: ['جبس', 'جبسم', 'أسقف', 'اسقف'] },
      { slug: 'tiles', name_ar: 'بلاط ورخام', keywords: ['بلاط', 'رخام', 'بورسلان', 'سيراميك', 'باركيه'] },
      { slug: 'full-finishing', name_ar: 'تشطيب كامل', keywords: ['تشطيب كامل', 'تشطيب شقة', 'تشطيب فيلا'] },
      { slug: 'electrical-plumbing', name_ar: 'كهرباء وسباكة', keywords: ['كهرباء', 'كهربائي', 'سباكة', 'سباك'] },
    ] },
  { slug: 'security', name_ar: 'أنظمة الأمن والسلامة', description_ar: 'كاميرات مراقبة، أنظمة إنذار، إطفاء حريق، أنظمة دخول', icon: 'shield-check', keywords: ['كاميرا', 'كاميرات', 'مراقبة', 'انذار', 'إنذار', 'حريق', 'اطفاء', 'إطفاء', 'بصمة', 'بوابة', 'سلامة', 'أمن', 'امن', 'انتركم'],
    subs: [
      { slug: 'cctv', name_ar: 'كاميرات مراقبة', keywords: ['كاميرا', 'كاميرات', 'مراقبة', 'dvr', 'nvr'] },
      { slug: 'fire', name_ar: 'أنظمة إطفاء وإنذار حريق', keywords: ['حريق', 'إطفاء', 'اطفاء', 'إنذار', 'انذار', 'دفاع مدني', 'سلامة'] },
      { slug: 'access', name_ar: 'أنظمة الدخول والبصمة', keywords: ['بصمة', 'بوابة', 'دخول', 'انتركم', 'access'] },
      { slug: 'alarm', name_ar: 'أنظمة إنذار ضد السرقة', keywords: ['سرقة', 'إنذار', 'حساسات'] },
    ] },
  { slug: 'web', name_ar: 'المواقع والمتاجر الإلكترونية', description_ar: 'تصميم مواقع، متاجر إلكترونية، تطبيقات، هوية بصرية', icon: 'globe', keywords: ['موقع', 'مواقع', 'متجر', 'متجر الكتروني', 'إلكتروني', 'الكتروني', 'تطبيق', 'برمجة', 'سلة', 'زد', 'شوبيفاي', 'ووردبريس', 'هوية', 'شعار', 'لوقو', 'لوجو', 'سيو', 'تصميم موقع'],
    subs: [
      { slug: 'ecommerce', name_ar: 'متاجر إلكترونية', keywords: ['متجر', 'سلة', 'زد', 'شوبيفاي', 'بيع'] },
      { slug: 'corporate-site', name_ar: 'مواقع الشركات', keywords: ['موقع شركة', 'موقع تعريفي', 'ووردبريس'] },
      { slug: 'mobile-app', name_ar: 'تطبيقات الجوال', keywords: ['تطبيق', 'ايفون', 'اندرويد', 'أندرويد'] },
      { slug: 'branding', name_ar: 'هوية بصرية وشعارات', keywords: ['هوية', 'شعار', 'لوقو', 'لوجو', 'براند'] },
    ] },
  { slug: 'hvac', name_ar: 'التكييف', description_ar: 'تركيب وصيانة المكيفات السبليت والمركزي والمخفي', icon: 'wind', keywords: ['مكيف', 'مكيفات', 'تكييف', 'سبليت', 'مركزي', 'كونسيلد', 'دكت', 'تبريد', 'فريون', 'صيانة مكيف'],
    subs: [
      { slug: 'split', name_ar: 'تركيب مكيفات سبليت', keywords: ['سبليت', 'اسبلت', 'شباك'] },
      { slug: 'central', name_ar: 'تكييف مركزي ومخفي', keywords: ['مركزي', 'كونسيلد', 'مخفي', 'دكت', 'شيلر'] },
      { slug: 'maintenance', name_ar: 'صيانة وتنظيف', keywords: ['صيانة', 'تنظيف', 'فريون', 'تعبئة'] },
    ] },
  { slug: 'solar', name_ar: 'الطاقة الشمسية', description_ar: 'أنظمة الطاقة الشمسية للمنازل والمزارع والمنشآت', icon: 'sun', keywords: ['طاقة شمسية', 'شمسية', 'الواح', 'ألواح', 'سولار', 'solar', 'انفرتر', 'بطاريات', 'كهرباء شمسية'],
    subs: [
      { slug: 'residential-solar', name_ar: 'أنظمة منزلية', keywords: ['منزل', 'فيلا', 'سطح'] },
      { slug: 'farm-solar', name_ar: 'مزارع واستراحات', keywords: ['مزرعة', 'استراحة', 'بئر', 'غاطس'] },
      { slug: 'commercial-solar', name_ar: 'منشآت تجارية وصناعية', keywords: ['مصنع', 'مستودع', 'تجاري', 'صناعي'] },
    ] },
  { slug: 'moving', name_ar: 'النقل', description_ar: 'نقل عفش، نقل مكاتب، شحن داخلي', icon: 'truck', keywords: ['نقل', 'عفش', 'اثاث', 'أثاث', 'شحن', 'نقل مكتب', 'دينا', 'تغليف عفش'],
    subs: [
      { slug: 'home-moving', name_ar: 'نقل عفش منازل', keywords: ['عفش', 'منزل', 'شقة'] },
      { slug: 'office-moving', name_ar: 'نقل مكاتب وشركات', keywords: ['مكتب', 'شركة'] },
    ] },
  { slug: 'cleaning', name_ar: 'التنظيف', description_ar: 'تنظيف منازل، شركات، خزانات، واجهات، مكافحة حشرات', icon: 'sparkles', keywords: ['تنظيف', 'نظافة', 'غسيل', 'خزانات', 'مكافحة', 'حشرات', 'تعقيم', 'جلي', 'واجهات'],
    subs: [
      { slug: 'home-cleaning', name_ar: 'تنظيف منازل', keywords: ['منزل', 'شقة', 'فيلا'] },
      { slug: 'commercial-cleaning', name_ar: 'تنظيف شركات ومنشآت', keywords: ['شركة', 'مكتب', 'مبنى', 'واجهات'] },
      { slug: 'pest-control', name_ar: 'مكافحة حشرات', keywords: ['حشرات', 'مكافحة', 'رش'] },
    ] },
  { slug: 'kitchens', name_ar: 'المطابخ', description_ar: 'مطابخ ألمنيوم وخشب، خزائن، تفصيل حسب المقاس', icon: 'chef-hat', keywords: ['مطبخ', 'مطابخ', 'خزائن', 'المنيوم', 'ألمنيوم', 'خشب', 'دولاب', 'تفصيل مطبخ'],
    subs: [
      { slug: 'aluminum-kitchens', name_ar: 'مطابخ ألمنيوم', keywords: ['المنيوم', 'ألمنيوم'] },
      { slug: 'wood-kitchens', name_ar: 'مطابخ خشب', keywords: ['خشب', 'خشبي'] },
      { slug: 'wardrobes', name_ar: 'خزائن ودواليب', keywords: ['خزائن', 'دولاب', 'دواليب', 'غرف ملابس'] },
    ] },
  { slug: 'interior', name_ar: 'التصميم الداخلي', description_ar: 'تصميم داخلي، ديكور، أثاث، تنفيذ مشاريع', icon: 'sofa', keywords: ['تصميم داخلي', 'ديكور', 'ديكورات', 'مهندس ديكور', 'تصميم مكتب', 'تصميم مطعم', 'تصميم كافيه', 'أثاث'],
    subs: [
      { slug: 'residential-interior', name_ar: 'تصميم سكني', keywords: ['فيلا', 'شقة', 'مجلس', 'غرفة'] },
      { slug: 'commercial-interior', name_ar: 'تصميم تجاري (مطاعم، مكاتب، محلات)', keywords: ['مطعم', 'كافيه', 'مكتب', 'محل', 'صالون'] },
    ] },
  { slug: 'business', name_ar: 'خدمات الشركات', description_ar: 'محاسبة، تأسيس شركات، تسويق، موارد بشرية، استشارات', icon: 'briefcase', keywords: ['محاسبة', 'محاسب', 'ضريبة', 'زكاة', 'تأسيس', 'سجل تجاري', 'تسويق', 'اعلانات ممولة', 'سوشيال', 'موارد بشرية', 'استشارات', 'قانوني', 'محامي'],
    subs: [
      { slug: 'accounting', name_ar: 'محاسبة وضرائب', keywords: ['محاسبة', 'محاسب', 'ضريبة', 'زكاة', 'قوائم مالية'] },
      { slug: 'marketing', name_ar: 'تسويق رقمي', keywords: ['تسويق', 'اعلانات', 'سوشيال', 'محتوى', 'ممولة'] },
      { slug: 'legal', name_ar: 'خدمات قانونية وتأسيس', keywords: ['تأسيس', 'سجل', 'قانوني', 'محامي', 'عقود'] },
      { slug: 'hr', name_ar: 'موارد بشرية وتوظيف', keywords: ['موارد بشرية', 'توظيف', 'رواتب'] },
    ] },
];

export const PRICING_RULES = [
  { name_ar: 'مشروع صغير (أقل من 10,000 ر.س)', min: null, max: 9999, price: 99, priority: 10 },
  { name_ar: 'مشروع متوسط (10,000 – 50,000 ر.س)', min: 10000, max: 50000, price: 199, priority: 10 },
  { name_ar: 'مشروع كبير (أكثر من 50,000 ر.س)', min: 50001, max: null, price: 399, priority: 10 },
];

export const PLANS = [
  { slug: 'starter', name_ar: 'الباقة الأساسية', description_ar: 'مناسبة للشركات الناشئة', price_monthly: 499, included_leads: 4, features: ['4 عملاء مختارين شهريًا', 'ملف تجاري موثّق', 'إشعارات فورية بالطلبات'], sort_order: 1 },
  { slug: 'pro', name_ar: 'الباقة الاحترافية', description_ar: 'للشركات النشطة التي تقدم عروضًا بانتظام', price_monthly: 999, included_leads: 10, features: ['10 عملاء مختارين شهريًا', 'شارة "عرض مميز" على عروضك', 'أولوية في المطابقة', 'دعم مخصص'], sort_order: 2 },
];

export interface SeedSupplier {
  email: string; name: string; company: string; slug: string; city: string; cities: string[]; categories: { cat: string; subs: string[] }[];
  years: number; description: string; phone: string; whatsapp?: string; website?: string; rating: number; ratingCount: number; quotations: number; won: number; completed: number;
  responseMinutes: number; minBudget?: number; maxBudget?: number; credits?: number; verified?: boolean; cr?: string;
}

export const SUPPLIERS: SeedSupplier[] = [
  { email: 'supplier1@demo.sa', name: 'عبدالله الحربي', company: 'شركة الأفق للوحات الإعلانية', slug: 'ofoq-signs', city: 'riyadh', cities: ['riyadh'], categories: [{ cat: 'signage', subs: ['outdoor-signs', 'neon-acrylic', 'digital-screens'] }], years: 9,
    description: 'متخصصون في تصميم وتصنيع وتركيب لوحات المحلات والواجهات التجارية في الرياض منذ 2015. مصنع خاص، تركيب خلال 5-7 أيام، وضمان على الإضاءة.', phone: '0551000001', whatsapp: '0551000001', website: 'https://ofoq-signs.example', rating: 4.8, ratingCount: 37, quotations: 120, won: 41, completed: 38, responseMinutes: 45, minBudget: 3000, maxBudget: 150000, credits: 300, cr: '1010456789' },
  { email: 'supplier2@demo.sa', name: 'سلطان المطيري', company: 'مؤسسة ضوء المدينة للإعلان', slug: 'city-light-ads', city: 'riyadh', cities: ['riyadh', 'khobar', 'dammam'], categories: [{ cat: 'signage', subs: ['outdoor-signs', 'print', 'vehicle-wrap'] }], years: 5,
    description: 'حلول إعلانية متكاملة: لوحات خارجية، بنرات، تغليف سيارات. أسعار تنافسية وتسليم سريع.', phone: '0551000002', rating: 4.3, ratingCount: 18, quotations: 64, won: 15, completed: 14, responseMinutes: 120, minBudget: 1000, maxBudget: 60000, credits: 0, cr: '1010456790' },
  { email: 'supplier3@demo.sa', name: 'ماجد الدوسري', company: 'إبداع الخليج للنيون والأكريليك', slug: 'gulf-neon', city: 'jeddah', cities: ['jeddah', 'makkah', 'riyadh'], categories: [{ cat: 'signage', subs: ['neon-acrylic', 'outdoor-signs'] }], years: 12,
    description: 'أكثر من 12 سنة في تصنيع الحروف البارزة والنيون والأكريليك المضيء للمطاعم والكافيهات والمحلات.', phone: '0551000003', rating: 4.6, ratingCount: 52, quotations: 180, won: 60, completed: 57, responseMinutes: 30, minBudget: 2000, maxBudget: 200000, credits: 120, cr: '4030456791' },
  { email: 'supplier4@demo.sa', name: 'خالد الشمري', company: 'شركة البنيان الحديث للمقاولات', slug: 'albunyan-contracting', city: 'riyadh', cities: ['riyadh'], categories: [{ cat: 'contracting', subs: ['new-build', 'extension', 'renovation'] }, { cat: 'finishing', subs: ['full-finishing'] }], years: 15,
    description: 'مقاولات عامة درجة ثالثة. بناء فلل وعمائر، ملاحق، ترميم وتشطيب كامل. فريق هندسي مقيم وإشراف يومي.', phone: '0551000004', rating: 4.5, ratingCount: 24, quotations: 70, won: 22, completed: 20, responseMinutes: 240, minBudget: 50000, credits: 0, cr: '1010456792' },
  { email: 'supplier5@demo.sa', name: 'ناصر القحطاني', company: 'لمسات للتشطيبات والديكور', slug: 'lamasat-finishing', city: 'riyadh', cities: ['riyadh'], categories: [{ cat: 'finishing', subs: ['paint', 'gypsum', 'tiles', 'full-finishing'] }, { cat: 'interior', subs: ['residential-interior'] }], years: 8,
    description: 'تشطيبات شقق وفلل: دهانات، جبس بورد، بلاط ورخام، وتشطيب كامل بالمفتاح. أعمال منفذة في أكثر من 200 وحدة سكنية.', phone: '0551000005', rating: 4.7, ratingCount: 45, quotations: 150, won: 55, completed: 52, responseMinutes: 60, minBudget: 5000, maxBudget: 300000, credits: 400, cr: '1010456793' },
  { email: 'supplier6@demo.sa', name: 'فيصل العنزي', company: 'الدرع الذكي لأنظمة الأمن', slug: 'smart-shield', city: 'dammam', cities: ['dammam', 'khobar'], categories: [{ cat: 'security', subs: ['cctv', 'access', 'alarm'] }], years: 7,
    description: 'كاميرات مراقبة عالية الدقة، أنظمة بصمة وبوابات، إنذار ضد السرقة. تركيب معتمد وربط بالجوال.', phone: '0551000006', rating: 4.9, ratingCount: 31, quotations: 95, won: 40, completed: 39, responseMinutes: 25, minBudget: 2000, maxBudget: 500000, credits: 200, cr: '2050456794' },
  { email: 'supplier7@demo.sa', name: 'تركي السبيعي', company: 'شركة الحماية المتقدمة للسلامة', slug: 'advanced-safety', city: 'riyadh', cities: ['riyadh', 'dammam', 'jeddah'], categories: [{ cat: 'security', subs: ['cctv', 'fire'] }], years: 11,
    description: 'أنظمة إطفاء وإنذار حريق معتمدة من الدفاع المدني، وكاميرات مراقبة للمستودعات والمصانع والمنشآت التجارية.', phone: '0551000007', rating: 4.4, ratingCount: 20, quotations: 80, won: 25, completed: 24, responseMinutes: 90, minBudget: 5000, credits: 0, cr: '1010456795' },
  { email: 'supplier8@demo.sa', name: 'ريم الغامدي', company: 'تقنية الشرق للحلول الأمنية', slug: 'east-tech-security', city: 'khobar', cities: ['khobar', 'dammam'], categories: [{ cat: 'security', subs: ['cctv'] }], years: 4,
    description: 'تركيب كاميرات مراقبة للمنازل والمحلات والمستودعات بأسعار مناسبة مع ضمان سنتين على الأجهزة.', phone: '0551000008', rating: 4.2, ratingCount: 9, quotations: 30, won: 8, completed: 8, responseMinutes: 180, minBudget: 1500, maxBudget: 80000, credits: 0, cr: '2050456796' },
  { email: 'supplier9@demo.sa', name: 'سارة باخشوين', company: 'نبض الرقمية لتقنية المعلومات', slug: 'nabd-digital', city: 'jeddah', cities: ['jeddah', 'riyadh', 'dammam', 'khobar', 'makkah', 'madinah'], categories: [{ cat: 'web', subs: ['ecommerce', 'corporate-site', 'branding'] }, { cat: 'business', subs: ['marketing'] }], years: 6,
    description: 'نبني متاجر إلكترونية ومواقع شركات وهويات بصرية. شركاء معتمدون لمنصة سلة وزد، ونقدم خدمات التسويق الرقمي.', phone: '0551000009', website: 'https://nabd.example', rating: 4.7, ratingCount: 41, quotations: 130, won: 44, completed: 42, responseMinutes: 40, minBudget: 3000, maxBudget: 250000, credits: 100, cr: '4030456797' },
  { email: 'supplier10@demo.sa', name: 'يوسف الزهراني', company: 'كود سوفت لتطوير البرمجيات', slug: 'codesoft', city: 'riyadh', cities: ['riyadh', 'jeddah', 'dammam', 'khobar', 'makkah', 'madinah'], categories: [{ cat: 'web', subs: ['ecommerce', 'mobile-app', 'corporate-site'] }], years: 9,
    description: 'تطوير متاجر وتطبيقات جوال مخصصة بلغة عربية وإنجليزية، مع ربط بوابات الدفع وشركات الشحن السعودية.', phone: '0551000010', rating: 4.5, ratingCount: 27, quotations: 90, won: 28, completed: 26, responseMinutes: 75, minBudget: 8000, credits: 0, cr: '1010456798' },
  { email: 'supplier11@demo.sa', name: 'بدر العمري', company: 'برودة الخليج للتكييف', slug: 'gulf-cooling', city: 'jeddah', cities: ['jeddah', 'makkah'], categories: [{ cat: 'hvac', subs: ['split', 'central', 'maintenance'] }], years: 10,
    description: 'تركيب وصيانة جميع أنواع المكيفات، وكلاء معتمدون لعدة ماركات، وفريق طوارئ خلال 24 ساعة.', phone: '0551000011', rating: 4.6, ratingCount: 58, quotations: 200, won: 70, completed: 68, responseMinutes: 35, minBudget: 500, maxBudget: 400000, credits: 80, cr: '4030456799' },
  { email: 'supplier12@demo.sa', name: 'هاني بامحسون', company: 'مؤسسة النسيم للتكييف والتبريد', slug: 'naseem-ac', city: 'jeddah', cities: ['jeddah'], categories: [{ cat: 'hvac', subs: ['split', 'maintenance'] }], years: 3,
    description: 'تركيب مكيفات سبليت وصيانة دورية للمنازل والمكاتب في جدة بأسعار مناسبة.', phone: '0551000012', rating: 4.1, ratingCount: 12, quotations: 40, won: 10, completed: 10, responseMinutes: 150, minBudget: 500, maxBudget: 50000, credits: 0, cr: '4030456800' },
  { email: 'supplier13@demo.sa', name: 'محمد باعشن', company: 'شمس الجزيرة للطاقة الشمسية', slug: 'shams-aljazeera', city: 'riyadh', cities: ['riyadh', 'jeddah', 'dammam'], categories: [{ cat: 'solar', subs: ['residential-solar', 'farm-solar', 'commercial-solar'] }], years: 6,
    description: 'أنظمة طاقة شمسية مرتبطة بالشبكة ومنفصلة، مرخصون من هيئة تنظيم الكهرباء، دراسة مجانية للاستهلاك.', phone: '0551000013', rating: 4.8, ratingCount: 22, quotations: 60, won: 24, completed: 22, responseMinutes: 55, minBudget: 15000, credits: 0, cr: '1010456801' },
  { email: 'supplier14@demo.sa', name: 'عمر بن سعيد', company: 'أفكار للتصميم الداخلي', slug: 'afkar-interior', city: 'jeddah', cities: ['jeddah', 'makkah', 'riyadh'], categories: [{ cat: 'interior', subs: ['residential-interior', 'commercial-interior'] }, { cat: 'finishing', subs: ['full-finishing'] }], years: 8,
    description: 'استوديو تصميم داخلي للمنازل والمطاعم والمكاتب، من التصور ثلاثي الأبعاد حتى التنفيذ والتسليم.', phone: '0551000014', rating: 4.9, ratingCount: 33, quotations: 85, won: 36, completed: 34, responseMinutes: 50, minBudget: 10000, credits: 0, cr: '4030456802' },
  { email: 'supplier15@demo.sa', name: 'أحمد الجهني', company: 'الميزان للمحاسبة والاستشارات', slug: 'almizan-accounting', city: 'riyadh', cities: ['riyadh', 'jeddah', 'dammam', 'khobar', 'makkah', 'madinah'], categories: [{ cat: 'business', subs: ['accounting', 'legal', 'hr'] }], years: 14,
    description: 'مكتب محاسبة معتمد: مسك الدفاتر، الإقرارات الضريبية والزكوية، تأسيس الشركات، وخدمات الموارد البشرية.', phone: '0551000015', rating: 4.6, ratingCount: 29, quotations: 75, won: 30, completed: 30, responseMinutes: 100, minBudget: 1000, credits: 0, cr: '1010456803' },
  { email: 'supplier16@demo.sa', name: 'وليد الحازمي', company: 'الحازمي لنقل العفش', slug: 'hazmi-moving', city: 'riyadh', cities: ['riyadh', 'dammam', 'jeddah'], categories: [{ cat: 'moving', subs: ['home-moving', 'office-moving'] }], years: 7,
    description: 'نقل عفش داخل وبين المدن مع فك وتركيب وتغليف، وشاحنات مغلقة مؤمنة.', phone: '0551000016', rating: 4.3, ratingCount: 40, quotations: 160, won: 50, completed: 48, responseMinutes: 20, minBudget: 300, maxBudget: 30000, credits: 0, cr: '1010456804' },
  { email: 'supplier17@demo.sa', name: 'منى الصالح', company: 'نقاء لخدمات التنظيف', slug: 'naqaa-cleaning', city: 'riyadh', cities: ['riyadh'], categories: [{ cat: 'cleaning', subs: ['home-cleaning', 'commercial-cleaning', 'pest-control'] }], years: 5,
    description: 'تنظيف منازل وشركات وخزانات ومكافحة حشرات بعمالة مدربة ومواد آمنة معتمدة.', phone: '0551000017', rating: 4.4, ratingCount: 61, quotations: 220, won: 80, completed: 78, responseMinutes: 15, minBudget: 200, maxBudget: 50000, credits: 0, cr: '1010456805' },
  { email: 'supplier18@demo.sa', name: 'راشد البلوي', company: 'مطابخ الرواد', slug: 'rowad-kitchens', city: 'riyadh', cities: ['riyadh', 'dammam'], categories: [{ cat: 'kitchens', subs: ['aluminum-kitchens', 'wood-kitchens', 'wardrobes'] }], years: 10,
    description: 'تفصيل مطابخ ألمنيوم وخشب وخزائن غرف الملابس حسب المقاس، معرض في الرياض ومصنع خاص.', phone: '0551000018', rating: 4.5, ratingCount: 26, quotations: 70, won: 25, completed: 24, responseMinutes: 80, minBudget: 3000, maxBudget: 120000, credits: 0, cr: '1010456806' },
  { email: 'supplier19@demo.sa', name: 'حسن العسيري', company: 'روافد للإعلان (قيد التوثيق)', slug: 'rawafid-ads', city: 'riyadh', cities: ['riyadh'], categories: [{ cat: 'signage', subs: ['outdoor-signs'] }], years: 2,
    description: 'مؤسسة ناشئة في مجال اللوحات الإعلانية.', phone: '0551000019', rating: 0, ratingCount: 0, quotations: 0, won: 0, completed: 0, responseMinutes: 0, credits: 0, verified: false, cr: '1010456807' },
];

export const CUSTOMERS = [
  { email: 'customer1@demo.sa', name: 'فهد العتيبي', phone: '0559000001', city: 'riyadh', whatsapp: '0559000001', company: 'مؤسسة فهد للتجارة' },
  { email: 'customer2@demo.sa', name: 'نورة القحطاني', phone: '0559000002', city: 'dammam', whatsapp: '0559000002', company: null },
  { email: 'customer3@demo.sa', name: 'محمد الشهري', phone: '0559000003', city: 'jeddah', whatsapp: '0559000003', company: 'عطور الشهري' },
];
