"use client";

import { useState } from "react";
import CateringModal from "./CateringModal";
import CateringForm from "./CateringForm";

export default function CateringMenu() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <section className="py-24 px-6 md:px-12 lg:px-20 max-w-6xl mx-auto">
      {/* ================= MEXICAN CATERING ================= */}
      <div className="text-center mb-16">
        <h2 className="font-display text-4xl md:text-5xl font-bold text-[#2F6D66] uppercase mb-4">
          Mexican Catering
        </h2>
        <div className="w-28 h-1 bg-[#C43B2F] mx-auto mb-6 rounded-full" />
        <p className="text-lg text-[#2F6D66]/80 max-w-2xl mx-auto">
          Build-your-own taco and fajita bars, perfect for groups and events.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-12 mb-24">
        {/* FAJITA BAR */}
        <div className="bg-[#FFF8EA] p-8 rounded-3xl shadow-lg border-2 border-[#C43B2F]">
          <h3 className="text-[#C43B2F] font-bold text-2xl mb-4 uppercase">
            Fajita Bar
          </h3>

          <p className="mb-4">
            Choice of steak, chicken, or shrimp sautéed with tomatoes, bell
            peppers, onions, and potatoes.
          </p>

          <p className="mb-4">
            Served with rice, black or refried beans, and flour & corn tortillas.
          </p>

          <p>
            Includes guacamole, sour cream, shredded cheese, and salsa.
          </p>
        </div>

        {/* TACO BAR */}
        <div className="bg-[#FFF8EA] p-8 rounded-3xl shadow-lg border-2 border-[#C43B2F]">
          <h3 className="text-[#C43B2F] font-bold text-2xl mb-4 uppercase">
            Taco Bar
          </h3>

          <p className="mb-4">
            Choice of steak, chicken, or shrimp served with flour & corn
            tortillas.
          </p>

          <p>
            Toppings include salsa, guacamole, sour cream, onions, and cilantro.
          </p>
        </div>
      </div>

      {/* ================= BREAKFAST CATERING ================= */}
      <div className="text-center mb-16">
        <h2 className="font-display text-4xl md:text-5xl font-bold text-[#2F6D66] uppercase mb-4">
          Breakfast Catering
        </h2>
        <div className="w-28 h-1 bg-[#C43B2F] mx-auto rounded-full" />
      </div>

      <div className="grid md:grid-cols-2 gap-10 mb-20">
        {/* BREAKFAST BASES */}
        <div className="bg-[#FFF8EA] p-6 rounded-2xl shadow-md border-2 border-[#C43B2F]">
          <h4 className="text-[#C43B2F] font-semibold text-xl mb-2 uppercase">
            Breakfast Bases
          </h4>
          <p>Waffles, pancakes, and French toast</p>
          <p className="italic text-sm mt-1">
            Chicken & waffles available
          </p>
        </div>

        {/* EGGS */}
        <div className="bg-[#FFF8EA] p-6 rounded-2xl shadow-md border-2 border-[#C43B2F]">
          <h4 className="text-[#C43B2F] font-semibold text-xl mb-2 uppercase">
            Eggs
          </h4>
          <p>Scrambled, fried, over easy, over medium, or over hard</p>
        </div>

        {/* BREAKFAST SIDES */}
        <div className="bg-[#FFF8EA] p-6 rounded-2xl shadow-md border-2 border-[#C43B2F]">
          <h4 className="text-[#C43B2F] font-semibold text-xl mb-2 uppercase">
            Breakfast Sides
          </h4>
          <p>Country potatoes, rice, and beans</p>
        </div>

        {/* PROTEINS */}
        <div className="bg-[#FFF8EA] p-6 rounded-2xl shadow-md border-2 border-[#C43B2F]">
          <h4 className="text-[#C43B2F] font-semibold text-xl mb-2 uppercase">
            Proteins
          </h4>
          <p>
            Bacon, sausage, ham, Canadian bacon, linguica, fried chicken,
            and New York strip steak
          </p>
        </div>
      </div>

      {/* ================= CTA ================= */}
      <div className="text-center mt-24">
        <p className="text-lg text-[#2F6D66] mb-6">
          Ready to plan your event?
        </p>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#C43B2F] text-white px-10 py-4 rounded-full font-semibold shadow-lg hover:shadow-xl transition"
        >
          Request Catering
        </button>
      </div>

      {/* ================= MODAL ================= */}
      <CateringModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <CateringForm onSuccess={() => setIsModalOpen(false)} />
      </CateringModal>
    </section>
  );
}
