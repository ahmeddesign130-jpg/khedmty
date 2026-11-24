export const SERVICE_CATEGORIES = {
  "برمجة وتطوير": ["برمجة مواقع", "تطبيقات موبايل", "متاجر إلكترونية", "أنظمة إدارية", "قواعد بيانات", "إصلاح أخطاء برمجية"],
  "تصميم": ["تصميم شعارات وهوية", "تصميم سوشيال ميديا", "UI/UX", "تصميم مطبوعات", "موشن جرافيك"],
  "تسويق رقمي": ["إدارة حسابات التواصل", "إعلانات ممولة", "SEO", "كتابة محتوى تسويقي", "تحليل السوق"],
  "كتابة وترجمة": ["كتابة مقالات", "كتابة إعلانية", "ترجمة", "تدقيق لغوي", "تفريغ صوتي"],
  "فيديو وصوت": ["مونتاج فيديو", "موشن جرافيك", "تعليق صوتي", "تحرير صوت"],
  "أعمال وخدمات": ["إدخال بيانات", "مساعد افتراضي", "استشارات", "خدمة عملاء"],
} as const;

export type ServiceCategory = keyof typeof SERVICE_CATEGORIES;
export const SERVICE_CATEGORY_NAMES = Object.keys(SERVICE_CATEGORIES) as ServiceCategory[];
export function getSubcategories(category: string): readonly string[] {
  return (SERVICE_CATEGORIES as Record<string, readonly string[]>)[category] ?? [];
}
export function isValidServiceCategory(category: string, subcategory: string): boolean {
  return getSubcategories(category).includes(subcategory);
}
