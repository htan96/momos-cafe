"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import emailjs from "emailjs-com";
import { useAdminSettings } from "@/lib/useAdminSettings";
import CateringClosedMessage from "@/components/catering/CateringClosedMessage";

const INPUT_CLASS =
  "w-full px-3.5 py-2.5 rounded-lg border border-cream-dark bg-cream text-charcoal text-[15px] placeholder:text-charcoal/35 focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/10 transition-colors";

export default function CateringForm({
  onSuccess,
  variant = "modal",
}: {
  onSuccess?: () => void;
  variant?: "modal" | "inline";
}) {
  const { settings } = useAdminSettings();
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!settings.isCateringOpen) {
    return <CateringClosedMessage />;
  }

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

    /* 1️⃣ SAVE TO SUPABASE */
    const { error } = await supabase
      .from("CateringInquiries")
      .insert([newInquiry]);

    if (error) {
      console.error(error);
      alert("Something went wrong. Please try again.");
      return;
    }

    /* 2️⃣ SEND EMAIL VIA EMAILJS */
    try {
      await emailjs.send(
        "service_rxdcj98",     // ← replace
        "template_xjytktb",    // ← replacer
        {
          name: newInquiry.name,
          email: newInquiry.email,
          phone: newInquiry.phone,
          event_date: newInquiry.event_date,
          guest_count: newInquiry.guest_count,
          event_type: newInquiry.event_type,
          details: newInquiry.details,
        },
        "XAJWQ0IbBfufV-uED"      // ← replace
      );
    } catch (err) {
      console.error("EmailJS error:", err);
    }

    /* 3️⃣ UI FEEDBACK */
    setIsSubmitted(true);
    form.reset();

    setTimeout(() => {
      setIsSubmitted(false);
      onSuccess?.(); // closes modal
    }, 1500);
  };

  const isInline = variant === "inline";

  return (
    <div>
      {!isInline && (
        <>
          <h2 className="font-display text-3xl font-bold text-teal uppercase mb-2">
            Request Catering
          </h2>
          <div className="w-20 h-1 bg-red mb-6 rounded-full" />
          <p className="text-charcoal/80 mb-6">
        Tell us about your event and we’ll follow up to confirm details,
        pricing, and availability.
      </p>
        </>
      )}

      {isInline && (
        <h3 className="font-display text-2xl text-charcoal mb-5 leading-none">
          Request Catering
        </h3>
      )}

      <form
        onSubmit={handleSubmit}
        className={`grid gap-4 ${isInline ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}
      >
        {isInline ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="f-name" className="block font-semibold text-[11px] tracking-wider uppercase text-teal-dark mb-1.5">Your Name</label>
                <input id="f-name" name="name" type="text" placeholder="First & last name" required className={INPUT_CLASS} />
              </div>
              <div>
                <label htmlFor="f-phone" className="block font-semibold text-[11px] tracking-wider uppercase text-teal-dark mb-1.5">Phone Number</label>
                <input id="f-phone" name="phone" type="tel" placeholder="(707) 000-0000" required className={INPUT_CLASS} />
              </div>
            </div>
            <div>
              <label htmlFor="f-email" className="block font-semibold text-[11px] tracking-wider uppercase text-teal-dark mb-1.5">Email Address</label>
              <input id="f-email" name="email" type="email" placeholder="your@email.com" required className={INPUT_CLASS} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="f-date" className="block font-semibold text-[11px] tracking-wider uppercase text-teal-dark mb-1.5">Event Date</label>
                <input id="f-date" name="event_date" type="date" required className={INPUT_CLASS} />
              </div>
              <div>
                <label htmlFor="f-guests" className="block font-semibold text-[11px] tracking-wider uppercase text-teal-dark mb-1.5">Guest Count</label>
                <select id="f-guests" name="guest_count" required className={INPUT_CLASS}>
                  <option value="">How many guests?</option>
                  <option value="17">10–25 guests</option>
                  <option value="37">25–50 guests</option>
                  <option value="75">50–100 guests</option>
                  <option value="150">100–200 guests</option>
                  <option value="250">200+ guests</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="f-type" className="block font-semibold text-[11px] tracking-wider uppercase text-teal-dark mb-1.5">Catering Style</label>
              <select id="f-type" name="event_type" className={INPUT_CLASS}>
                <option value="">What are you interested in?</option>
                <option>Mexican — Fajita Bar</option>
                <option>Mexican — Taco Bar</option>
                <option>Breakfast / Brunch Spread</option>
                <option>Combination (Mexican + Breakfast)</option>
                <option>Custom / Not Sure Yet</option>
              </select>
            </div>
            <div>
              <label htmlFor="f-notes" className="block font-semibold text-[11px] tracking-wider uppercase text-teal-dark mb-1.5">Event Details</label>
              <textarea id="f-notes" name="details" placeholder="Tell us about your event — location, occasion, any special requests..." rows={4} className={`${INPUT_CLASS} min-h-[100px] resize-y`} />
            </div>
          </>
        ) : (
          <>
            <input name="name" placeholder="Your Name" required className={INPUT_CLASS} />
            <input name="email" type="email" placeholder="Email" required className={INPUT_CLASS} />
            <input name="phone" placeholder="Phone" required className={INPUT_CLASS} />
            <input name="event_date" type="date" required className={INPUT_CLASS} />
            <input name="guest_count" type="number" placeholder="# of Guests" required className={INPUT_CLASS} />
            <select name="event_type" className={INPUT_CLASS}>
              <option value="">Event Type</option>
              <option>Breakfast or Brunch</option>
              <option>Corporate Event</option>
              <option>Private Party</option>
              <option>Other</option>
            </select>
            <textarea name="details" placeholder="What menu items are you interested in?" rows={4} className={`md:col-span-2 ${INPUT_CLASS}`} />
          </>
        )}

        <button
          type="submit"
          className={`bg-red text-white font-semibold py-3.5 rounded-lg shadow-[0_4px_0_#a01e23] hover:opacity-90 transition-opacity ${isInline ? "w-full text-[15px] tracking-wider uppercase" : "md:col-span-2"}`}
        >
          Submit Catering Request
        </button>
      </form>

      {isSubmitted && (
        <p className="text-center text-teal mt-4 font-semibold">
          Your request has been sent!
        </p>
      )}

      {isInline && (
        <p className="text-center text-xs text-charcoal/45 mt-2.5 font-semibold tracking-wider">
          We&apos;ll respond within 24 hours with a custom quote.
        </p>
      )}
    </div>
  );
}
