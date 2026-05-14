import MaintenanceSurfaceOverlay from "@/components/maintenance/MaintenanceSurfaceOverlay";
import { getMaintenanceFlags } from "@/lib/app-settings/settings";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const { shopEnabled } = await getMaintenanceFlags();
  return (
    <MaintenanceSurfaceOverlay surface="shop" isOpen={shopEnabled}>
      {children}
    </MaintenanceSurfaceOverlay>
  );
}
