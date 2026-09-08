/** Arabic labels for questionnaire answers stored in requests.details */
const KEY_LABELS: Record<string, string> = {
  sign_type: 'نوع اللوحة', dimensions: 'المقاسات', lighting: 'إضاءة', work_type: 'نوع العمل', area_sqm: 'المساحة (م²)', has_drawings: 'مخططات جاهزة',
  finish_type: 'الأعمال المطلوبة', property_type: 'نوع العقار', site_type: 'نوع الموقع', camera_count: 'عدد الكاميرات', needs_remote: 'متابعة من الجوال',
  has_brand: 'هوية بصرية جاهزة', features: 'المميزات المطلوبة', ac_type: 'نوع التكييف', units: 'عدد الوحدات', monthly_bill: 'فاتورة الكهرباء الشهرية', extra: 'تفاصيل إضافية',
};
const VALUE_LABELS: Record<string, string> = {
  outdoor: 'لوحة خارجية', indoor: 'لوحة داخلية', neon: 'نيون / أكريليك مضيء', digital: 'شاشة رقمية', vehicle: 'تغليف سيارات', other: 'أخرى',
  build: 'بناء جديد', extension: 'ملحق / توسعة', renovation: 'ترميم', demolition: 'هدم وإزالة',
  paint: 'دهانات', gypsum: 'جبس بورد', tiles: 'بلاط ورخام', doors: 'أبواب ونوافذ', electrical: 'كهرباء', plumbing: 'سباكة', full: 'تشطيب كامل',
  apartment: 'شقة', villa: 'فيلا', office: 'مكتب', shop: 'محل تجاري', warehouse: 'مستودع', building: 'عمارة', farm: 'مزرعة / استراحة', commercial: 'منشأة تجارية', industrial: 'منشأة صناعية',
  store: 'متجر إلكتروني', corporate: 'موقع تعريفي', app: 'تطبيق جوال', landing: 'صفحة هبوط',
  split: 'سبليت', central: 'مركزي', ducted: 'كونسيلد', maintenance: 'صيانة',
};

export function detailsToItems(details: Record<string, unknown>): { label: string; value: string }[] {
  return Object.entries(details)
    .filter(([, v]) => v !== '' && v != null && !(Array.isArray(v) && v.length === 0))
    .map(([k, v]) => ({
      label: KEY_LABELS[k] ?? k,
      value: typeof v === 'boolean' ? (v ? 'نعم' : 'لا') : Array.isArray(v) ? v.map((x) => VALUE_LABELS[String(x)] ?? String(x)).join('، ') : VALUE_LABELS[String(v)] ?? String(v),
    }));
}
