"use client";

import { useEffect } from "react";

const translations: Record<string, string> = {
  "خِدمتي": "Khedmty", "مهارتك تستحق التميز": "Your skills deserve excellence",
  "خِدمتي — مهارتك تستحق التميز": "Khedmty — Your skills deserve excellence",
  "منصة خِدمتي للخدمات المستقلة": "Khedmty Freelance Services Marketplace",
  "تسجيل الدخول": "Log in", "تسجيل الخروج": "Log out", "إنشاء حساب": "Create account",
  "إنشاء حساب جديد": "Create a new account", "تسجيل الدخول": "Log in",
  "سجّل دخولك للوصول إلى حسابك ومتابعة طلباتك.": "Log in to access your account and track your orders.",
  "المتابعة باستخدام Google": "Continue with Google", "أو بالبريد الإلكتروني": "Or continue with email",
  "البريد الإلكتروني": "Email address", "كلمة المرور": "Password", "أدخل كلمة المرور": "Enter your password",
  "دخول": "Log in", "ليس لديك حساب؟": "Don't have an account?", "لديك حساب بالفعل؟": "Already have an account?",
  "العودة للرئيسية": "Back to home", "العودة إلى الرئيسية": "Back to home",
  "انضم إلى خِدمتي وابدأ رحلتك معنا.": "Join Khedmty and get started.",
  "الاسم": "Name", "اكتب اسمك": "Enter your name", "نوع الحساب": "Account type",
  "عميل - أريد شراء الخدمات": "Customer — I want to buy services",
  "مقدم خدمة - أريد عرض خدماتي": "Service provider — I want to offer services",
  "التسجيل كعميل باستخدام Google": "Sign up as a customer with Google",
  "التسجيل كمقدم خدمة باستخدام Google": "Sign up as a provider with Google",
  "إنشاء الحساب": "Create account", "العودة إلى الرئيسية": "Back to home",
  "حسابك قيد المراجعة": "Your account is under review",
  "شكرًا لانضمامك إلى خِدمتي كمقدم خدمة.": "Thank you for joining Khedmty as a service provider.",
  "حسابك حاليًا في انتظار مراجعة وموافقة إدارة المنصة.": "Your account is awaiting review and approval by the platform team.",
  "سنتمكن من إتاحة لوحة مقدم الخدمة بعد الموافقة.": "Your provider dashboard will become available after approval.",
  "لا تحتاج إلى إنشاء حساب جديد. انتظر حتى تنتهي الإدارة من مراجعة حسابك.": "You do not need to create another account. Please wait for the team to review your account.",
  "تسجيل الدخول": "Log in", "لوحة التحكم": "Dashboard", "الرئيسية": "Home",
  "السوق": "Marketplace", "طلباتي": "My orders", "الطلبات": "Orders",
  "الإعدادات": "Settings", "خدماتي": "My services", "لوحة الإدارة": "Admin dashboard",
  "مقدمو الخدمات": "Service providers", "مراجعة الخدمات": "Review services",
  "المدفوعات": "Payments", "القائمة الرئيسية": "Main menu",
  "فتح قائمة خِدمتي": "Open Khedmty menu", "إغلاق القائمة": "Close menu",
  "مرحبًا بك في": "Welcome to", "مهارتك تستحق": "Your skills deserve",
  "التميز": "excellence", "مساحة تجمع أصحاب المهارات بالعملاء، وتساعدك تدير حسابك وطلباتك وخدماتك بسهولة وأمان.": "A place that connects skilled professionals with customers and helps you manage your account, orders, and services with ease and confidence.",
  "ابدأ رحلتك الآن": "Start your journey", "لديك حساب؟ دخول": "Already have an account? Log in",
  "التسجيل كعميل متاح فورًا، وحساب مقدم الخدمة يمر بمراجعة الإدارة.": "Customer accounts are available immediately. Provider accounts require admin approval.",
  "شعارنا": "Our promise", "للعملاء": "For customers", "اطلب بثقة": "Order with confidence",
  "للمستقلين": "For freelancers", "اعرض مهارتك": "Showcase your skills",
  "ببساطة ووضوح": "Simple and clear", "ابدأ مع خِدمتي في 3 خطوات": "Get started with Khedmty in 3 steps",
  "كل ما تحتاجه لإدارة تجربتك في مكان واحد.": "Everything you need to manage your experience in one place.",
  "أنشئ حسابك": "Create your account", "سجّل كعميل أو مقدم خدمة في خطوات بسيطة.": "Sign up as a customer or provider in a few simple steps.",
  "ابدأ بثقة": "Get started with confidence", "تابع طلباتك وخدماتك من لوحة حسابك.": "Track your orders and services from your dashboard.",
  "أنجز واستلم": "Complete and receive", "تابع التنفيذ حتى استلام الخدمة.": "Track progress until your service is delivered.",
  "جميع الحقوق محفوظة.": "All rights reserved.",
  "اكتشف الخدمات التي تناسبك": "Discover services that fit your needs",
  "اختَر الخدمة واطلبها من خلال خِدمتي، وتابع التنفيذ والتسليم بأمان من حسابك.": "Choose and order a service through Khedmty, then securely track its progress and delivery from your account.",
  "خدمة متاحة": "available services", "لا توجد خدمات متاحة حاليًا": "No services are available right now",
  "نعمل على إضافة خدمات جديدة قريبًا.": "We are working on adding new services soon.",
  "العودة للخدمات": "Back to services", "جميع الخدمات": "All services",
  "لا توجد صورة للخدمة": "No service image", "مقدم الخدمة": "Service provider",
  "سعر الخدمة": "Service price", "عرض الخدمة": "View service", "وصف الخدمة": "Service description",
  "تفاصيل الخدمة": "Service details", "تفاصيل الطلب": "Order details",
  "رقم الطلب": "Order number", "رقم الخدمة": "Service number",
  "الخدمة": "Service", "العميل": "Customer", "ملخص المبلغ": "Payment summary",
  "عمولة المنصة": "Platform fee", "الإجمالي": "Total", "آخر عملية دفع": "Latest payment",
  "الحالة:": "Status:", "المبلغ:": "Amount:", "الانتقال إلى الدفع": "Proceed to payment",
  "إلغاء الطلب": "Cancel order", "تأكيد استلام الشغل": "Confirm delivery",
  "بيانات تواصل العميل مخفية عنك. بعد تأكيد الدفع يمكنك تنفيذ العمل وإرساله للإدارة لمراجعته وتسليمه للعميل.": "The customer's contact details are hidden. Once payment is confirmed, you can complete the work and submit it to the team for review and delivery.",
  "في انتظار الدفع": "Awaiting payment", "مراجعة الدفع": "Payment review",
  "تم الدفع": "Paid", "قيد التنفيذ": "In progress", "تم التسليم": "Delivered",
  "مطلوب تعديل": "Revision requested", "مكتمل": "Completed", "ملغي": "Cancelled",
  "مرفوض": "Rejected", "الدفع قيد المراجعة": "Payment under review",
  "تم تأكيد الدفع": "Payment confirmed", "جاري تنفيذ الطلب": "Order in progress",
  "تم تسليم الخدمة": "Service delivered", "قيد مراجعة الإدارة": "Pending admin review",
  "تم اعتماد الدفع": "Payment approved", "تم رفض الدفع": "Payment rejected",
  "حسابي": "My account", "تابع حالة مشترياتك ومدفوعاتك من هنا.": "Track your purchases and payments here.",
  "تقدمك في خِدمتي": "Your Khedmty progress", "طلبات مكتملة": "completed orders",
  "أماكن": "slots", "من 5": "of 5", "لسه مفيش طلبات": "No orders yet",
  "تصفح الخدمات": "Browse services", "الإجمالي": "Total", "تابع حالة مشترياتك والمدفوعات وتفاصيل كل طلب.": "Track your purchases, payments, and order details.",
  "حساب العميل": "Customer account", "كل أدواتك لمتابعة الخدمات والطلبات في مكان واحد.": "Everything you need to manage services and orders in one place.",
  "استكشف الخدمات": "Explore services", "عرض الطلبات": "View orders",
  "مرحبًا بك في خِدمتي": "Welcome to Khedmty", "مساحة مقدم الخدمة": "Provider workspace",
  "أهلاً بك في خِدمتي": "Welcome to Khedmty",
  "أدر خدماتك وتابع طلبات العملاء ومراحل تنفيذها من لوحة واحدة.": "Manage your services and track customer orders and delivery from one dashboard.",
  "إضافة خدمة جديدة وتعديل خدماتك ومتابعة مراجعة الإدارة.": "Add new services, edit your listings, and track admin reviews.",
  "متابعة الطلبات الجديدة وحالة التنفيذ والتسليم.": "Track new orders, progress, and delivery.",
  "إدارة الخدمات": "Manage services", "أضف خدمة جديدة": "Add a new service",
  "اعرض مهارتك على العملاء بعد مراجعة الإدارة.": "Showcase your skills after admin review.",
  "متابعة الأداء": "Track performance", "راجع الطلبات الجارية والمنجزة.": "Review active and completed orders.",
  "طلبات العملاء": "Customer orders", "لا توجد طلبات حتى الآن.": "There are no orders yet.",
  "بيانات التواصل مخفية — تسليم العمل يتم للإدارة.": "Contact details are hidden — submit completed work to the team.",
  "بدء التنفيذ": "Start work", "تسليم الخدمة": "Deliver service",
  "إرسال العمل للإدارة للمراجعة": "Submit work for admin review",
  "الخدمات المضافة": "Listed services", "مسودة": "Draft", "قيد المراجعة": "Under review",
  "معتمدة": "Approved", "متوقفة": "Paused", "ملاحظة الإدارة:": "Admin note:",
  "فتح الملف": "Open file", "عنوان الخدمة": "Service title", "وصف الخدمة": "Service description",
  "صور وفيديوهات الخدمة": "Service photos and videos", "حتى 8 ملفات.": "Up to 8 files.",
  "إضافة خدمة جديدة": "Add a new service", "إرسال الخدمة للمراجعة": "Submit service for review",
  "لن تظهر الخدمة للعملاء إلا بعد موافقة الإدارة.": "Your service will only be visible to customers after admin approval.",
  "يرجى الانتظار...": "Please wait...", "تم اختيار": "Selected",
  "مركز التحكم": "Control center", "تحكم الإدارة": "Admin controls",
  "لوحة إدارة خِدمتي": "Khedmty admin dashboard", "أقسام الإدارة": "Admin sections",
  "مراجعة مقدمي الخدمات": "Review service providers",
  "مراجعة الحسابات الجديدة والموافقة عليها أو رفضها.": "Review new accounts and approve or reject them.",
  "اعتماد الحسابات": "Approve accounts", "فحص المحتوى": "Review content",
  "إدارة الطلبات": "Manage orders", "متابعة طلبات العملاء ومقدمي الخدمات.": "Track customer and provider orders.",
  "مراجعة المدفوعات": "Review payments", "مراجعة إيصالات التحويل واعتماد المدفوعات.": "Review transfer receipts and approve payments.",
  "إعدادات المنصة": "Platform settings", "إدارة نسبة العمولة وإعدادات خِدمتي.": "Manage the platform fee and Khedmty settings.",
  "كل أدوات إدارة المنصة ومراجعة الحسابات والخدمات والطلبات والمدفوعات في مكان واحد.": "All platform tools for accounts, services, orders, and payments in one place.",
  "العودة للوحة الإدارة": "Back to admin dashboard", "العودة للوحة التحكم": "Back to dashboard",
  "مراجعة الخدمات": "Review services", "راجع تفاصيل كل خدمة قبل نشرها للعملاء.": "Review each service before publishing it to customers.",
  "الخدمات المنتظرة:": "Services awaiting review:",
  "لا توجد خدمات قيد المراجعة": "No services are awaiting review",
  "ستظهر هنا الخدمات الجديدة التي يقدمها أصحاب الحسابات.": "New services submitted by account holders will appear here.",
  "سبب الرفض (مطلوب عند الرفض)": "Reason for rejection (required when rejecting)",
  "اكتب سبب الرفض إذا كانت الخدمة غير مناسبة...": "Enter a reason if the service is not suitable...",
  "الموافقة على الخدمة": "Approve service", "رفض الخدمة": "Reject service",
  "رقم الخدمة للإدارة:": "Service number (admin only):", "بيانات العميل": "Customer details",
  "وسيلة التواصل:": "Contact method:", "غير محددة": "Not provided", "غير متاح": "Unavailable",
  "البريد:": "Email:", "تاريخ الإضافة:": "Date added:", "تاريخ الطلب:": "Order date:",
  "إجمالي الطلبات": "Total orders", "مكتملة": "Completed", "لا توجد طلبات حتى الآن": "No orders yet",
  "ستظهر الطلبات هنا بمجرد قيام العملاء بإنشائها.": "Orders will appear here when customers place them.",
  "إدارة المدفوعات": "Manage payments", "راجع الإيصال والمبلغ قبل اعتماد الدفع.": "Check the receipt and amount before approving payment.",
  "إجمالي المدفوعات": "Total payments", "مقبولة": "Approved",
  "لا توجد مدفوعات حتى الآن.": "No payments yet.", "وسيلة الدفع": "Payment method",
  "المطلوب": "Required amount", "عدد عمليات الدفع": "Number of payments",
  "فتح صورة الإيصال الخاصة": "Open private receipt image", "الموافقة على الحساب": "Approve account",
  "رفض الحساب": "Reject account", "الاسم الكامل": "Full name",
  "نسبة عمولة المنصة": "Platform fee rate", "نسبة العمولة (%)": "Fee rate (%)",
  "حفظ الإعدادات": "Save settings", "تم حفظ الإعدادات بنجاح.": "Settings saved successfully.",
  "أدخل نسبة صحيحة من 0 إلى 100.": "Enter a valid rate from 0 to 100.",
  "التحكم في النسبة التي تحصل عليها المنصة من الطلبات الجديدة": "Set the platform fee for new orders",
  "النسبة الجديدة ستُطبق على الطلبات التي يتم إنشاؤها بعد الحفظ. الطلبات القديمة تحتفظ بعمولتها الأصلية.": "The new rate applies to orders created after saving. Existing orders keep their original fee.",
  "تحكم في تفضيلاتك": "Manage your preferences", "اللغة والمظهر": "Language and appearance",
  "إعدادات الحساب واللغة والمظهر في مكان واحد.": "Account, language, and appearance settings in one place.",
  "إعدادات الحساب": "Account settings", "بيانات الحساب المسجل حاليًا.": "Details for your current account.",
  "نوع الحساب": "Account type", "مدير المنصة": "Platform administrator", "مقدم خدمة": "Service provider", "عميل": "Customer",
  "اختَر تفضيلات العرض، وسيتم حفظها لهذا الحساب على هذا الجهاز.": "Choose your display preferences. They will be saved for this account on this device.",
  "لغة الموقع": "Website language", "العربية": "Arabic", "مظهر الموقع": "Appearance",
  "فاتح": "Light", "داكن": "Dark",
  "يتغير اتجاه الصفحة والخط عند اختيار English. ترجمة جميع نصوص الصفحات والقوائم ما زالت قيد الاستكمال.": "The page direction and font change when English is selected. Full translation is being completed.",
  "المظهر يتطبق على الصفحات كلها، ويظل محفوظًا عند التنقل داخل الموقع.": "Your appearance preference is applied across pages and saved while you navigate.",
  "تفاصيل الطلب": "Order details", "الخطوة الأخيرة لإرسال طلبك": "The final step to submit your order",
  "الدفع وإثبات التحويل": "Payment and transfer receipt",
  "حوّل من أي بنك أو محفظة أو تطبيق تحويل يناسبك إلى محفظة خِدمتي الموضحة أدناه، ثم ارفع صورة إيصال التحويل. لن يبدأ تنفيذ الطلب إلا بعد مراجعة الإدارة والتأكد من وصول المبلغ كاملًا.": "Transfer from any bank, wallet, or transfer app to the Khedmty wallet below, then upload your transfer receipt. Work will only begin after the team verifies that the full amount has arrived.",
  "المبلغ المطلوب تحويله": "Amount to transfer", "محفظة استقبال خِدمتي": "Khedmty receiving wallet",
  "حوّل إلى هذا الرقم من أي وسيلة تحويل متاحة لديك": "Transfer to this number using any available transfer method",
  "رقم محفظة الاستقبال لم يُضبط بعد. لن نعرض رقمًا غير موثوق؛ يرجى التواصل مع الإدارة.": "The receiving wallet number has not been configured. We will not show an unverified number; please contact the team.",
  "اسم صاحب المحفظة غير معروض. تأكد من الرقم والمبلغ قبل تأكيد التحويل.": "The wallet owner's name is hidden. Verify the number and amount before transferring.",
  "إرسال إثبات الدفع متوقف مؤقتًا حتى تضيف الإدارة رقم المحفظة.": "Payment receipt submission is temporarily unavailable until the team adds the wallet number.",
  "إرفاق إيصال التحويل": "Attach transfer receipt",
  "ارفع صورة واضحة يظهر فيها المبلغ وتاريخ التحويل ورقم العملية إن وُجد.": "Upload a clear image showing the amount, transfer date, and transaction number if available.",
  "صورة الإيصال": "Receipt image", "الصيغ المسموحة JPG أو PNG أو WEBP، بحد أقصى 8 MB. الإيصال خاص ولا يظهر إلا للإدارة.": "Allowed formats: JPG, PNG, or WEBP, up to 8 MB. The receipt is private and visible only to administrators.",
  "إلغاء": "Cancel", "إرسال الطلب للإدارة": "Submit to admin",
  "إرسال الصورة لا يعني اعتماد الدفع. الإدارة تتحقق من وصول المبلغ الفعلي قبل قبول الطلب.": "Uploading the image does not approve payment. The team verifies receipt of the actual amount before accepting the order.",
  "تم إرسال إثبات الدفع. الطلب الآن قيد مراجعة الإدارة.": "Payment receipt submitted. Your order is now under admin review.",
  "العودة للطلبات": "Back to orders", "ملخص المبلغ": "Amount summary",
  "سعر الخدمة": "Service price", "وسيلة تواصل العميل (للإدارة فقط)": "Customer contact method (admin only)",
  "بيانات الحساب المسجل حاليًا.": "Details for your current account.",
  "اسم صاحب المحفظة غير معروض.": "The wallet owner's name is hidden.",
  "حدث خطأ غير متوقع.": "An unexpected error occurred."
};

function translateText(value: string) {
  const trimmed = value.trim();
  const translated = translations[trimmed];
  if (!translated) return value;
  return value.replace(trimmed, translated);
}

const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();

function translateDocument(locale: "ar" | "en") {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const node of nodes) {
    if (!node.parentElement?.closest("script,style,noscript,textarea,input,[contenteditable='true']")) {
      if (!originalText.has(node)) originalText.set(node, node.nodeValue || "");
      const original = originalText.get(node) || "";
      const nextValue = locale === "en" ? translateText(original) : original;
      if (node.nodeValue !== nextValue) node.nodeValue = nextValue;
    }
  }
  document.querySelectorAll<HTMLElement>("[placeholder],[title],[aria-label]").forEach((element) => {
    for (const attr of ["placeholder", "title", "aria-label"] as const) {
      let saved = originalAttributes.get(element);
      if (!saved) { saved = new Map<string, string>(); originalAttributes.set(element, saved); }
      if (!saved.has(attr)) saved.set(attr, element.getAttribute(attr) || "");
      const value = saved.get(attr) || "";
      const nextValue = locale === "en" ? (translations[value.trim()] || value) : value;
      if (element.getAttribute(attr) !== nextValue) element.setAttribute(attr, nextValue);
    }
  });
}

export function PreferenceInitializer({ userId }: { userId: string }) {
  useEffect(() => {
    let locale: "ar" | "en" = "ar";
    let theme: "light" | "dark" = "light";
    try {
      const saved = JSON.parse(localStorage.getItem("khedmty-preferences-" + userId) || "{}") as { locale?: string; theme?: string };
      locale = saved.locale === "en" ? "en" : "ar";
      theme = saved.theme === "dark" ? "dark" : "light";
    } catch {}
    const root = document.documentElement;
    const apply = () => {
      root.lang = locale;
      root.dir = locale === "en" ? "ltr" : "rtl";
      root.dataset.locale = locale;
      root.dataset.theme = theme;
      translateDocument(locale);
    };
    const refresh = () => {
      try {
        const saved = JSON.parse(localStorage.getItem("khedmty-preferences-" + userId) || "{}") as { locale?: string; theme?: string };
        locale = saved.locale === "en" ? "en" : "ar";
        theme = saved.theme === "dark" ? "dark" : "light";
      } catch {}
      apply();
    };
    apply();
    const observer = new MutationObserver(() => translateDocument(locale));
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener("khedmty-preferences-change", refresh);
    return () => {
      observer.disconnect();
      window.removeEventListener("khedmty-preferences-change", refresh);
    };
  }, [userId]);
  return null;
}
