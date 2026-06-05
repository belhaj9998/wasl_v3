import "dotenv/config";
import bcrypt from "bcryptjs";
import prisma from "../src/configs/prisma";
import {
  permissionSeeds,
  subscriptionPlans,
  defaultRoleTemplates,
} from "../src/constant/constants";

const BCRYPT_ROUNDS = 12;

// ============ Demo Data ============

const demoUsers = [
  {
    name: "Platform Owner",
    email: "owner@wasl.com",
    phone: "+218910000001",
    password: "Owner123!",
    system_role: "PLATFORM_OWNER" as const,
  },
  {
    name: "Platform Admin",
    email: "admin@wasl.com",
    phone: "+218910000002",
    password: "Admin123!",
    system_role: "PLATFORM_ADMIN" as const,
  },
  {
    name: "Store Owner Ahmed",
    email: "ahmed@store.com",
    phone: "+218910000003",
    password: "Ahmed123!",
    system_role: "USER" as const,
  },
  {
    name: "Staff Member Sara",
    email: "sara@store.com",
    phone: "+218910000004",
    password: "Sara1234!",
    system_role: "USER" as const,
  },
];

const demoStores = [
  {
    name: "متجر الأناقة",
    domain: "elegance-store",
    status: "ACTIVE" as const,
    currency_code: "LYD",
    locale: "ar-LY",
    timezone: "Africa/Tripoli",
    description: "متجر متخصص في الملابس والأزياء الراقية",
    support_email: "support@elegance-store.com",
    support_phone: "+218910000010",
    meta_title: "متجر الأناقة - أفضل الأزياء",
    meta_description: "تسوق أحدث صيحات الموضة والأزياء الراقية",
  },
  {
    name: "متجر التقنية",
    domain: "tech-store",
    status: "ACTIVE" as const,
    currency_code: "LYD",
    locale: "ar-LY",
    timezone: "Africa/Tripoli",
    description: "متجر متخصص في الإلكترونيات والأجهزة الذكية",
    support_email: "support@tech-store.com",
    support_phone: "+218910000020",
    meta_title: "متجر التقنية - أحدث الأجهزة",
    meta_description: "أحدث الأجهزة الإلكترونية بأفضل الأسعار",
  },
];

const demoCategories = [
  // Store 1 - Elegance
  {
    storeDomain: "elegance-store",
    name: "ملابس رجالية",
    slug: "mens-clothing",
    sort_order: 1,
  },
  {
    storeDomain: "elegance-store",
    name: "ملابس نسائية",
    slug: "womens-clothing",
    sort_order: 2,
  },
  {
    storeDomain: "elegance-store",
    name: "أحذية",
    slug: "shoes",
    sort_order: 3,
  },
  {
    storeDomain: "elegance-store",
    name: "إكسسوارات",
    slug: "accessories",
    sort_order: 4,
  },
  // Store 2 - Tech
  {
    storeDomain: "tech-store",
    name: "هواتف ذكية",
    slug: "smartphones",
    sort_order: 1,
  },
  {
    storeDomain: "tech-store",
    name: "لابتوبات",
    slug: "laptops",
    sort_order: 2,
  },
  {
    storeDomain: "tech-store",
    name: "سماعات",
    slug: "headphones",
    sort_order: 3,
  },
  {
    storeDomain: "tech-store",
    name: "ملحقات",
    slug: "accessories",
    sort_order: 4,
  },
];

const demoProducts = [
  // Store 1 - Elegance
  {
    storeDomain: "elegance-store",
    categorySlug: "mens-clothing",
    name: "قميص كلاسيكي أبيض",
    slug: "classic-white-shirt",
    description: "قميص رجالي كلاسيكي من القطن المصري الفاخر",
    short_description: "قميص قطن مصري",
    base_price: "120.00",
    compare_at_price: "150.00",
    cost_price: "60.00",
    status: "PUBLISHED" as const,
    is_published: true,
    track_inventory: true,
    has_variants: true,
  },
  {
    storeDomain: "elegance-store",
    categorySlug: "mens-clothing",
    name: "بنطلون جينز أزرق",
    slug: "blue-jeans",
    description: "بنطلون جينز مريح بقصة عصرية",
    short_description: "جينز عصري",
    base_price: "180.00",
    compare_at_price: "220.00",
    cost_price: "90.00",
    status: "PUBLISHED" as const,
    is_published: true,
    track_inventory: true,
    has_variants: true,
  },
  {
    storeDomain: "elegance-store",
    categorySlug: "womens-clothing",
    name: "فستان سهرة أسود",
    slug: "black-evening-dress",
    description: "فستان سهرة أنيق مناسب للمناسبات الرسمية",
    short_description: "فستان سهرة أنيق",
    base_price: "350.00",
    compare_at_price: "450.00",
    cost_price: "150.00",
    status: "PUBLISHED" as const,
    is_published: true,
    track_inventory: true,
    has_variants: true,
  },
  {
    storeDomain: "elegance-store",
    categorySlug: "shoes",
    name: "حذاء رياضي نايك",
    slug: "nike-sports-shoe",
    description: "حذاء رياضي مريح للاستخدام اليومي",
    short_description: "حذاء رياضي مريح",
    base_price: "250.00",
    compare_at_price: null,
    cost_price: "120.00",
    status: "PUBLISHED" as const,
    is_published: true,
    track_inventory: true,
    has_variants: true,
  },
  // Store 2 - Tech
  {
    storeDomain: "tech-store",
    categorySlug: "smartphones",
    name: "iPhone 15 Pro Max",
    slug: "iphone-15-pro-max",
    description: "أحدث هاتف من أبل بمعالج A17 Pro وكاميرا متطورة",
    short_description: "iPhone 15 Pro Max 256GB",
    base_price: "5500.00",
    compare_at_price: "6000.00",
    cost_price: "4800.00",
    status: "PUBLISHED" as const,
    is_published: true,
    track_inventory: true,
    has_variants: true,
  },
  {
    storeDomain: "tech-store",
    categorySlug: "smartphones",
    name: "Samsung Galaxy S24 Ultra",
    slug: "samsung-galaxy-s24-ultra",
    description: "هاتف سامسونج الرائد بقلم S Pen وكاميرا 200MP",
    short_description: "Galaxy S24 Ultra 512GB",
    base_price: "5200.00",
    compare_at_price: "5800.00",
    cost_price: "4500.00",
    status: "PUBLISHED" as const,
    is_published: true,
    track_inventory: true,
    has_variants: true,
  },
  {
    storeDomain: "tech-store",
    categorySlug: "laptops",
    name: "MacBook Pro M3",
    slug: "macbook-pro-m3",
    description: "لابتوب أبل بمعالج M3 وشاشة Retina مذهلة",
    short_description: "MacBook Pro 14 inch M3",
    base_price: "8500.00",
    compare_at_price: "9000.00",
    cost_price: "7200.00",
    status: "PUBLISHED" as const,
    is_published: true,
    track_inventory: true,
    has_variants: false,
  },
  {
    storeDomain: "tech-store",
    categorySlug: "headphones",
    name: "AirPods Pro 2",
    slug: "airpods-pro-2",
    description: "سماعات أبل اللاسلكية مع إلغاء الضوضاء النشط",
    short_description: "AirPods Pro الجيل الثاني",
    base_price: "950.00",
    compare_at_price: "1100.00",
    cost_price: "700.00",
    status: "PUBLISHED" as const,
    is_published: true,
    track_inventory: true,
    has_variants: false,
  },
];

const demoCoupons = [
  {
    storeDomain: "elegance-store",
    code: "WELCOME10",
    description: "خصم 10% للعملاء الجدد",
    type: "PERCENTAGE" as const,
    value: "10",
    minimum_order_amount: "100",
    maximum_discount_amount: "50",
    usage_limit: 100,
    usage_limit_per_customer: 1,
    is_active: true,
  },
  {
    storeDomain: "elegance-store",
    code: "SUMMER50",
    description: "خصم 50 دينار على طلبات الصيف",
    type: "FIXED" as const,
    value: "50",
    minimum_order_amount: "200",
    maximum_discount_amount: null,
    usage_limit: 50,
    usage_limit_per_customer: 2,
    is_active: true,
  },
  {
    storeDomain: "tech-store",
    code: "TECH20",
    description: "خصم 20% على الإلكترونيات",
    type: "PERCENTAGE" as const,
    value: "20",
    minimum_order_amount: "500",
    maximum_discount_amount: "200",
    usage_limit: 30,
    usage_limit_per_customer: 1,
    is_active: true,
  },
];
const demoCustomers = [
  {
    storeDomain: "elegance-store",
    customer_name: "محمد العلي",
    email: "mohammed@customer.com",
    phone: "+218920000001",
    password: "Customer1!",
    status: "ACTIVE" as const,
  },
  {
    storeDomain: "elegance-store",
    customer_name: "فاطمة الزهراء",
    email: "fatima@customer.com",
    phone: "+218920000002",
    password: "Customer2!",
    status: "ACTIVE" as const,
  },
  {
    storeDomain: "tech-store",
    customer_name: "علي حسن",
    email: "ali@customer.com",
    phone: "+218920000003",
    password: "Customer3!",
    status: "ACTIVE" as const,
  },
];

// ============ Seed Functions ============

async function seedPermissions() {
  console.log("  Seeding permissions...");
  for (const permission of permissionSeeds) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: {
        module: permission.module,
        action: permission.action,
        description: permission.description,
      },
      create: permission,
    });
  }
  console.log(`  ✓ ${permissionSeeds.length} permissions seeded`);
}

async function seedSubscriptionPlans() {
  console.log("  Seeding subscription plans...");
  for (const plan of subscriptionPlans) {
    await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        price_monthly: plan.price_monthly,
        price_yearly: plan.price_yearly,
        max_stores: plan.max_stores,
        max_products: plan.max_products,
        max_staff: plan.max_staff,
      },
      create: plan,
    });
  }
  console.log(`  ✓ ${subscriptionPlans.length} plans seeded`);
}

async function seedUsers() {
  console.log("  Seeding users...");
  const createdUsers: any[] = [];
  for (const userData of demoUsers) {
    const hashedPassword = await bcrypt.hash(userData.password, BCRYPT_ROUNDS);
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: { name: userData.name, system_role: userData.system_role },
      create: {
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        password: hashedPassword,
        system_role: userData.system_role,
        is_active: true,
      },
    });
    createdUsers.push(user);
  }
  console.log(`  ✓ ${createdUsers.length} users seeded`);
  return createdUsers;
}

async function seedStores() {
  console.log("  Seeding stores...");
  const createdStores: any[] = [];
  for (const storeData of demoStores) {
    const store = await prisma.store.upsert({
      where: { domain: storeData.domain },
      update: { name: storeData.name, status: storeData.status },
      create: storeData,
    });
    createdStores.push(store);
  }
  console.log(`  ✓ ${createdStores.length} stores seeded`);
  return createdStores;
}

async function seedRolesAndMemberships(stores: any[], users: any[]) {
  console.log("  Seeding roles and memberships...");
  for (const store of stores) {
    // Create or sync default roles for each store
    for (const roleTemplate of defaultRoleTemplates) {
      const existingRole = await prisma.storeRole.findUnique({
        where: {
          store_id_slug: { store_id: store.id, slug: roleTemplate.slug },
        },
        include: { permissions: { include: { permission: true } } },
      });
      if (!existingRole) {
        await prisma.storeRole.create({
          data: {
            store_id: store.id,
            name: roleTemplate.name,
            slug: roleTemplate.slug,
            description: roleTemplate.description,
            is_default: true,
            is_protected: roleTemplate.is_protected,
            permissions: {
              create: roleTemplate.permissions.map((permissionCode) => ({
                permission: { connect: { code: permissionCode } },
              })),
            },
          },
        });
      } else {
        // Reconcile RolePermission rows so newly added template permissions
        // (e.g., orders.tags.*) propagate to roles that already existed.
        const currentCodes = new Set(
          existingRole.permissions.map((rp) => rp.permission.code),
        );
        const targetCodes = new Set<string>(roleTemplate.permissions);
        const toAdd = [...targetCodes].filter((c) => !currentCodes.has(c));
        const toRemove = [...currentCodes].filter((c) => !targetCodes.has(c));

        if (toAdd.length > 0) {
          const permRows = await prisma.permission.findMany({
            where: { code: { in: toAdd } },
            select: { id: true },
          });
          if (permRows.length > 0) {
            await prisma.storeRolePermission.createMany({
              data: permRows.map((p) => ({
                role_id: existingRole.id,
                permission_id: p.id,
              })),
              skipDuplicates: true,
            });
          }
        }

        if (toRemove.length > 0) {
          await prisma.storeRolePermission.deleteMany({
            where: {
              role_id: existingRole.id,
              permission: { code: { in: toRemove } },
            },
          });
        }
      }
    }
  }

  // Assign Ahmed as owner of store 1 (elegance-store)
  const eleganceStore = stores.find((s: any) => s.domain === "elegance-store");
  const techStore = stores.find((s: any) => s.domain === "tech-store");
  const ahmed = users.find((u: any) => u.email === "ahmed@store.com");
  const sara = users.find((u: any) => u.email === "sara@store.com");

  if (eleganceStore && ahmed) {
    const ownerRole = await prisma.storeRole.findUnique({
      where: { store_id_slug: { store_id: eleganceStore.id, slug: "owner" } },
    });
    if (ownerRole) {
      await prisma.storeMembership.upsert({
        where: {
          store_id_user_id: { store_id: eleganceStore.id, user_id: ahmed.id },
        },
        update: {},
        create: {
          store_id: eleganceStore.id,
          user_id: ahmed.id,
          role_id: ownerRole.id,
          status: "ACTIVE",
          joined_at: new Date(),
        },
      });
    }
  }

  // Assign Ahmed as owner of store 2 (tech-store) too
  if (techStore && ahmed) {
    const ownerRole = await prisma.storeRole.findUnique({
      where: { store_id_slug: { store_id: techStore.id, slug: "owner" } },
    });
    if (ownerRole) {
      await prisma.storeMembership.upsert({
        where: {
          store_id_user_id: { store_id: techStore.id, user_id: ahmed.id },
        },
        update: {},
        create: {
          store_id: techStore.id,
          user_id: ahmed.id,
          role_id: ownerRole.id,
          status: "ACTIVE",
          joined_at: new Date(),
        },
      });
    }
  }

  // Assign Sara as staff in store 1
  if (eleganceStore && sara) {
    const staffRole = await prisma.storeRole.findUnique({
      where: { store_id_slug: { store_id: eleganceStore.id, slug: "staff" } },
    });
    if (staffRole) {
      await prisma.storeMembership.upsert({
        where: {
          store_id_user_id: { store_id: eleganceStore.id, user_id: sara.id },
        },
        update: {},
        create: {
          store_id: eleganceStore.id,
          user_id: sara.id,
          role_id: staffRole.id,
          status: "ACTIVE",
          joined_at: new Date(),
        },
      });
    }
  }

  console.log("  ✓ Roles and memberships seeded");
}

async function seedSubscriptions(stores: any[]) {
  console.log("  Seeding subscriptions...");
  const starterPlan = await prisma.subscriptionPlan.findUnique({
    where: { code: "starter" },
  });
  const growthPlan = await prisma.subscriptionPlan.findUnique({
    where: { code: "growth" },
  });

  const eleganceStore = stores.find((s: any) => s.domain === "elegance-store");
  const techStore = stores.find((s: any) => s.domain === "tech-store");

  if (eleganceStore && growthPlan) {
    await prisma.storeSubscription.upsert({
      where: { store_id: eleganceStore.id },
      update: {},
      create: {
        store_id: eleganceStore.id,
        plan_id: growthPlan.id,
        billing_cycle: "MONTHLY",
        status: "ACTIVE",
        current_period_starts_at: new Date(),
        current_period_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }

  if (techStore && starterPlan) {
    await prisma.storeSubscription.upsert({
      where: { store_id: techStore.id },
      update: {},
      create: {
        store_id: techStore.id,
        plan_id: starterPlan.id,
        billing_cycle: "YEARLY",
        status: "TRIALING",
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        current_period_starts_at: new Date(),
        current_period_ends_at: new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000,
        ),
      },
    });
  }
  console.log("  ✓ Subscriptions seeded");
}

async function seedCategories(stores: any[]) {
  console.log("  Seeding categories...");
  for (const catData of demoCategories) {
    const store = stores.find((s: any) => s.domain === catData.storeDomain);
    if (!store) continue;
    await prisma.category.upsert({
      where: { store_id_slug: { store_id: store.id, slug: catData.slug } },
      update: { name: catData.name, sort_order: catData.sort_order },
      create: {
        store_id: store.id,
        name: catData.name,
        slug: catData.slug,
        sort_order: catData.sort_order,
        is_active: true,
      },
    });
  }
  console.log(`  ✓ ${demoCategories.length} categories seeded`);
}

async function seedProducts(stores: any[]) {
  console.log("  Seeding products...");
  for (const prodData of demoProducts) {
    const store = stores.find((s: any) => s.domain === prodData.storeDomain);
    if (!store) continue;

    const existingProduct = await prisma.product.findUnique({
      where: { store_id_slug: { store_id: store.id, slug: prodData.slug } },
    });
    if (existingProduct) continue;

    const category = await prisma.category.findUnique({
      where: {
        store_id_slug: { store_id: store.id, slug: prodData.categorySlug },
      },
    });

    const product = await prisma.product.create({
      data: {
        store_id: store.id,
        name: prodData.name,
        slug: prodData.slug,
        description: prodData.description,
        short_description: prodData.short_description,
        base_price: prodData.base_price,
        compare_at_price: prodData.compare_at_price,
        cost_price: prodData.cost_price,
        status: prodData.status,
        is_published: prodData.is_published,
        published_at: prodData.is_published ? new Date() : null,
        track_inventory: prodData.track_inventory,
        has_variants: prodData.has_variants,
      },
    });

    // Link product to category
    if (category) {
      await prisma.productCategory.create({
        data: {
          store_id: store.id,
          product_id: product.id,
          category_id: category.id,
        },
      });
    }

    // Create a default variant for each product
    const sku = `${prodData.storeDomain.substring(0, 3).toUpperCase()}-${prodData.slug.substring(0, 8).toUpperCase()}-001`;
    const variant = await prisma.productVariant.create({
      data: {
        store_id: store.id,
        product_id: product.id,
        title: "Default",
        sku: sku,
        price: prodData.base_price,
        compare_at_price: prodData.compare_at_price,
        cost_price: prodData.cost_price,
        is_default: true,
        is_active: true,
      },
    });

    // Create inventory for the variant
    if (prodData.track_inventory) {
      const qty = Math.floor(Math.random() * 50) + 10;
      await prisma.inventory.create({
        data: {
          store_id: store.id,
          variant_id: variant.id,
          total_quantity: qty,
          available_quantity: qty,
          reserved_quantity: 0,
          low_stock_threshold: 5,
        },
      });
    }
  }
  console.log(`  ✓ ${demoProducts.length} products seeded`);
}

async function seedCoupons(stores: any[]) {
  console.log("  Seeding coupons...");
  for (const couponData of demoCoupons) {
    const store = stores.find((s: any) => s.domain === couponData.storeDomain);
    if (!store) continue;

    await prisma.coupon.upsert({
      where: { store_id_code: { store_id: store.id, code: couponData.code } },
      update: {},
      create: {
        store_id: store.id,
        code: couponData.code,
        description: couponData.description,
        type: couponData.type,
        value: couponData.value,
        minimum_order_amount: couponData.minimum_order_amount,
        maximum_discount_amount: couponData.maximum_discount_amount,
        usage_limit: couponData.usage_limit,
        usage_limit_per_customer: couponData.usage_limit_per_customer,
        is_active: couponData.is_active,
        starts_at: new Date(),
        ends_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      },
    });
  }
  console.log(`  ✓ ${demoCoupons.length} coupons seeded`);
}

async function seedCustomers(stores: any[]) {
  console.log("  Seeding customers...");
  for (const custData of demoCustomers) {
    const store = stores.find((s: any) => s.domain === custData.storeDomain);
    if (!store) continue;

    const hashedPassword = await bcrypt.hash(custData.password, BCRYPT_ROUNDS);

    const customer = await prisma.customer.upsert({
      where: { store_id_phone: { store_id: store.id, phone: custData.phone } },
      update: {},
      create: {
        store_id: store.id,
        customer_name: custData.customer_name,
        phone: custData.phone,
        password_hash: hashedPassword,
        status: custData.status,
      },
    });

    // Create a default address for each customer
    await prisma.customerAddress.create({
      data: {
        store_id: store.id,
        customer_id: customer.id,
        type: "SHIPPING",
        full_name: custData.customer_name,
        phone: custData.phone,
        city: "طرابلس",
        region: "طرابلس",
        street_line_1: "شارع الجمهورية، بناية 15",
        postal_code: "00218",
        is_default: true,
      },
    });
  }
  console.log(`  ✓ ${demoCustomers.length} customers seeded`);
}

// ============ Main ============

async function main() {
  console.log("🌱 Starting Demo Data Seed...\n");

  await seedPermissions();
  await seedSubscriptionPlans();
  const users = await seedUsers();
  const stores = await seedStores();
  await seedRolesAndMemberships(stores, users);
  await seedSubscriptions(stores);
  await seedCategories(stores);
  await seedProducts(stores);
  await seedCoupons(stores);
  await seedCustomers(stores);

  console.log("\n✅ Demo data seeded successfully!");
  console.log("\n📋 Test Accounts:");
  console.log(
    "┌─────────────────────────────────────────────────────────────────┐",
  );
  console.log(
    "│ Role              │ Email              │ Password    │ Notes      │",
  );
  console.log(
    "├─────────────────────────────────────────────────────────────────┤",
  );
  console.log(
    "│ Platform Owner    │ owner@wasl.com     │ Owner123!   │ Full access│",
  );
  console.log(
    "│ Platform Admin    │ admin@wasl.com     │ Admin123!   │ Platform   │",
  );
  console.log(
    "│ Store Owner       │ ahmed@store.com    │ Ahmed123!   │ Both stores│",
  );
  console.log(
    "│ Store Staff       │ sara@store.com     │ Sara1234!   │ Store 1    │",
  );
  console.log(
    "└─────────────────────────────────────────────────────────────────┘",
  );
  console.log("\n🏪 Stores:");
  console.log("  • elegance-store (ID will be shown above)");
  console.log("  • tech-store (ID will be shown above)");
  console.log("\n🎟️  Coupons: WELCOME10, SUMMER50, TECH20");
  console.log("\n👥 Storefront Customers:");
  console.log("  • mohammed@customer.com / Customer1! (elegance-store)");
  console.log("  • fatima@customer.com / Customer2! (elegance-store)");
  console.log("  • ali@customer.com / Customer3! (tech-store)");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("❌ Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
