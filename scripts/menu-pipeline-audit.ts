import { getMenuFromSquare } from "@/lib/square";

async function main() {
  const { categories } = await getMenuFromSquare();
  const total = categories.reduce((n, c) => n + c.menuitems.length, 0);
  const withImg = categories.reduce(
    (n, c) => n + c.menuitems.filter((m) => Boolean(m.image_url)).length,
    0
  );
  const sample = categories.slice(0, 30).map((c) => ({
    name: c.name,
    count: c.menuitems.length,
  }));
  console.log(
    JSON.stringify(
      { categoryCount: categories.length, menuItemCount: total, itemsWithImage: withImg, categorySample: sample },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
