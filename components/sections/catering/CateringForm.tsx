"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function CateringForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    const newInquiry = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      event_date: formData.get("event_date") as string,
      guest_count: Number(formData.get("guest_count")),
      event_type: formData.get("event_type") as string,
      details: formData.get("details") as string,
    };

    const { error } = await supabase.from("CateringInquiries").insert([newInquiry]);

    if (error) {
      console.error("❌ Error saving inquiry:", error.message);
      alert("Something went wrong. Please try again later.");
    } else {
      setIsSubmitted(true);
      form.reset();
      setTimeout(() => setIsSubmitted(false), 3000);
    }
  };

  return (
    <section className="py-24 px-6 md:px-12 lg:px-20 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="font-display text-4xl md:text-5xl font-bold text-[#2F6D66] uppercase mb-3">
          Catering Inquiry
        </h2>
        <p className="text-lg text-[#2F6D66]/80 leading-relaxed">
          Planning an event? Let us bring the Momo’s Café flavor to your guests.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/80 backdrop-blur-md p-8 rounded-2xl shadow-md border border-[#2F6D66]/20"
      >
        <input name="name" placeholder="Your Name" required className="input" />
        <input name="email" type="email" placeholder="Email" required className="input" />
        <input name="phone" placeholder="Phone" required className="input" />
        <input name="event_date" type="date" required className="input" />
        <input name="guest_count" type="number" placeholder="# of Guests" required className="input" />

        <select name="event_type" className="input">
          <option value="">Event Type</option>
          <option>Breakfast or Brunch</option>
          <option>Corporate Event</option>
          <option>Private Party</option>
          <option>Other</option>
        </select>

        <textarea
          name="details"
          placeholder="Additional Details..."
          rows={4}
          className="md:col-span-2 input"
        />

        <button
          type="submit"
          className="md:col-span-2 bg-[#C43B2F] text-white hover:text-[#D4AF37] font-semibold py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
        >
          Submit
        </button>
      </form>

      {isSubmitted && (
        <p className="text-center text-[#2F6D66] mt-6 font-semibold">
          ✅ Your inquiry has been sent. We’ll get back to you soon!
        </p>
      )}
    </section>
  );
}

// Tailwind helper classes for cleaner inputs
const input = `
w-full px-4 py-2 rounded-md border border-[#2F6D66]/30
bg-[#F5E5C0]/50 focus:outline-none focus:ring-2
focus:ring-[#2F6D66]/40 placeholder:text-[#2F6D66]/50
`;
