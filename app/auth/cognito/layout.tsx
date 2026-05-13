import { StorefrontAuthPage } from "@/components/auth/StorefrontAuthChrome";

export const metadata = {
  title: "Account access",
};

export default function CognitoAuthLayout({ children }: { children: React.ReactNode }) {
  return <StorefrontAuthPage>{children}</StorefrontAuthPage>;
}
