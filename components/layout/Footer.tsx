export default function Footer() {
  return (
    <footer className="bg-brand-cream text-brand-charcoal text-center border-t border-brand-cream/50 py-4 text-sm">
      <p>© {new Date().getFullYear()} Momos Café — Vallejo, CA</p>
      <p className="text-brand-teal mt-1">Serving Breakfast & Lunch Since 2000</p>
    </footer>
  );
}