# AgroTrack+ - Simple & Clean

A streamlined farm-to-table platform with role-based authentication.

## Features

✅ **Authentication System**
- Sign In / Sign Up
- Role-based access (Admin, Farmer, Customer)
- Protected routes
- Session management

✅ **Public Pages**
- Homepage
- Products listing
- About page
- Contact page

✅ **Role-Based Dashboards**
- Admin Dashboard
- Farmer Dashboard
- Customer Dashboard

## Quick Start

```bash
# Install dependencies
npm install

# Seed demo users
npm run db:seed-users

# Start development server
npm run dev
```

Visit: **http://localhost:3000**

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@agrotrack.com | any |
| Farmer | farmer@agrotrack.com | any |
| Customer | customer@agrotrack.com | any |

## Project Structure

```
pages/
├── index.tsx           # Homepage
├── products.tsx        # Products page
├── about.tsx          # About page
├── contact.tsx        # Contact page
├── dashboard.tsx      # Role-based dashboard router
├── auth/
│   ├── signin.tsx     # Sign in page
│   └── signup.tsx     # Sign up page
├── admin/
│   └── farmers.tsx    # Admin: Manage farmers
└── api/
    └── auth/          # Authentication APIs

components/
├── dashboards/        # Role-specific dashboards
└── layout/           # Layout components

lib/
├── auth.ts           # NextAuth configuration
├── prisma.ts         # Database client
└── utils.ts          # Utility functions
```

## Tech Stack

- **Framework**: Next.js 14
- **Authentication**: NextAuth.js
- **Database**: PostgreSQL + Prisma
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## Environment Variables

Create `.env.local`:

```env
DATABASE_URL="your-database-url"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

## Clean & Simple

This is a minimal, production-ready version with:
- ✅ Zero unnecessary files
- ✅ Clean code structure
- ✅ Essential features only
- ✅ No bloat
- ✅ Easy to understand
- ✅ Ready to extend

## License

MIT
