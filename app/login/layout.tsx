import { StorefrontAuthPage } from "@/components/auth/StorefrontAuthChrome";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <StorefrontAuthPage>{children}</StorefrontAuthPage>;
}

export const metadata = {
  title: "Sign in",
};
