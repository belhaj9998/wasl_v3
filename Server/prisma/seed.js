"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const prisma_1 = __importDefault(require("../src/configs/prisma"));
const constants_1 = require("../src/constant/constants");
dotenv_1.default.config();
async function seedPermissions() {
    for (const permission of constants_1.permissionSeeds) {
        await prisma_1.default.permission.upsert({
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
    for (const plan of constants_1.subscriptionPlans) {
        await prisma_1.default.subscriptionPlan.upsert({
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
    await prisma_1.default.store.upsert({
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
    const stores = await prisma_1.default.store.findMany({
        select: { id: true },
    });
    for (const store of stores) {
        for (const roleTemplate of constants_1.defaultRoleTemplates) {
            const existingRole = await prisma_1.default.storeRole.findUnique({
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
            await prisma_1.default.storeRole.create({
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
    await prisma_1.default.$disconnect();
})
    .catch(async (error) => {
    console.error("Seed failed:", error);
    await prisma_1.default.$disconnect();
    process.exit(1);
});
