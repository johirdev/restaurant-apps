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
src/
│
├── app/
│   └── api/
│       ├── auth/
│       ├── foods/
│       ├── categories/
│       ├── orders/
│       ├── customers/
│       └── settings/
│
├── config/
│   ├── database.ts
│   ├── env.ts
│   └── cloudinary.ts
│
├── controllers/
│   ├── auth.controller.ts
│   ├── food.controller.ts
│   ├── category.controller.ts
│   ├── order.controller.ts
│   └── customer.controller.ts
│
├── services/
│   ├── auth.service.ts
│   ├── food.service.ts
│   ├── category.service.ts
│   ├── order.service.ts
│   └── customer.service.ts
│
├── repositories/
│   ├── interfaces/
│   │   ├── IFoodRepository.ts
│   │   ├── IOrderRepository.ts
│   │   └── IUserRepository.ts
│   │
│   ├── mongodb/
│   │   ├── food.repository.ts
│   │   ├── order.repository.ts
│   │   └── user.repository.ts
│   │
│   └── postgres/
│       ├── food.repository.ts
│       ├── order.repository.ts
│       └── user.repository.ts
│
├── models/
│   ├── Food.ts
│   ├── Order.ts
│   ├── User.ts
│   └── Category.ts
│
├── prisma/
│   └── schema.prisma
│
├── lib/
│   ├── jwt.ts
│   ├── bcrypt.ts
│   ├── response.ts
│   └── pagination.ts
│
├── middlewares/
├── validations/
├── utils/
├── types/
└── constants/

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
