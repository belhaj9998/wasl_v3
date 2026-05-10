import dotenv from "dotenv";
import  prisma from "../src/configs/prisma";
import { permissionSeeds,subscriptionPlans,defaultRoleTemplates } from "../src/constant/constants";



dotenv.config();




async function seedPermissions() {
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
}

async function seedSubscriptionPlans() {
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
}
async function seedDemoStore() {
  // إنشاء متجر تجريبي لكي نتمكن من اختبار ربط الصلاحيات به
  await prisma.store.upsert({
    where: { domain: 'demo' },
    update: {},
    create: {
      name: 'متجر وصل التجريبي',
      domain: 'demo',
      // ضع هنا أي حقول إجبارية أخرى يطلبها منك نموذج الـ Store
    },
  });
}
async function seedDefaultRolesForExistingStores() {
  const stores = await prisma.store.findMany({
    select: { id: true },
  });

  for (const store of stores) {
    for (const roleTemplate of defaultRoleTemplates) {
      const existingRole = await prisma.storeRole.findUnique({
        where: {
          store_id_slug: {
            store_id: store.id,
            slug: roleTemplate.slug,
          },
        },
      });

      if (existingRole) {
        continue;
      }

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
              permission: {
                connect: {
                  code: permissionCode,
                },
              },
            })),
          },
        },
      });
    }
  }
}

async function main() {
  await seedPermissions();
  await seedSubscriptionPlans();
  
  // 1. ننشئ المتجر أولاً
  await seedDemoStore(); 
  
  // 2. الآن هذه الدالة ستجد متجراً لتزرع فيه الصلاحيات!
  await seedDefaultRolesForExistingStores();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
