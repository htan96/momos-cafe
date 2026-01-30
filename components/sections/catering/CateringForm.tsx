"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function CateringForm({ onSuccess }: { onSuccess?: () => void }) {
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

    const { error } = await supabase
      .from("CateringInquiries")
      .insert([newInquiry]);

    if (error) {
      alert("Something went wrong. Please try again later.");
    } else {
      setIsSubmitted(true);
      form.reset();
      setTimeout(() => {
        setIsSubmitted(false);
        onSuccess?.();
      }, 1500);
    }
  };

  return (
    <div>
      <h2 className="font-display text-3xl font-bold text-[#2F6D66] uppercase mb-2">
        Request Catering
      </h2>
      <div className="w-20 h-1 bg-[#C43B2F] mb-6 rounded-full" />

      <p className="text-[#2F6D66]/80 mb-6">
        Tell us about your event and we’ll follow up to confirm details,
        pricing, and availability.
      </p>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
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
          placeholder="What menu items are you interested in?"
          rows={4}
          className="md:col-span-2 input"
        />

        <button
          type="submit"
          className="md:col-span-2 bg-[#C43B2F] text-white font-semibold py-3 rounded-full shadow-lg hover:shadow-xl transition"
        >
          Submit Request
        </button>
      </form>

      {isSubmitted && (
        <p className="text-center text-[#2F6D66] mt-4 font-semibold">
          Your request has been sent!
        </p>
      )}
    </div>
  );
}

const input = `
w-full px-4 py-2 rounded-md border border-[#2F6D66]/30
bg-white focus:outline-none focus:ring-2
focus:ring-[#C43B2F]/40 placeholder:text-[#2F6D66]/50
`;
