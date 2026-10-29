<!-- d773e1c1-467d-4ab3-b5d5-479036cbbfa9 49e941b7-a883-48f0-9b9e-4b3b6854d8af -->
# Travel Booking Platform - Next.js Architecture

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js v5 (Auth.js)
- **Styling**: Tailwind CSS
- **State Management**: React Context + Zustand (for complex state)
- **API Integration**: Server Actions + API Routes
- **Payment**: Stripe (future integration ready)

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── (auth)/          # Auth-related pages (login, signup)
│   │   ├── (client)/         # Client-facing pages
│   │   │   ├── page.tsx      # Home/landing
│   │   │   ├── tours/        # Browse tours
│   │   │   ├── bookings/     # User booking history
│   │   │   └── profile/      # User profile
│   │   ├── (admin)/          # Admin dashboard
│   │   │   ├── dashboard/
│   │   │   ├── tours/        # Tour management
│   │   │   ├── bookings/     # All bookings
│   │   │   ├── users/        # User management
│   │   │   └── api-config/   # Third-party API management
│   │   ├── api/              # API routes
│   │   │   ├── auth/
│   │   │   ├── tours/
│   │   │   ├── bookings/
│   │   │   └── external/     # Third-party API proxy
│   │   └── layout.tsx
│   ├── components/
│   │   ├── client/           # Client UI components
│   │   ├── admin/            # Admin UI components
│   │   └── shared/           # Shared components
│   ├── lib/
│   │   ├── prisma.ts         # Prisma client
│   │   ├── auth.ts           # Auth config
│   │   └── api-integrations/ # Third-party API clients
│   └── types/
├── prisma/
│   └── schema.prisma
└── package.json
```

## Database Schema (Key Models)

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  role      Role     @default(CLIENT)
  bookings  Booking[]
  createdAt DateTime @default(now())
}

model Tour {
  id          String   @id @default(cuid())
  title       String
  destination String
  provider    String   # Third-party provider name
  externalId  String   # ID in provider's system
  price       Float
  bookings    Booking[]
  isActive    Boolean  @default(true)
}

model Booking {
  id            String   @id @default(cuid())
  userId        String
  tourId        String
  status        BookingStatus
  paymentStatus PaymentStatus
  externalUrl   String?  # Redirect URL to provider
  createdAt     DateTime @default(now())
}

model ApiProvider {
  id          String @id @default(cuid())
  name        String @unique
  apiKey      String @db.Text # Encrypted
  endpoint    String
  isActive    Boolean @default(true)
}
```

## Core Features Implementation

### 1. Authentication System

- NextAuth.js with credentials provider + JWT
- Role-based access control (CLIENT vs ADMIN)
- Protected routes with middleware
- Session management

### 2. Client-Side Features

- **Landing Page**: Hero section, featured destinations, search
- **Tour Listing**: Filter by destination, price, dates, provider
- **Tour Details**: Full description, itinerary, booking button
- **Booking Flow**: 
  - Select tour → Confirm details → Create booking record → Redirect to provider
  - Save booking in DB with "PENDING" status
- **User Dashboard**: View booking history, profile management

### 3. Admin Panel

- **Dashboard**: Analytics (total bookings, revenue, active tours)
- **API Provider Management**: 
  - Add/edit/delete third-party API credentials
  - Test API connections
  - View API usage stats
- **Tour Management**:
  - Fetch tours from third-party APIs
  - Add/edit/delete tours manually
  - Bulk import tours
  - Enable/disable tours
- **Booking Management**: View all bookings, update statuses
- **User Management**: View users, manage roles

### 4. Third-Party API Integration

- **API Abstraction Layer**: Create unified interface for different providers
- **API Proxy Routes**: Hide API keys, handle rate limiting
- **Caching Strategy**: Cache tour data (Redis optional)
- **Error Handling**: Graceful fallbacks when APIs fail
- **Webhook Support**: Receive booking confirmations from providers

### 5. Security Measures

- Encrypted API keys in database
- Server-side API calls only (no exposed keys)
- CSRF protection
- Input validation (Zod schemas)
- Rate limiting on API routes

## Development Phases

### Phase 1: Foundation Setup (DETAILED)

#### Step 1.1: Initialize Next.js Project

```bash
npx create-next-app@latest travel-puzzle --typescript --tailwind --app --src-dir --import-alias "@/*"
```

Configuration choices:

- ✅ TypeScript
- ✅ ESLint
- ✅ Tailwind CSS
- ✅ `src/` directory
- ✅ App Router
- ✅ Import alias (@/*)
- ❌ Turbopack (not stable yet)

#### Step 1.2: Install Core Dependencies

```bash
npm install @prisma/client next-auth@beta zod zustand bcryptjs
npm install -D prisma @types/bcryptjs
```

#### Step 1.3: Set Up Prisma

1. Initialize Prisma: `npx prisma init`
2. Create initial schema in `prisma/schema.prisma`:

   - User model (id, email, password, name, role, createdAt, updatedAt)
   - Tour model (id, title, description, destination, provider, externalId, price, images, isActive, createdAt)
   - Booking model (id, userId, tourId, status, paymentStatus, externalUrl, totalAmount, createdAt)
   - ApiProvider model (id, name, apiKey, apiSecret, endpoint, isActive, createdAt)
   - Add enums: Role (CLIENT, ADMIN), BookingStatus (PENDING, CONFIRMED, CANCELLED), PaymentStatus (PENDING, PAID, REFUNDED)

3. Create `src/lib/prisma.ts` - Prisma client singleton
4. Set DATABASE_URL in `.env`
5. Run: `npx prisma generate`

#### Step 1.4: Configure Environment Variables

Create `.env` file:

```
DATABASE_URL="postgresql://user:password@localhost:5432/travelpuzzle"
NEXTAUTH_SECRET="generate-random-secret-here"
NEXTAUTH_URL="http://localhost:3000"
NODE_ENV="development"
```

Create `.env.example` (without sensitive values) for repository

#### Step 1.5: Create Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── signup/
│   │       └── page.tsx
│   ├── (client)/
│   │   ├── layout.tsx
│   │   ├── page.tsx          # Landing/home page
│   │   ├── tours/
│   │   │   ├── page.tsx      # Tour listing
│   │   │   └── [id]/
│   │   │       └── page.tsx  # Tour details
│   │   ├── bookings/
│   │   │   └── page.tsx      # User bookings
│   │   └── profile/
│   │       └── page.tsx
│   ├── (admin)/
│   │   ├── layout.tsx
│   │   └── dashboard/
│   │       └── page.tsx
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts
│   ├── layout.tsx            # Root layout
│   └── globals.css
├── components/
│   ├── ui/                   # Shadcn-style base components
│   ├── client/               # Client-specific components
│   ├── admin/                # Admin-specific components
│   └── shared/               # Shared components (Navbar, Footer, etc.)
├── lib/
│   ├── prisma.ts
│   ├── auth.ts               # NextAuth config
│   ├── utils.ts              # Helper functions
│   └── validations/          # Zod schemas
└── types/
    └── index.ts              # TypeScript types
```

#### Step 1.6: Configure NextAuth.js v5

1. Create `src/lib/auth.ts`:

   - Configure credentials provider
   - Add JWT callbacks
   - Add session callbacks with role
   - Password verification with bcrypt

2. Create API route: `src/app/api/auth/[...nextauth]/route.ts`
3. Create `src/middleware.ts` for protected routes:

   - Protect `/dashboard/*` (admin only)
   - Protect `/bookings` and `/profile` (authenticated users)
   - Redirect logic based on role

#### Step 1.7: Create Type Definitions

Create `src/types/index.ts`:

```typescript
export type UserRole = 'CLIENT' | 'ADMIN';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
}

export interface Tour {
  id: string;
  title: string;
  description: string;
  destination: string;
  price: number;
  images: string[];
  provider: string;
}

// ... more types
```

#### Step 1.8: Configure Tailwind

Update `tailwind.config.ts`:

- Add custom colors (primary, secondary, accent)
- Add custom fonts
- Configure dark mode (class strategy)
- Add animation utilities

#### Step 1.9: Create Base UI Components

Create reusable components in `src/components/ui/`:

- Button (variants: primary, secondary, outline, ghost)
- Input
- Card
- Badge
- Alert
- Loading spinner

#### Step 1.10: Create Root Layout

`src/app/layout.tsx`:

- HTML structure with proper metadata
- Font configuration (Inter or similar)
- Session provider wrapper
- Global styles

#### Step 1.11: Create Shared Components

- `Navbar` (src/components/shared/Navbar.tsx)
  - Logo
  - Navigation links (conditional based on auth/role)
  - User menu dropdown
  - Mobile menu
- `Footer` (src/components/shared/Footer.tsx)
  - Links, social media, copyright

#### Step 1.12: Implement Authentication Pages

1. **Login Page** (`src/app/(auth)/login/page.tsx`):

   - Email/password form
   - Client-side validation
   - Server action for authentication
   - Error handling
   - Link to signup

2. **Signup Page** (`src/app/(auth)/signup/page.tsx`):

   - Registration form (name, email, password, confirm password)
   - Client-side validation
   - Server action to create user
   - Password hashing
   - Auto-login after signup
   - Link to login

#### Step 1.13: Create Initial Landing Page

`src/app/(client)/page.tsx`:

- Hero section with CTA
- Featured destinations (static for now)
- How it works section
- Basic styling with Tailwind

#### Step 1.14: Set Up Git and Documentation

1. Create `.gitignore` (ensure .env, node_modules, .next are ignored)
2. Create `README.md`:

   - Project overview
   - Setup instructions
   - Environment variables needed
   - Database setup commands

3. Initialize git: `git init && git add . && git commit -m "Initial project setup"`

#### Phase 1 Deliverables Checklist

- [ ] Next.js 14+ project initialized with TypeScript and Tailwind
- [ ] All project folders and structure created
- [ ] Prisma configured with complete schema
- [ ] Database connection established
- [ ] NextAuth.js configured with credentials provider
- [ ] Protected route middleware working
- [ ] Login and signup pages functional
- [ ] Root layout with Navbar and Footer
- [ ] Basic UI components created
- [ ] Landing page with hero section
- [ ] Environment variables properly configured
- [ ] Git repository initialized with .gitignore
- [ ] README with setup instructions

### Phase 2: Client-Side Core

- Build tour listing and filtering
- Tour detail pages
- Basic booking flow (redirect to provider)
- User dashboard and booking history

### Phase 3: Admin Panel

- Admin dashboard layout
- API provider CRUD operations
- Tour management interface
- Manual tour creation/editing

### Phase 4: API Integration

- Create API abstraction layer
- Implement provider-specific clients (start with 1-2 providers)
- Build tour sync functionality
- Add webhook handlers

### Phase 5: Advanced Features

- Search and advanced filtering
- Booking status tracking
- Email notifications
- Analytics and reporting

### Phase 6: Payment Integration (Future)

- Stripe integration
- Payment processing flow
- Refund handling
- Invoice generation

## Key Third-Party Services to Consider

- **Tour Providers**: Viator, GetYourGuide, TourRadar APIs
- **Database**: PostgreSQL (Vercel Postgres, Supabase, or Railway)
- **Email**: Resend or SendGrid
- **File Storage**: Vercel Blob or Cloudflare R2 (for tour images)
- **Deployment**: Vercel

## Environment Variables Needed

```
DATABASE_URL
NEXTAUTH_SECRET
NEXTAUTH_URL
# Third-party API keys (stored in DB, not env)
```

## Initial Dependencies

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@prisma/client": "^5.0.0",
    "next-auth": "^5.0.0-beta",
    "zod": "^3.22.0",
    "tailwindcss": "^3.4.0",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "typescript": "^5.4.0",
    "prisma": "^5.0.0"
  }
}
```

## Next Steps After Setup

1. Identify 2-3 specific tour provider APIs to integrate
2. Design UI/UX mockups for key pages
3. Set up PostgreSQL database (local or cloud)
4. Begin Phase 1 implementation

### To-dos

- [ ] Initialize Next.js 14+ project with TypeScript, Tailwind, and project structure
- [ ] Set up Prisma with PostgreSQL and create initial schema (User, Tour, Booking, ApiProvider models)
- [ ] Configure NextAuth.js v5 with role-based authentication (CLIENT/ADMIN)
- [ ] Create login, signup, and protected route middleware
- [ ] Create root layout, client layout, and admin layout with navigation
- [ ] Build client-side tour listing and detail pages with filtering
- [ ] Implement booking flow (create record, redirect to provider)
- [ ] Create user dashboard with booking history and profile management
- [ ] Build admin dashboard with analytics overview
- [ ] Implement API provider management (CRUD for third-party credentials)
- [ ] Create tour management interface for admins (CRUD operations)
- [ ] Build API abstraction layer and integrate first third-party tour provider