import type { SVGProps, ReactElement } from "react";

const stroke = 1.5;

function IconBase(props: SVGProps<SVGSVGElement> & { title?: string }) {
  const { title, children, className, ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : true}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function NavHomeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 9.5V19a1 1 0 0 0 1 1h4v-4h2v4h4a1 1 0 0 0 1-1V9.5" />
    </IconBase>
  );
}

export function NavMenuIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M5 7h14M5 12h14M5 17h10" />
    </IconBase>
  );
}

export function NavCartIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="9" cy="19.25" r="1.1" />
      <circle cx="17.25" cy="19.25" r="1.1" />
      <path d="M3.75 4.75h2.2l1.2 8.4a1.5 1.5 0 0 0 1.48 1.29h8.27a1.5 1.5 0 0 0 1.47-1.2l1.2-6H6.25" />
    </IconBase>
  );
}

export function NavAccountIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M12 12.25a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" />
      <path d="M5.5 20.25a6.25 6.25 0 0 1 13 0" />
    </IconBase>
  );
}

export function NavSignInIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M15.25 12H4.75M12 8.25 15.75 12 12 15.75" />
      <path d="M9.75 6.75V5.5a2 2 0 0 1 2-2h6.5a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-6.5a2 2 0 0 1-2-2v-1.25" />
    </IconBase>
  );
}

export function NavOrderIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M8.5 5.75h12.5a1 1 0 0 1 1 1v10.5a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-11a1 1 0 0 1 1-1Z" />
      <path d="M8.5 8.75H6.25A2.25 2.25 0 0 0 4 11v6.25c0 .69.56 1.25 1.25 1.25H8.5" />
      <path d="M11 12.25h6M11 15.75h4" />
    </IconBase>
  );
}

export function NavOrdersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M7.25 4.75h-2a1 1 0 0 0-1 1v14.5a1 1 0 0 0 1 1h12.5a1 1 0 0 0 1-1v-3.25" />
      <path d="M10.25 4.75h10a1 1 0 0 1 1 1v10.5a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-11a1 1 0 0 1 1-1Z" />
      <path d="M12.25 12.25h4.5M12.25 15.25h4.5" />
    </IconBase>
  );
}

export function NavRewardsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M12 4.75 14.25 10 19.75 10.5 15.5 14l1.35 5.25L12 16.9 7.15 19.25 8.5 14 4.25 10.5 9.75 10Z" />
    </IconBase>
  );
}

export function NavMessagesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M5.25 5.75h13.5a1.25 1.25 0 0 1 1.25 1.25v8.5a1.25 1.25 0 0 1-1.25 1.25H14l-3.25 2.6a.55.55 0 0 1-.9-.42V16.75H5.25a1.25 1.25 0 0 1-1.25-1.25V7a1.25 1.25 0 0 1 1.25-1.25Z" />
      <path d="M8.25 10.25h7.5M8.25 12.75h5" />
    </IconBase>
  );
}

export function NavSettingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M11.25 4.75h1.5l.35 1.9a6 6 0 0 1 1.65.68l1.75-.95 1.1 1.9-1.45 1.3c.15.55.25 1.1.25 1.67s-.1 1.12-.25 1.67l1.45 1.3-1.1 1.9-1.75-.95a6 6 0 0 1-1.65.68l-.35 1.9h-1.5l-.35-1.9a6 6 0 0 1-1.65-.68l-1.75.95-1.1-1.9 1.45-1.3a6.35 6.35 0 0 1 0-3.35l-1.45-1.3 1.1-1.9 1.75.95c.5-.3 1.05-.53 1.65-.68l.35-1.9Z" />
      <path d="M12 12.75a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" />
    </IconBase>
  );
}

export function NavQueuesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M5.25 6.75h13.5M5.25 12h10M5.25 17.25h7.5" />
      <path d="M19 11.25v6a1 1 0 0 1-1 1h-1.25" />
    </IconBase>
  );
}

export function NavShippingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M3.75 8.25h10.5v8.5H3.75zM14.25 11.25h3l2.5 2.5v3H14.25" />
      <path d="M8.25 20.25a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM17.25 20.25a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
    </IconBase>
  );
}

export function NavSupportIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M12 18.25h.01M10.25 14.25a2 2 0 1 1 3.45 1.4 1.65 1.65 0 0 1-.95 1.35c-.55.25-.75.45-.75 1.1" />
      <path d="M12 4.75a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15Z" />
    </IconBase>
  );
}

export function NavGovernanceIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M6.25 6.75h11.5v10.5a1 1 0 0 1-1 1H7.25a1 1 0 0 1-1-1V6.75Z" />
      <path d="M8.75 10.25h6.5M8.75 13.75h4.5" />
      <path d="M10.25 4.75h3.5V6.5h-3.5V4.75Z" />
    </IconBase>
  );
}

export function NavSecurityIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M12 4.25 16.75 6.5v5.1c0 2.85-2.05 4.65-4.75 5.4a.75.75 0 0 1-.5 0C8.55 16.25 6.5 14.45 6.5 11.6V6.5L12 4.25Z" />
      <path d="M9.75 12.25 11 13.5l3.25-3.5" />
    </IconBase>
  );
}

export function NavHealthIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M12 5.5c-3.25 3-5.5 5.35-5.5 8a4.5 4.5 0 0 0 9 0c0-2.65-2.25-5-5.5-8Z" />
      <path d="M9.75 12.75h1.5v1.5h1.5" />
    </IconBase>
  );
}

export function NavMoreIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M6.25 12h.01M12 12h.01M17.75 12h.01" />
    </IconBase>
  );
}

export type NavigationGlyphId =
  | "home"
  | "menu"
  | "order"
  | "cart"
  | "account"
  | "signIn"
  | "orders"
  | "rewards"
  | "messages"
  | "settings"
  | "queues"
  | "shipping"
  | "support"
  | "more"
  | "governance"
  | "security"
  | "health";

const MAP: Record<NavigationGlyphId, (p: SVGProps<SVGSVGElement>) => ReactElement> = {
  home: NavHomeIcon,
  menu: NavMenuIcon,
  order: NavOrderIcon,
  cart: NavCartIcon,
  account: NavAccountIcon,
  signIn: NavSignInIcon,
  orders: NavOrdersIcon,
  rewards: NavRewardsIcon,
  messages: NavMessagesIcon,
  settings: NavSettingsIcon,
  queues: NavQueuesIcon,
  shipping: NavShippingIcon,
  support: NavSupportIcon,
  more: NavMoreIcon,
  governance: NavGovernanceIcon,
  security: NavSecurityIcon,
  health: NavHealthIcon,
};

export function NavGlyph({ name, ...props }: { name: NavigationGlyphId } & SVGProps<SVGSVGElement>) {
  const Cmp = MAP[name];
  return <Cmp {...props} />;
}
