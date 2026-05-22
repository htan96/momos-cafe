This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Customer auth & sessions

After sign-in, password-completion, explicit refresh (`POST /api/auth/cognito/refresh`), or a **silent** refresh from `GET /api/auth/cognito/session` when the ID token expired, we upsert a Prisma **`Customer`** with `externalAuthSubject` = Cognito `sub`.

**`CommerceOrder.customerId`** references that **`Customer.id`**. Paid **guest** checkouts stash `metadata.storefrontCheckoutEmail` so signing up with the same email can **`updateMany`** link those orders to the account.

Strict **“one concurrent session per account/email”** is **not enforced** via Cognito Hosted UI alone; doing so needs extra revocation/session-store design (see AWS docs). This repo documents the gap rather than presenting a mocked device dashboard.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
