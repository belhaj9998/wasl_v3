import "dotenv/config";
import prisma from "../src/configs/prisma";

(async () => {
  const tags = await prisma.orderTag.findMany({
    orderBy: { id: "asc" },
    select: {
      id: true,
      store_id: true,
      name: true,
      color_preset: true,
      created_at: true,
    },
  });
  console.log(`Total OrderTag rows: ${tags.length}`);
  console.log(JSON.stringify(tags, null, 2));
  await prisma.$disconnect();
})();
