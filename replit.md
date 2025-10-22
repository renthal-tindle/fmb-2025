# Motorcycle Parts Catalog System

## Overview

This is a full-stack web application that manages motorcycle parts compatibility and inventory. The system serves dual purposes: providing an administrative interface for managing motorcycle data and part mappings, and offering a customer-facing catalog for browsing compatible parts. The application uses a modern React frontend with shadcn/ui components and an Express.js backend with PostgreSQL database storage.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, built using Vite for fast development and optimized production builds
- **UI Library**: shadcn/ui components built on Radix UI primitives for consistent, accessible design
- **Styling**: Tailwind CSS with CSS variables for theming and responsive design
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation for type-safe form handling

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Validation**: Zod schemas shared between frontend and backend
- **Development**: Hot reload with Vite middleware integration
- **Storage Interface**: Abstracted storage layer with in-memory implementation for development

### Data Storage
- **Database**: PostgreSQL with Neon serverless database
- **Schema Management**: Drizzle Kit for migrations and schema changes
- **Connection**: Connection pooling via @neondatabase/serverless driver
- **Tables**: 
  - Motorcycles (make, model, year, engine, category)
  - Shopify products (title, price, SKU, images)
  - Part mappings (linking products to compatible motorcycles)
  - Import history (tracking bulk data operations)
  - Motorcycle category configuration (dynamic category/subcategory definitions)

### Key Features
- **Dual Interface**: Toggle between admin dashboard and customer catalog views
- **Search & Filtering**: Advanced search across motorcycles and parts with multiple filter options
- **Bulk Operations**: CSV import functionality for motorcycles and part mappings
- **Compatibility Management**: Create and manage relationships between parts and motorcycle models
- **Dynamic Category Management**: Admin panel for managing motorcycle categories and subcategories with real-time updates
- **Responsive Design**: Mobile-first approach with adaptive layouts

### Recent Changes

**October 22, 2025**
- **Admin Dashboard Enhancement - RECID Sorting**: 
  - Added ability to sort motorcycles table by RECID column
  - Clickable RECID header toggles between ascending and descending order
  - Visual arrow indicators show current sort direction
  - Default sort order is ascending (lowest to highest RECID)
- **Theme Extension Bug Fix - Direct Replacement Links**: 
  - Fixed JavaScript error "Can't find variable: id" in native-parts-finder.liquid
  - Changed undefined `${id}` to `${categoryId}` in Direct Replacement table "View more" links
  - Bug only manifested when OE parts had multiple variants in their category
  - Links now correctly navigate to category sections (e.g., #handlebars, #front-sprocket)
- **Database Schema Update - biketype Now Optional**:
  - Made biketype column nullable since system now uses bikeCategory and bikeSubcategory
  - Resolves CSV import constraint violations when biketype field is omitted
  - Legacy biketype field maintained for backward compatibility with existing data
- **CSV Import Enhancement - Optional RECID Field**: 
  - RECID field is now optional in motorcycle and combined CSV imports
  - System auto-assigns sequential RECID values starting from max existing RECID + 1
  - PostgreSQL advisory locks (lock ID: 1234567890) prevent race conditions during concurrent imports
  - Both import paths serialize RECID allocation with proper lock acquisition/release
  - Returns HTTP 503 when import lock cannot be acquired, preventing conflicts
  - Ensures data integrity and unique RECID assignment even under concurrent load

**October 21, 2025**
- **Motorcycle Category Management System**: Added dynamic category configuration in Settings panel
  - Admins can now add, edit, and delete motorcycle categories and subcategories
  - Categories are stored in the database instead of being hardcoded
  - Motorcycle form dynamically loads categories from the database
  - Supports hierarchical categories with independent subcategory filtering
  - Default categories seeded: Off-Road (MX/Enduro, Trials, Dual Sport), Street (Sportbike, Adventure, Cruiser/V-Twin, Touring, Standard/Naked, Dual Sport), ATV

### Authentication & Authorization
- Currently uses session-based approach with connect-pg-simple for PostgreSQL session storage
- No authentication implementation visible in current codebase (likely planned for future development)

## External Dependencies

### Database Services
- **Neon Database**: PostgreSQL-compatible serverless database platform
- **connect-pg-simple**: PostgreSQL session store for Express sessions

### Frontend Libraries
- **Radix UI**: Comprehensive set of low-level UI primitives
- **TanStack Query**: Server state management and data fetching
- **React Hook Form**: Form state management and validation
- **date-fns**: Date manipulation and formatting
- **Tailwind CSS**: Utility-first CSS framework

### Backend Services
- **Drizzle ORM**: TypeScript ORM for PostgreSQL
- **Express.js**: Web framework for Node.js
- **Zod**: Runtime type validation and schema definition

### Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Static type checking
- **PostCSS**: CSS processing with Tailwind integration
- **Replit Integration**: Development environment optimizations for Replit platform

### UI Components
- **Material Icons**: Google's Material Design icon system
- **Embla Carousel**: Touch-friendly carousel component
- **Lucide Icons**: Additional icon set for UI elements
- **class-variance-authority**: Utility for managing CSS class variants