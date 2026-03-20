/**
 * Mock product data for Shop page.
 * Replace with Shopify/Square API when integrating.
 */

export interface Product {
  id: string;
  name: string;
  price: number;
  priceLabel?: string; // e.g. "$10+" for variable pricing
  image?: string;
  imagePlaceholder?: string; // emoji or placeholder when no image
  description: string;
  tag?: string;
  buttonLabel?: "Add to Cart" | "Buy Now";
}

export const mockProducts: Product[] = [
  {
    id: "1",
    name: "Momo's Classic Tee",
    price: 28,
    imagePlaceholder: "👕",
    description: "Heavyweight cotton, bridge logo on chest. Unisex fit, sizes S–2XL.",
    tag: "Apparel",
    buttonLabel: "Add to Cart",
  },
  {
    id: "2",
    name: "Café de Olla Mug",
    price: 16,
    imagePlaceholder: "☕",
    description: "12oz ceramic mug with the Momo's logo. Microwave and dishwasher safe.",
    tag: "Kitchen",
    buttonLabel: "Add to Cart",
  },
  {
    id: "3",
    name: "Momo's Gift Card",
    price: 10,
    priceLabel: "$10+",
    imagePlaceholder: "🎁",
    description: "The perfect gift for anyone who loves breakfast. Available in $10, $25, and $50.",
    tag: "Gift Card",
    buttonLabel: "Buy Now",
  },
  {
    id: "4",
    name: "Bridge Snapback",
    price: 32,
    imagePlaceholder: "🧢",
    description: "Adjustable snapback with embroidered Carquinez Bridge logo. One size.",
    tag: "Headwear",
    buttonLabel: "Add to Cart",
  },
  {
    id: "5",
    name: "Momo's Hoodie",
    price: 52,
    imagePlaceholder: "🧣",
    description: "Midweight pullover, teal colorway, Momo's wordmark on back. Sizes S–2XL.",
    tag: "Apparel",
    buttonLabel: "Add to Cart",
  },
  {
    id: "6",
    name: "Canvas Tote Bag",
    price: 18,
    imagePlaceholder: "🛍️",
    description: "Heavy-duty canvas, Momo's logo print, natural colorway. Great for market runs.",
    tag: "Accessories",
    buttonLabel: "Add to Cart",
  },
];
