"use client";

import { useEffect } from "react";
import Image from "next/image";

export default function ShopPage() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src =
      "https://sdks.shopifycdn.com/buy-button/latest/buy-button-storefront.min.js";
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      if ((window as any).ShopifyBuy) {
        const ShopifyBuy = (window as any).ShopifyBuy;
        if (!ShopifyBuy.UI) return;

        const client = ShopifyBuy.buildClient({
          domain: "momo-s-cafe.myshopify.com",
          storefrontAccessToken: "599b66a2d2fbca3d384b63ff33a69aa3",
        });

        ShopifyBuy.UI.onReady(client).then((ui: any) => {
          ui.createComponent("collection", {
            id: "300325601328",
            node: document.getElementById(
              "collection-component-1764800956184"
            ),
            moneyFormat: "%24%7B%7Bamount%7D%7D",
            options: {
              product: {
                styles: {
                  product: {
                    backgroundColor: "#fffaf2",
                    borderRadius: "1rem",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
                    padding: "20px",
                    textAlign: "center",
                    transition:
                      "transform 0.25s ease, box-shadow 0.25s ease",
                    ":hover": {
                      transform: "translateY(-4px)",
                      boxShadow: "0 6px 18px rgba(0,0,0,0.1)",
                    },
                  },
                  title: {
                    fontFamily: "Lexend, sans-serif",
                    fontSize: "1.1rem",
                    color: "#3B2E2A",
                    textTransform: "capitalize",
                    marginBottom: "0.4rem",
                  },
                  price: {
                    color: "#3B7D74", // ✅ Momo’s teal accent
                    fontWeight: "600",
                    fontSize: "1rem",
                  },
                  button: {
                    backgroundColor: "#6C8B74",
                    color: "#fff",
                    borderRadius: "0.5rem",
                    padding: "0.6rem 1rem",
                    fontFamily: "Lexend, sans-serif",
                    fontWeight: "500",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    transition: "background 0.3s ease",
                    ":hover": {
                      backgroundColor: "#D4A94E",
                    },
                  },
                },
                text: { button: "Add to Cart" },
              },
              cart: {
                styles: {
                  button: {
                    backgroundColor: "#6C8B74",
                    ":hover": { backgroundColor: "#D4A94E" },
                  },
                },
                text: {
                  total: "Subtotal",
                  button: "Checkout",
                },
              },
            },
          });
        });
      }
    };
  }, []);

  return (
    <section className="min-h-screen bg-cream text-espresso py-24 px-6 md:px-12">
      <div className="max-w-6xl mx-auto text-center">
        {/* 🧢 Logo Header */}
        <div className="flex justify-center mb-4">
          <Image
            src="/images/logo.png"
            alt="Momo’s logo"
            width={300}
            height={300}
            className="mx-auto"
          />
        </div>

        {/* ✨ Divider + Tagline */}
        <div className="h-[2px] w-20 bg-[#6C8B74] mx-auto my-6 rounded-full"></div>

        <p className="text-lg md:text-xl text-espresso/80 mb-14 font-medium">
          From our crew to yours — made with the same heart we put into every plate.
        </p>

        {/* 🛍️ Shopify Product Grid */}
        <div
          id="collection-component-1764800956184"
          className="flex flex-wrap justify-center gap-10"
        ></div>

        {/* 🌿 Footer Message */}
        <div className="mt-20 text-center text-espresso/70">
          <p className="text-sm md:text-base">
            Every purchase helps us serve up community, comfort, and connection — just like we do at the diner.
          </p>
        </div>
      </div>
    </section>
  );
}
