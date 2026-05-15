import Link from "next/link";
import {
  Store,
  ShoppingCart,
  BarChart3,
  Shield,
  Zap,
  Globe,
  Users,
  Package,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Store className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">وصل</span>
          </div>
          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              المميزات
            </a>
            <a
              href="#pricing"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              الأسعار
            </a>
            <a
              href="#testimonials"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              آراء العملاء
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              تسجيل الدخول
            </Link>
            <Link
              href="/register"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              ابدأ مجاناً
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute right-0 top-1/4 h-[400px] w-[400px] rounded-full bg-primary/3 blur-3xl" />
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-20 pt-20 sm:px-6 sm:pt-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>منصة التجارة الإلكترونية الأكثر تكاملاً</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              أنشئ متجرك الإلكتروني
              <span className="mt-2 block text-primary">في دقائق معدودة</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              منصة وصل تمنحك كل ما تحتاجه لإطلاق متجرك الإلكتروني وإدارته
              باحترافية. من إدارة المنتجات والطلبات إلى التحليلات المتقدمة، كل
              شيء في مكان واحد.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-8 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
              >
                ابدأ تجربتك المجانية
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex h-12 w-full items-center justify-center rounded-lg border bg-background px-8 text-base font-medium transition-colors hover:bg-accent sm:w-auto"
              >
                اكتشف المميزات
              </a>
            </div>
            <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-success" />
                بدون بطاقة ائتمان
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-success" />
                14 يوم تجربة مجانية
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-success" />
                إلغاء في أي وقت
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
          {[
            { value: "+1,000", label: "متجر نشط" },
            { value: "+50,000", label: "منتج مُدار" },
            { value: "+200,000", label: "طلب مُعالج" },
            { value: "99.9%", label: "وقت التشغيل" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold text-primary">
                {stat.value}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              كل ما تحتاجه لنجاح متجرك
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              أدوات متكاملة صُممت خصيصاً لتسهيل إدارة تجارتك الإلكترونية
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-xl border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  {feature.icon}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y bg-muted/30 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              ابدأ في 3 خطوات بسيطة
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              لا تحتاج خبرة تقنية. أنشئ متجرك وابدأ البيع اليوم
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <div key={step.title} className="relative text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                  {index + 1}
                </div>
                <h3 className="mt-6 text-xl font-semibold">{step.title}</h3>
                <p className="mt-3 text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">خطط أسعار مرنة</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              اختر الخطة المناسبة لحجم أعمالك. يمكنك الترقية في أي وقت
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-xl border p-8 ${
                  plan.popular
                    ? "border-primary bg-card shadow-lg shadow-primary/10"
                    : "bg-card"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-medium text-primary-foreground">
                    الأكثر شيوعاً
                  </div>
                )}
                <div className="text-center">
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground"> ر.س/شهرياً</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                </div>
                <ul className="mt-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm"
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`mt-8 block w-full rounded-lg py-3 text-center text-sm font-medium transition-colors ${
                    plan.popular
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border bg-background hover:bg-accent"
                  }`}
                >
                  ابدأ الآن
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section
        id="testimonials"
        className="border-y bg-muted/30 py-20 sm:py-28"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              ماذا يقول عملاؤنا
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              آلاف التجار يثقون بمنصة وصل لإدارة أعمالهم
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.name}
                className="rounded-xl border bg-card p-6"
              >
                <p className="text-sm leading-relaxed text-muted-foreground">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {testimonial.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      {testimonial.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-primary px-8 py-16 text-center sm:px-16">
            <div className="absolute inset-0 -z-10">
              <div className="absolute left-0 top-0 h-full w-full bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_50%)]" />
            </div>
            <h2 className="text-3xl font-bold text-primary-foreground sm:text-4xl">
              جاهز لإطلاق متجرك؟
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/80">
              انضم لأكثر من 1,000 تاجر يستخدمون وصل لتنمية أعمالهم. ابدأ تجربتك
              المجانية اليوم
            </p>
            <Link
              href="/register"
              className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-background px-8 text-base font-medium text-foreground transition-colors hover:bg-background/90"
            >
              أنشئ متجرك الآن
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                  <Store className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">وصل</span>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                منصة التجارة الإلكترونية المتكاملة لإنشاء وإدارة المتاجر
                الإلكترونية
              </p>
            </div>
            <div>
              <h4 className="font-semibold">المنتج</h4>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>
                  <a
                    href="#features"
                    className="transition-colors hover:text-foreground"
                  >
                    المميزات
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="transition-colors hover:text-foreground"
                  >
                    الأسعار
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="transition-colors hover:text-foreground"
                  >
                    التحديثات
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold">الدعم</h4>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>
                  <a
                    href="#"
                    className="transition-colors hover:text-foreground"
                  >
                    مركز المساعدة
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="transition-colors hover:text-foreground"
                  >
                    التوثيق
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="transition-colors hover:text-foreground"
                  >
                    تواصل معنا
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold">قانوني</h4>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>
                  <a
                    href="#"
                    className="transition-colors hover:text-foreground"
                  >
                    سياسة الخصوصية
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="transition-colors hover:text-foreground"
                  >
                    شروط الاستخدام
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="transition-colors hover:text-foreground"
                  >
                    سياسة الاسترجاع
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t pt-8 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} وصل. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: <Package className="h-6 w-6" />,
    title: "إدارة المنتجات",
    description:
      "أضف منتجاتك بسهولة مع دعم المتغيرات والخيارات المتعددة والصور عالية الجودة",
  },
  {
    icon: <ShoppingCart className="h-6 w-6" />,
    title: "إدارة الطلبات",
    description:
      "تتبع طلباتك من لحظة الشراء حتى التوصيل مع نظام حالات ذكي ومتكامل",
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "إدارة العملاء",
    description:
      "قاعدة بيانات متكاملة لعملائك مع سجل المشتريات والعناوين المحفوظة",
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: "تحليلات متقدمة",
    description:
      "لوحة تحكم تفاعلية مع إحصائيات المبيعات والأداء لاتخاذ قرارات أفضل",
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "أمان متقدم",
    description:
      "نظام صلاحيات متعدد المستويات مع تشفير البيانات وحماية المعاملات",
  },
  {
    icon: <Globe className="h-6 w-6" />,
    title: "متجر احترافي",
    description:
      "واجهة متجر جاهزة ومتجاوبة مع جميع الأجهزة ودعم كامل للغة العربية",
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: "أداء فائق",
    description:
      "بنية تحتية سحابية تضمن سرعة تحميل عالية وتوفر مستمر بنسبة 99.9%",
  },
  {
    icon: <Store className="h-6 w-6" />,
    title: "متاجر متعددة",
    description:
      "أدر أكثر من متجر من حساب واحد مع فصل كامل للبيانات والصلاحيات",
  },
  {
    icon: <Package className="h-6 w-6" />,
    title: "إدارة المخزون",
    description: "تتبع مستويات المخزون تلقائياً مع تنبيهات النفاد وسجل الحركات",
  },
];

const steps = [
  {
    title: "أنشئ حسابك",
    description: "سجّل في المنصة مجاناً في أقل من دقيقة واحدة",
  },
  {
    title: "أعدّ متجرك",
    description: "خصّص متجرك بإضافة المنتجات والتصنيفات وضبط الإعدادات",
  },
  {
    title: "ابدأ البيع",
    description: "شارك رابط متجرك واستقبل الطلبات من عملائك",
  },
];

const plans = [
  {
    name: "أساسي",
    price: "49",
    description: "مثالي للمتاجر الصغيرة والمبتدئين",
    popular: false,
    features: [
      "متجر واحد",
      "حتى 100 منتج",
      "عضوين في الفريق",
      "دعم عبر البريد الإلكتروني",
      "تقارير أساسية",
    ],
  },
  {
    name: "احترافي",
    price: "149",
    description: "للمتاجر المتنامية التي تحتاج مرونة أكبر",
    popular: true,
    features: [
      "حتى 3 متاجر",
      "حتى 1,000 منتج",
      "10 أعضاء في الفريق",
      "دعم أولوية",
      "تحليلات متقدمة",
      "كوبونات وعروض",
    ],
  },
  {
    name: "مؤسسي",
    price: "399",
    description: "للشركات الكبيرة والمتاجر ذات الحجم العالي",
    popular: false,
    features: [
      "متاجر غير محدودة",
      "منتجات غير محدودة",
      "أعضاء غير محدودين",
      "دعم مخصص 24/7",
      "تحليلات متقدمة",
      "API مخصص",
      "مدير حساب مخصص",
    ],
  },
];

const testimonials = [
  {
    name: "أحمد الشمري",
    role: "صاحب متجر إلكتروني",
    quote:
      "وصل غيّرت طريقة إدارتي لمتجري بالكامل. الواجهة سهلة والدعم ممتاز. أنصح بها كل تاجر يبحث عن حل متكامل.",
  },
  {
    name: "سارة العتيبي",
    role: "مديرة تسويق",
    quote:
      "أفضل منصة تعاملت معها. إدارة المنتجات والطلبات أصبحت أسهل بكثير، والتقارير تساعدنا في اتخاذ قرارات أفضل.",
  },
  {
    name: "محمد القحطاني",
    role: "رائد أعمال",
    quote:
      "بدأت بالخطة الأساسية والآن أدير 5 متاجر من حساب واحد. المنصة تنمو معك وتلبي احتياجاتك في كل مرحلة.",
  },
];
