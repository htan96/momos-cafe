import MaintenanceSurfaceOverlay from "@/components/maintenance/MaintenanceSurfaceOverlay";
import { getMaintenanceFlags } from "@/lib/app-settings/settings";

export default async function MenuLayout({ children }: { children: React.ReactNode }) {
  const { menuEnabled } = await getMaintenanceFlags();
  return (
    <MaintenanceSurfaceOverlay surface="menu" isOpen={menuEnabled}>
      {children}
    </MaintenanceSurfaceOverlay>
  );
}
