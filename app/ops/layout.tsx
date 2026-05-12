export default function OpsRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="ops-console min-h-screen bg-[#141210] text-[#f5e5c0] antialiased text-[13px] leading-snug font-[system-ui,Inter,sans-serif]">
      {children}
    </div>
  );
}
