"use client";

import { useEffect } from "react";

const translations: Record<string, string> = {
  "خِدمتي": "Khedmty",
  "مهارتك تستحق التميز": "Your skills deserve excellence",
  "خِدمتي — مهارتك تستحق التميز": "Khedmty — Your skills deserve excellence",
  "منصة خِدمتي للخدمات المستقلة": "Khedmty Freelance Services Marketplace",
  "إنشاء حساب جديد": "Create a new account",
  "تسجيل الدخول": "Log in",
  "سجّل دخولك للوصول إلى حسابك ومتابعة طلباتك.": "Log in to access your account and track your orders.",
  "المتابعة باستخدام Google": "Continue with Google",
  "أو بالبريد الإلكتروني": "Or continue with email",
  "دخول": "Log in",
  "ليس لديك حساب؟": "Don't have an account?",
  "لديك حساب بالفعل؟": "Already have an account?",
  "العودة للرئيسية": "Back to home",
  "العودة إلى الرئيسية": "Back to home",
  "الاسم": "Name",
  "اكتب اسمك": "Enter your name",
  "نوع الحساب": "Account type",
  "التسجيل كعميل باستخدام Google": "Sign up as a customer with Google",
  "التسجيل كمقدم خدمة باستخدام Google": "Sign up as a provider with Google",
  "إنشاء الحساب": "Create account",
  "حسابك قيد المراجعة": "Your account is under review",
  "شكرًا لانضمامك إلى خِدمتي كمقدم خدمة.": "Thank you for joining Khedmty as a service provider.",
  "حسابك حاليًا في انتظار مراجعة وموافقة إدارة المنصة.": "Your account is awaiting review and approval by the platform team.",
  "سنتمكن من إتاحة لوحة مقدم الخدمة بعد الموافقة.": "Your provider dashboard will be available after approval.",
  "لا تحتاج إلى إنشاء حساب جديد. انتظر حتى تنتهي الإدارة من مراجعة حسابك.": "You do not need to create another account. Please wait for the team to review your account.",
  "لوحة التحكم": "Dashboard",
  "الرئيسية": "Home",
  "الإعدادات": "Settings",
  "خدماتي": "My services",
  "لوحة الإدارة": "Admin dashboard",
  "المدفوعات": "Payments",
  "القائمة الرئيسية": "Main menu",
  "فتح قائمة خِدمتي": "Open Khedmty menu",
  "إغلاق القائمة": "Close menu",
  "التميز": "excellence",
  "مساحة تجمع أصحاب المهارات بالعملاء، وتساعدك تدير حسابك وطلباتك وخدماتك بسهولة وأمان.": "A place connecting skilled professionals with customers, helping you manage your account, orders, and services with ease.",
  "للمستقلين": "For freelancers",
  "اعرض مهارتك": "Showcase your skills",
  "جميع الحقوق محفوظة.": "All rights reserved.",
  "اكتشف الخدمات التي تناسبك": "Discover services that fit your needs",
  "اختَر الخدمة واطلبها من خلال خِدمتي، وتابع التنفيذ والتسليم بأمان من حسابك.": "Choose and order a service through Khedmty, then securely track its progress and delivery from your account.",
  "خدمة متاحة": "available services",
  "لا توجد خدمات متاحة حاليًا": "No services are available right now",
  "نعمل على إضافة خدمات جديدة قريبًا.": "We are working on adding new services soon.",
  "لا توجد صورة للخدمة": "No service image",
  "مقدم الخدمة": "Service provider",
  "الحالة:": "Status:",
  "المبلغ:": "Amount:",
  "الانتقال إلى الدفع": "Proceed to payment",
  "إلغاء الطلب": "Cancel order",
  "تأكيد استلام الشغل": "Confirm delivery",
  "بيانات تواصل العميل مخفية عنك. بعد تأكيد الدفع يمكنك تنفيذ العمل وإرساله للإدارة لمراجعته وتسليمه للعميل.": "The customer's contact details are hidden. Once payment is confirmed, you can complete the work and submit it to the team for review and delivery.",
  "تم الدفع": "Paid",
  "قيد التنفيذ": "In progress",
  "تم التسليم": "Delivered",
  "تم اعتماد الدفع": "Payment approved",
  "تم رفض الدفع": "Payment rejected",
  "حسابي": "My account",
  "تابع حالة مشترياتك ومدفوعاتك من هنا.": "Track your purchases and payments here.",
  "تقدمك في خِدمتي": "Your Khedmty progress",
  "طلبات مكتملة": "completed orders",
  "أماكن": "slots",
  "من 5": "of 5",
  "لسه مفيش طلبات": "No orders yet",
  "تصفح الخدمات": "Browse services",
  "الإجمالي": "Total",
  "تابع حالة مشترياتك والمدفوعات وتفاصيل كل طلب.": "Track your purchases, payments, and order details.",
  "مرحبًا بك في خِدمتي": "Welcome to Khedmty",
  "مساحة مقدم الخدمة": "Provider workspace",
  "إرسال العمل للإدارة للمراجعة": "Submit work for admin review",
  "معتمدة": "Approved",
  "متوقفة": "Paused",
  "ملاحظة الإدارة:": "Admin note:",
  "فتح الملف": "Open file",
  "عنوان الخدمة": "Service title",
  "وصف الخدمة": "Service description",
  "لن تظهر الخدمة للعملاء إلا بعد موافقة الإدارة.": "Your service will only be visible to customers after admin approval.",
  "يرجى الانتظار...": "Please wait...",
  "تم اختيار": "Selected",
  "مراجعة الحسابات الجديدة والموافقة عليها أو رفضها.": "Review new accounts and approve or reject them.",
  "مراجعة المدفوعات": "Review payments",
  "مراجعة إيصالات التحويل واعتماد المدفوعات.": "Review transfer receipts and approve payments.",
  "كل أدوات إدارة المنصة ومراجعة الحسابات والخدمات والطلبات والمدفوعات في مكان واحد.": "All platform tools for accounts, services, orders, and payments in one place.",
  "حفظ الإعدادات": "Save settings",
  "تم حفظ الإعدادات بنجاح.": "Settings saved successfully.",
  "النسبة الجديدة ستُطبق على الطلبات التي يتم إنشاؤها بعد الحفظ. الطلبات القديمة تحتفظ بعمولتها الأصلية.": "The new rate applies to orders created after saving. Existing orders keep their original fee.",
  "تحكم في تفضيلاتك": "Manage your preferences",
  "اللغة والمظهر": "Language and appearance",
  "إعدادات الحساب واللغة والمظهر في مكان واحد.": "Account, language, and appearance settings in one place.",
  "مدير المنصة": "Platform administrator",
  "مقدم خدمة": "Service provider",
  "عميل": "Customer",
  "اختَر تفضيلات العرض، وسيتم حفظها لهذا الحساب على هذا الجهاز.": "Choose your display preferences. They will be saved for this account on this device.",
  "فاتح": "Light",
  "داكن": "Dark",
  "يتغير اتجاه الصفحة والخط عند اختيار English. ترجمة جميع نصوص الصفحات والقوائم ما زالت قيد الاستكمال.": "The page direction and font change when English is selected. Full translation is being completed.",
  "المظهر يتطبق على الصفحات كلها، ويظل محفوظًا عند التنقل داخل الموقع.": "Your appearance preference is applied across pages and saved while you navigate.",
  "إرسال إثبات الدفع متوقف مؤقتًا حتى تضيف الإدارة رقم المحفظة.": "Payment receipt submission is temporarily unavailable until the team adds the wallet number.",
  "إرفاق إيصال التحويل": "Attach transfer receipt",
  "ارفع صورة واضحة يظهر فيها المبلغ وتاريخ التحويل ورقم العملية إن وُجد.": "Upload a clear image showing the amount, transfer date, and transaction number if available.",
  "صورة الإيصال": "Receipt image",
  "الصيغ المسموحة JPG أو PNG أو WEBP، بحد أقصى 8 MB. الإيصال خاص ولا يظهر إلا للإدارة.": "Allowed formats: JPG, PNG, WEBP, up to 8 MB. The receipt is private and visible only to administrators.",
  "إلغاء": "Cancel",
  "إرسال الطلب للإدارة": "Submit to admin",
  "إرسال الصورة لا يعني اعتماد الدفع. الإدارة تتحقق من وصول المبلغ الفعلي قبل قبول الطلب.": "Uploading the image does not approve payment. The team verifies receipt of the actual amount before accepting the order.",
  "بيانات الحساب المسجل حاليًا.": "Current account details.",
  "اسم صاحب المحفظة غير معروض.": "The wallet owner's name is hidden.",
  "تم إنشاء حسابك بنجاح. سجّل الدخول الآن.": "Your account was created successfully. Log in now.",
  "انضم إلى خِدمتي وابدأ رحلتك معنا.": "Join Khedmty and start your journey with us.",
  "10 أحرف على الأقل": "At least 10 characters",
  "عميل - أريد شراء الخدمات": "Customer — I want to buy services",
  "مقدم خدمة - أريد عرض خدماتي": "Service provider — I want to offer services",
  "التسجيل كعميل": "Sign up as a customer",
  "التسجيل كمقدم خدمة": "Sign up as a service provider",
  "سجّل كعميل أو مقدم خدمة في خطوات بسيطة.": "Sign up as a customer or service provider in a few simple steps.",
  "ابدأ رحلتك الآن": "Start your journey",
  "لديك حساب؟ دخول": "Already have an account? Log in",
  "مرحبًا بك في": "Welcome to",
  "شعارنا": "Our promise",
  "اطلب بثقة": "Order with confidence",
  "ببساطة ووضوح": "Simple and clear",
  "ابدأ مع خِدمتي في 3 خطوات": "Get started with Khedmty in 3 steps",
  "كل ما تحتاجه لإدارة تجربتك في مكان واحد.": "Everything you need to manage your experience in one place.",
  "أنشئ حسابك": "Create your account",
  "ابدأ بثقة": "Get started with confidence",
  "أنجز واستلم": "Complete and receive",
  "تابع التنفيذ حتى استلام الخدمة.": "Track progress until your service is delivered.",
  "التسجيل كعميل متاح فورًا، وحساب مقدم الخدمة يمر بمراجعة الإدارة.": "Customer accounts are available immediately. Provider accounts require admin approval.",
  "حساب العميل": "Customer account",
  "كل أدواتك لمتابعة الخدمات والطلبات في مكان واحد.": "Everything you need to manage services and orders in one place.",
  "اكتشف الخدمات المعتمدة وابحث عن الخدمة المناسبة لك.": "Explore approved services and find the right one for you.",
  "استكشف الخدمات": "Explore services",
  "عرض الطلبات": "View orders",
  "أهلاً بك في خِدمتي": "Welcome to Khedmty",
  "أدر خدماتك وتابع طلبات العملاء ومراحل تنفيذها من لوحة واحدة.": "Manage your services and track customer orders and delivery from one dashboard.",
  "إضافة خدمة جديدة وتعديل خدماتك ومتابعة مراجعة الإدارة.": "Add new services, edit your listings, and track admin reviews.",
  "متابعة الطلبات الجديدة وحالة التنفيذ والتسليم.": "Track new orders, progress, and delivery.",
  "إدارة الخدمات": "Manage services",
  "اعرض مهارتك على العملاء بعد مراجعة الإدارة.": "Showcase your skills after admin review.",
  "متابعة الأداء": "Track performance",
  "لا توجد طلبات حتى الآن.": "There are no orders yet.",
  "بيانات التواصل مخفية — تسليم العمل يتم للإدارة.": "Contact details are hidden — submit completed work to the team.",
  "بدء التنفيذ": "Start work",
  "تسليم الخدمة": "Deliver service",
  "مسودة": "Draft",
  "مرفوضة": "Rejected",
  "الخدمات المضافة": "Listed services",
  "تعذر تجهيز رفع الملف.": "Could not prepare the file upload.",
  "فشل رفع الملف إلى التخزين.": "File upload to storage failed.",
  "يمكن رفع 8 ملفات كحد أقصى.": "You can upload up to 8 files.",
  "جاري رفع الملف": "Uploading file",
  "جاري إرسال الخدمة للمراجعة...": "Submitting service for review...",
  "تعذر إنشاء الخدمة.": "Could not create the service.",
  "تم إرسال الخدمة للمراجعة.": "Service submitted for review.",
  "إضافة خدمة جديدة": "Add a new service",
  "السعر (EG)": "Price (EG)",
  "صور وفيديوهات الخدمة": "Service photos and videos",
  "حتى 8 ملفات. الصور بحد أقصى 8 MB والفيديو 40 MB للملف. الصيغ: JPG وPNG وWEBP وMP4 وWEBM وMOV.": "Up to 8 files. Images: max 8 MB; videos: max 40 MB each. Formats: JPG, PNG, WEBP, MP4, WEBM, MOV.",
  "إرسال الخدمة للمراجعة": "Submit service for review",
  "سبب رفض الخدمة": "Service rejection reason",
  "تمت الموافقة على الخدمة.": "Service approved.",
  "راجع تفاصيل كل خدمة قبل نشرها للعملاء.": "Review each service before publishing it to customers.",
  "لا توجد خدمات قيد المراجعة": "No services are awaiting review",
  "ستظهر هنا الخدمات الجديدة التي يقدمها أصحاب الحسابات.": "New services submitted by account holders will appear here.",
  "مقدم الخدمة:": "Service provider:",
  "البريد:": "Email:",
  "السعر:": "Price:",
  "تاريخ الإضافة:": "Date added:",
  "اكتب سبب الرفض إذا كانت الخدمة غير مناسبة...": "Enter a reason if the service is not suitable...",
  "رفض الخدمة": "Reject service",
  "التحكم في النسبة التي تحصل عليها المنصة من الطلبات الجديدة": "Set the platform fee for new orders",
  "أدخل نسبة صحيحة من 0 إلى 100.": "Enter a valid rate from 0 to 100.",
  "النسبة الجديدة ستُطبق على الطلبات التي يتم إنشاؤها بعد الحفظ.": "The new rate applies to orders created after saving.",
  "الطلبات القديمة تحتفظ بعمولتها الأصلية.": "Existing orders keep their original fee.",
  "نسبة عمولة المنصة": "Platform fee rate",
  "نسبة العمولة (%)": "Fee rate (%)",
  "العودة للوحة الإدارة": "Back to admin dashboard",
  "إدارة الطلبات": "Manage orders",
  "متابعة جميع طلبات العملاء ومقدمي الخدمات": "Track all customer and provider orders",
  "إجمالي الطلبات": "Total orders",
  "في انتظار الدفع": "Awaiting payment",
  "مكتملة": "Completed",
  "لا توجد طلبات حتى الآن": "No orders yet",
  "ستظهر الطلبات هنا بمجرد قيام العملاء بإنشائها.": "Orders will appear here when customers place them.",
  "الخدمة": "Service",
  "بيانات العميل": "Customer details",
  "وسيلة التواصل:": "Contact method:",
  "غير محددة": "Not provided",
  "سعر الخدمة": "Service price",
  "العمولة": "Platform fee",
  "عدد عمليات الدفع": "Number of payments",
  "تاريخ الطلب:": "Order date:",
  "راجع الإيصال والمبلغ قبل اعتماد الدفع.": "Check the receipt and amount before approving payment.",
  "إجمالي المدفوعات": "Total payments",
  "قيد المراجعة": "Under review",
  "مقبولة": "Approved",
  "العميل": "Customer",
  "وسيلة الدفع": "Payment method",
  "المبلغ": "Amount",
  "المطلوب": "Required",
  "تعذر إنشاء رابط الإيصال؛ تحقق من إعدادات التخزين.": "Could not create the receipt link. Check storage settings.",
  "ملاحظة أو سبب الرفض": "Note or reason for rejection",
  "تأكيد استلام المبلغ": "Confirm receipt of payment",
  "رفض الإيصال": "Reject receipt",
  "تاريخ الإرسال:": "Submitted:",
  "الحسابات الجديدة تنتظر موافقة الإدارة قبل استخدام لوحة مقدم الخدمة.": "New accounts require admin approval before accessing the provider dashboard.",
  "لا توجد حسابات جديدة قيد المراجعة.": "No new accounts are awaiting review.",
  "الهاتف:": "Phone:",
  "الموافقة على الحساب": "Approve account",
  "طريقة التواصل معك (هاتف أو واتساب أو بريد إلكتروني)": "How can we contact you? (Phone, WhatsApp, or email)",
  "اكتب رقمك أو بريدك للتواصل": "Enter your phone number or email",
  "اطلب الخدمة الآن": "Order this service",
  "اكتب وسيلة تواصل صحيحة قبل إنشاء الطلب.": "Enter a valid contact method before placing the order.",
  "اكتملت الأماكن المتاحة لطلباتك. أكمل طلبًا جاريًا أولًا حتى يتوفر مكان جديد.": "You have reached your order limit. Complete an active order to free up a slot.",
  "لا توجد صور مرفقة": "No images attached",
  "جميع الخدمات": "All services",
  "تفاصيل السعر": "Price details",
  "عمولة المنصة": "Platform fee",
  "الإجمالي المطلوب": "Total due",
  "الخطوة الأخيرة لإرسال طلبك": "The final step to submit your order",
  "الدفع وإثبات التحويل": "Payment and transfer receipt",
  "حوّل من أي بنك أو محفظة أو تطبيق تحويل يناسبك إلى محفظة خِدمتي الموضحة أدناه، ثم ارفع صورة إيصال التحويل. لن يبدأ تنفيذ الطلب إلا بعد مراجعة الإدارة والتأكد من وصول المبلغ كاملًا.": "Transfer from any bank, wallet, or transfer app to the Khedmty wallet below, then upload your receipt. Work starts only after the team verifies the full amount.",
  "المبلغ المطلوب تحويله": "Amount to transfer",
  "محفظة استقبال خِدمتي": "Khedmty receiving wallet",
  "حوّل إلى هذا الرقم من أي وسيلة تحويل متاحة لديك": "Transfer to this number using any available transfer method",
  "اسم صاحب المحفظة غير معروض. تأكد من الرقم والمبلغ قبل تأكيد التحويل.": "The wallet owner's name is hidden. Verify the number and amount before transferring.",
  "تم اختيار:": "Selected:",
  "العودة للطلبات": "Back to orders",
  "← حسابي": "← My account",
  "← لوحة مقدم الخدمة": "← Provider dashboard",
  "← العودة للوحة الإدارة": "← Back to admin dashboard",
  "تفاصيل الطلب": "Order details",
  "في انتظار دفع العميل": "Awaiting customer payment",
  "مراجعة دفع الطلب": "Review payment for order",
  "تم تحديث حالة الطلب إلى": "Order status updated to",
  "سبب رفض الخدمة:": "Service rejection reason:",
  "تمت الموافقة": "Approved",
  "رفض": "Reject",
  "الانتظار": "Please wait",
  "مقدمو الخدمات": "Service providers",
  "مراجعة مقدمي الخدمات": "Review service providers",
  "أقسام الإدارة": "Admin sections",
  "مركز التحكم": "Control center",
  "لوحة إدارة خِدمتي": "Khedmty admin dashboard",
  "تحكم الإدارة": "Admin controls",
  "مراجعة الخدمات": "Review services",
  "إدارة المدفوعات": "Manage payments",
  "وسيلة أخرى": "Other method",
  "تم قبول الدفع": "Payment approved",
  "مرفوض": "Rejected",
  "مطلوب تعديل": "Revision requested",
  "تم تسليم الخدمة": "Service delivered",
  "تم تأكيد الدفع": "Payment confirmed",
  "الدفع قيد المراجعة": "Payment under review",
  "تم إرسال إثبات الدفع. الطلب الآن قيد مراجعة الإدارة.": "Payment receipt submitted. Your order is now under admin review.",
  "تعذر تجهيز رابط الإيصال؛ تحقق من إعدادات التخزين.": "Could not create the receipt link. Check storage settings.",
  "تفاصيل الخدمة": "Service details",
  "اكتب البريد الإلكتروني وكلمة المرور.": "Enter your email address and password.",
  "البريد الإلكتروني أو كلمة المرور غير صحيحة.": "The email address or password is incorrect.",
  "هذا الحساب موقوف. تواصل مع إدارة خِدمتي.": "This account is suspended. Contact Khedmty support.",
  "حصل خطأ أثناء تسجيل الدخول. حاول مرة أخرى بعد قليل.": "A sign-in error occurred. Please try again shortly.",
  "تسجيل Google يحتاج إكمال إعداداته أولًا.": "Google sign-in has not been configured yet.",
  "تعذر تسجيل الدخول باستخدام Google. حاول مرة أخرى.": "Could not sign in with Google. Please try again.",
  "تم إلغاء تسجيل الدخول باستخدام Google.": "Google sign-in was cancelled.",
  "راجع البيانات: الاسم من 2 إلى 70 حرفًا، وكلمة المرور من 10 إلى 72 حرفًا.": "Check your details: name must be 2–70 characters and password 10–72 characters.",
  "نوع الحساب غير صحيح.": "The selected account type is invalid.",
  "هذا البريد مسجل بالفعل. جرّب تسجيل الدخول.": "This email is already registered. Try logging in.",
  "تعذر إنشاء الحساب حاليًا. حاول مرة أخرى.": "Your account could not be created right now. Please try again.",
  "تعذر إنشاء الحساب باستخدام Google. حاول مرة أخرى.": "Could not create your account with Google. Please try again.",
  "تم إلغاء التسجيل باستخدام Google.": "Google sign-up was cancelled.",
  "رقم الطلب": "Order number",
  "عدد الطلبات": "Number of orders",
  "مراجعة الحسابات": "Review accounts",
  "اعتماد الحسابات": "Approve accounts",
  "بيانات مقدم الخدمة": "Provider details",
  "سبب الرفض": "Rejection reason",
  "رفض الحساب": "Reject account",
  "لا يوجد مقدمو خدمات بانتظار المراجعة.": "No service providers are awaiting review.",
  "لا توجد خدمات": "No services",
  "تاريخ التسجيل:": "Registration date:",
  "رقم الخدمة:": "Service number:",
  "المبلغ المطلوب": "Amount due",
  "صورة الإيصال الخاصة": "Private receipt image",
  "أسباب الرفض": "Rejection reasons",
  "الملاحظات": "Notes",
  "تغيير حالة الطلب إلى": "Change order status to",
  "العميل:": "Customer:",
  "العودة للوحة مقدم الخدمة": "Back to provider dashboard",
  "طلبات العملاء": "Customer orders",
  "لا توجد خدمات مضافة حتى الآن.": "No services have been added yet.",
  "لم يتم تحديد وسيلة تواصل": "No contact method provided",
  "العودة إلى حسابي": "Back to my account",
  "إعدادات المنصة": "Platform settings",
  "لا توجد مدفوعات حتى الآن.": "No payments yet.",
  "رقم محفظة الاستقبال لم يُضبط بعد. لن نعرض رقمًا غير موثوق؛ يرجى التواصل مع الإدارة.": "The receiving wallet number is not configured. We will not display an unverified number; please contact the team.",
  "ارفع صورة إيصال التحويل أولًا.": "Please upload the transfer receipt first.",
  "تعذر تجهيز رفع الإيصال.": "Could not prepare the receipt upload.",
  "فشل رفع صورة الإيصال.": "Receipt image upload failed.",
  "تعذر إرسال إثبات التحويل.": "Could not submit the transfer receipt.",
  "حدث خطأ غير متوقع.": "An unexpected error occurred.",
  "جاري إرسال الإيصال...": "Submitting receipt...",
  "رقم الخدمة للإدارة:": "Service number (admin only):",
  "فتح صورة الإيصال الخاصة": "Open private receipt image",
  "العودة للخدمات": "Back to services",
  "الخدمات المنتظرة:": "Services awaiting review:",
  "سبب الرفض (مطلوب عند الرفض)": "Rejection reason (required when rejecting)",
  "الموافقة على الخدمة": "Approve service",
  "السوق": "Marketplace",
  "لغة الموقع": "Website language",
  "مظهر الموقع": "Appearance",
  "إعدادات الحساب": "Account settings",
  "البريد الإلكتروني": "Email address",
  "استعادة دخول الأدمن": "Admin access recovery",
  "هذه الصفحة مخصصة لإعادة تعيين كلمة مرور حساب الإدارة الأساسي فقط.": "This page is only for resetting the primary administrator account password.",
  "تم تحديث كلمة المرور. يمكنك تسجيل الدخول الآن.": "Password updated. You can now log in.",
  "مفتاح الأمان غير صحيح أو غير مضبوط.": "The security key is invalid or has not been configured.",
  "كلمة المرور يجب أن تكون 12 حرفًا على الأقل.": "The password must be at least 12 characters long.",
  "لم يتم العثور على حساب أدمن نشط بهذا البريد.": "No active administrator account was found for this email.",
  "حدث خطأ. حاول مرة أخرى لاحقًا.": "An error occurred. Please try again later.",
  "مفتاح الأمان": "Security key",
  "كلمة المرور الجديدة": "New password",
  "12 حرفًا على الأقل. استخدم كلمة مرور قوية وفريدة.": "At least 12 characters. Use a strong, unique password.",
  "تحديث كلمة المرور": "Update password",
  "الإعدادات السريعة": "Quick settings",
  "اللغة": "Language",
  "الخصوصية والأمان": "Privacy and security",
  "فتح الإعدادات السريعة": "Open quick settings",
  "إنشاء حساب": "Create account",
  "الطلبات": "Orders",
  "طلباتي": "My orders",
  "العربية": "Arabic",
  "للعملاء": "For customers",
  "تسجيل الخروج": "Log out",
  "كل الخدمات": "All services",
  "بحث": "Search",
  "ابحث": "Search",
  "حفظ": "Save",
  "تفاصيل": "Details",
  "طلب": "Order",
  "السعر": "Price",
  "الحالة": "Status",
  "الوصف": "Description",
  "اسم الخدمة": "Service name",
  "تاريخ الطلب": "Order date",
  "لا توجد نتائج": "No results",
  "جاري التحميل...": "Loading...",

  "ابحث برقم الخدمة": "Search by service number",
  "اكتب رقم الخدمة للبحث": "Enter the service number to search",
  "بحث عن الخدمة": "Search service",
  "نتيجة بحث": "search results",
  "عرض كل الخدمات": "View all services",
  "لم يتم العثور على خدمة بهذا الرقم.": "No service was found with this number.",
  "تأكد من كتابة رقم الخدمة بشكل صحيح أو اعرض كل الخدمات.": "Check the service number or view all services.",
  "مراجعة الدفع": "Payment review",
  "مكتمل": "Completed",
  "ملغي": "Cancelled",
  "غير متاح": "Unavailable",
  "لإنشاء طلب جديد يجب أن يتوفر مكان. أكمل طلبًا جاريًا ليتحرر مكان، وكل 5 طلبات مكتملة تزيد سعتك الدائمة 5 أماكن.": "You need an available slot to place a new order. Complete an active order to free a slot; every 5 completed orders permanently add 5 more slots.",
  "وسيلة تواصل العميل (للإدارة فقط)": "Customer contact method (admin only)",
  "ملخص المبلغ": "Payment summary",
  "آخر عملية دفع": "Latest payment",
  "جاري تنفيذ الطلب": "Order in progress",
  "قيد مراجعة الإدارة": "Pending admin review",
  "العودة للوحة التحكم": "Back to dashboard",
  "كلمة المرور": "Password",
  "أدخل كلمة المرور": "Enter your password",
  "لا توجد خدمات قيد المراجعة.": "No services awaiting review.",
  "تم حفظ بيانات الحساب بنجاح.": "Account details saved successfully.",
  "راجع البيانات المدخلة وحاول مرة أخرى.": "Check the information and try again.",
  "تعديل بيانات الحساب": "Edit account details",
  "حدّث اسم العرض ووسيلة التواصل والنبذة والمهارات.": "Update your display name, contact method, bio, and skills.",
  "الاسم الظاهر": "Display name",
  "رقم الهاتف أو وسيلة التواصل": "Phone number or contact method",
  "نبذة عنك": "About you",
  "المهارات (افصل بينها بفاصلة)": "Skills (separate with commas)",
  "حفظ بيانات الحساب": "Save account details",
  "تم تغيير كلمة المرور بنجاح.": "Password changed successfully.",
  "تأكد من تطابق كلمتي المرور وأن الجديدة 10 أحرف على الأقل.": "Make sure both passwords match and the new one has at least 10 characters.",
  "كلمة المرور الحالية غير صحيحة.": "The current password is incorrect.",
  "تغيير كلمة المرور": "Change password",
  "استخدم كلمة مرور قوية لا تقل عن 10 أحرف.": "Use a strong password with at least 10 characters.",
  "كلمة المرور الحالية": "Current password",
  "تأكيد كلمة المرور": "Confirm password",
  "قيمة عمولة المنصة الثابتة": "Fixed platform fee",
  "قيمة العمولة (EG)": "Fee amount (EG)",
  "تحديد مبلغ ثابت تحصل عليه المنصة مع كل طلب جديد": "Set a fixed amount the platform receives with every new order.",
  "قيمة العمولة الجديدة ستُطبق على الطلبات التي يتم إنشاؤها بعد الحفظ. الطلبات القديمة تحتفظ بقيمتها الأصلية.": "The new fee applies to orders created after saving. Existing orders keep their original fee.",
  "أدخل مبلغًا صحيحًا من 0 إلى 100000 EG.": "Enter a valid amount from 0 to 100000 EG.",
  "عمولة المنصة الثابتة": "Fixed platform fee",


  "خدمات تناسب احتياجك. ومكان يبرز مهارتك.": "Services that fit your needs. A place where your skills stand out.",
  "أنجز شغلك مع الشخص المناسب — من غير دوشة البحث والتنسيق.": "Get the work done with the right professional — without the hassle of searching and coordinating.",
  "بدل ما تضيع وقتك في البحث والسؤال، اكتشف خدمات واضحة وتابع طلبك من مكان واحد. ولو بتقدم خدمة، اعرض شغلك وخلي العملاء يلاقوك.": "Spend less time searching. Discover clear service listings and track your order in one place. Offering a service? Showcase your work and help customers find you.",
  "اعثر على خدمتك أو اعرض مهارتك": "Find the service you need or showcase your skills",
  "وعد خِدمتي": "The Khedmty promise",
  "خلّي مهارتك توصل للي محتاجها": "Put your skills in front of people who need them",
  "اختار بوضوح": "Choose with clarity",
  "وصل لعملاء": "Reach customers",
  "خطوات واضحة. متابعة أسهل.": "Clear steps. Easier tracking.",
  "من أول تسجيل لحد استلام الخدمة": "From sign-up to service delivery",
  "سواء بتشتري خدمة أو بتقدمها، هتلاقي خطواتك الأساسية قدامك.": "Whether you're buying or offering a service, your next steps are easy to follow.",
  "حدد أنت جاي تعمل إيه": "Choose what brings you here",
  "سجّل كعميل لو بتدور على خدمة، أو كمقدم خدمة لو عايز توصل مهارتك لعملاء جدد.": "Join as a customer looking for a service, or as a provider ready to reach new customers.",
  "اختار وابدأ من مكان واحد": "Choose and get started in one place",
  "استعرض الخدمات أو جهّز خدمتك، وتابع كل التفاصيل من حسابك.": "Browse services or prepare your listing, then manage the details from your account.",
  "تابع لحد ما تخلص": "Stay on top until it's done",
  "شوف حالة الطلب وخطوات التنفيذ والتسليم بدون ما تتوه بين المحادثات.": "Follow order status, progress, and delivery without losing track across conversations.",
  "ابدأ كعميل فورًا. أما حساب مقدم الخدمة فيُراجع قبل إتاحة عرض الخدمات.": "Start immediately as a customer. Provider accounts are reviewed before services can be listed.",


  "كمّل من حيث توقفت: تابع طلباتك ومدفوعاتك وخدماتك من حسابك.": "Pick up where you left off: track your orders, payments, and services from your account.",
  "حساب واحد يوصلك للخدمة اللي تحتاجها أو يفتح مهارتك لعملاء جدد.": "One account to find the service you need or put your skills in front of new customers.",


  "تابع مشترياتك ومدفوعاتك، واوصل للخدمة اللي تناسب احتياجك من حساب واحد.": "Track purchases and payments, and find the service that fits your needs — all from one account.",
  "دوّر على الخدمة باسمها أو نوعها، وقارن التفاصيل قبل ما تختار.": "Search by service name or category, then compare the details before choosing.",
  "اعرف كل طلب وصل لفين، وراجع تفاصيله ومدفوعاته في أي وقت.": "See where every order stands and review its details and payments anytime.",
  "راجع الحسابات والخدمات، وتابع الطلبات والمدفوعات، وخلي تشغيل المنصة واضح من لوحة واحدة.": "Review accounts and services, track orders and payments, and keep platform operations clear from one dashboard.",
  "حوّل مهارتك لخدمة واضحة، وتابع طلبات العملاء والتنفيذ والتسليم من مكان واحد.": "Turn your skills into a clear service offering, then manage customer orders, progress, and delivery in one place.",
  "جهّز عرضك، حدّث تفاصيله، وتابع قرار المراجعة أولًا بأول.": "Build your listing, update its details, and keep track of its review status.",
  "اعرف الطلبات الجديدة، ونظّم شغلك، وتابع كل مرحلة لحد التسليم.": "See new orders, organize your work, and track every stage through delivery.",
  "قدّم خدمتك بشكل احترافي، وبعد المراجعة تظهر للعملاء.": "Present your service professionally. Once reviewed, it can be discovered by customers.",
  "اكتب اسم الخدمة أو المجال اللي محتاجه — مثل تصميم أو مونتاج — وهتلاقي الخيارات المتاحة.": "Enter the service or field you need — such as design or video editing — to explore available options.",
  "اعثر على الخدمة": "Find a service",
  "كل طلباتك في مكان واحد: تابع التنفيذ، راجع الدفع، واعرف الخطوة الجاية.": "All your orders in one place: track progress, review payment, and see what's next.",
  "لسه ما طلبتش خدمة؟ ابدأ باكتشاف الخدمات المناسبة ليك.": "Haven't ordered a service yet? Explore options that fit your needs.",
,
  "لغة الموقع": "Website language",
  "غيّر اللغة وسيتم تطبيقها على واجهة الموقع وحفظ اختيارك.": "Change the language across the website interface and save your choice.",
  "الخط العربي": "Arabic font",
  "اختر من 15 خطًا، ويتغير الخط على صفحات الموقع كلها.": "Choose from 15 fonts applied throughout the website.",
  "معاينة: خِدمتي — مهارتك تستحق التميز": "Preview: Khedmty — Your skills deserve excellence",
  "ألوان الموقع": "Website colors",
  "7 لوحات ألوان متناسقة، ويمكنك تغيير اللون الأساسي في أي وقت.": "7 coordinated color palettes. Change the accent color at any time.",
  "برتقالي": "Orange",
  "أزرق": "Blue",
  "أخضر": "Green",
  "بنفسجي": "Purple",
  "وردي": "Rose",
  "فيروزي": "Teal",
  "ذهبي": "Gold",
  "المظهر": "Appearance",
  "فاتح": "Light",
  "داكن": "Dark",
  "Alexandria": "Alexandria",
  "Cairo": "Cairo",
  "Tajawal": "Tajawal",
  "IBM Plex Sans Arabic": "IBM Plex Sans Arabic",
  "Noto Sans Arabic": "Noto Sans Arabic",
  "Noto Kufi Arabic": "Noto Kufi Arabic",
  "Almarai": "Almarai",
  "Readex Pro": "Readex Pro",
  "Changa": "Changa",
  "El Messiri": "El Messiri",
  "Amiri": "Amiri",
  "Mada": "Mada",
  "Harmattan": "Harmattan",
  "Reem Kufi": "Reem Kufi",
  "Baloo Bhaijaan 2": "Baloo Bhaijaan 2",
};

function translateText(value: string) {
  const trimmed = value.trim();
  if (translations[trimmed]) return value.replace(trimmed, translations[trimmed]);
  let translated = value;
  const keys = Object.keys(translations).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (key.length > 1 && translated.includes(key)) {
      translated = translated.split(key).join(translations[key]);
    }
  }
  return translated;
}

type TextTranslationState = { original: string; rendered: string };
type AttributeTranslationState = { original: string; rendered: string };
const originalText = new WeakMap<Text, TextTranslationState>();
const originalAttributes = new WeakMap<Element, Map<string, AttributeTranslationState>>();

function translateDocument(locale: "ar" | "en") {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const node of nodes) {
    if (node.parentElement?.closest("script,style,noscript,textarea,input,[contenteditable='true']")) continue;
    const current = node.nodeValue || "";
    let state = originalText.get(node);
    if (!state) {
      state = { original: current, rendered: current };
      originalText.set(node, state);
    } else if (current !== state.rendered) {
      // React changed this text node; treat the new value as the source language.
      state.original = current;
    }
    const nextValue = locale === "en" ? translateText(state.original) : state.original;
    if (current !== nextValue) node.nodeValue = nextValue;
    state.rendered = nextValue;
  }

  document.querySelectorAll<HTMLElement>("[placeholder],[title],[aria-label]").forEach((element) => {
    let saved = originalAttributes.get(element);
    if (!saved) {
      saved = new Map<string, AttributeTranslationState>();
      originalAttributes.set(element, saved);
    }
    for (const attr of ["placeholder", "title", "aria-label"] as const) {
      if (!element.hasAttribute(attr)) continue;
      const current = element.getAttribute(attr) || "";
      let state = saved.get(attr);
      if (!state) {
        state = { original: current, rendered: current };
        saved.set(attr, state);
      } else if (current !== state.rendered) {
        state.original = current;
      }
      const nextValue = locale === "en" ? translateText(state.original) : state.original;
      if (current !== nextValue) element.setAttribute(attr, nextValue);
      state.rendered = nextValue;
    }
  });
}

export function PreferenceInitializer({ userId }: { userId: string }) {
  useEffect(() => {
    let locale: "ar" | "en" = "ar";
    const root = document.documentElement;
    try {
      const saved = JSON.parse(localStorage.getItem("khedmty-preferences-" + userId) || localStorage.getItem("khedmty-public-preferences") || "{}") as { locale?: string; theme?: string; palette?: string; font?: string };
      locale = saved.locale === "en" ? "en" : "ar";
      root.dataset.theme = saved.theme === "dark" ? "dark" : "light";
      root.dataset.palette = saved.palette || "orange";
      root.dataset.font = saved.font || "alexandria";
    } catch {}
    const apply = () => {
      root.lang = locale;
      root.dir = locale === "en" ? "ltr" : "rtl";
      root.dataset.locale = locale;
      translateDocument(locale);
    };
    const refresh = () => {
      try {
        const saved = JSON.parse(localStorage.getItem("khedmty-preferences-" + userId) || localStorage.getItem("khedmty-public-preferences") || "{}") as { locale?: string; theme?: string; palette?: string; font?: string };
        locale = saved.locale === "en" ? "en" : "ar";
        root.dataset.theme = saved.theme === "dark" ? "dark" : "light";
        root.dataset.palette = saved.palette || "orange";
        root.dataset.font = saved.font || "alexandria";
      } catch {}
      apply();
    };
    apply();
    let frame = 0;
    const observer = new MutationObserver(() => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        translateDocument(locale);
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener("khedmty-preferences-change", refresh);
    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("khedmty-preferences-change", refresh);
    };
  }, [userId]);
  return null;
}
