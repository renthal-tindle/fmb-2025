# Motorcycle Parts Catalog System

## Overview
This full-stack web application manages motorcycle parts compatibility and inventory. It provides an administrative interface for managing motorcycle data and part mappings, and a customer-facing catalog for browsing compatible parts. The system aims to streamline parts management, enhance customer experience through accurate compatibility information, and support efficient inventory handling for a wide range of motorcycle models.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, built with Vite.
- **UI Library**: shadcn/ui components built on Radix UI.
- **Styling**: Tailwind CSS for theming and responsive design.
- **State Management**: TanStack Query for server state management.
- **Routing**: Wouter for client-side routing.
- **Forms**: React Hook Form with Zod validation.

### Backend Architecture
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ES modules.
- **Database ORM**: Drizzle ORM for type-safe database operations.
- **Validation**: Zod schemas shared between frontend and backend.
- **Storage Interface**: Abstracted storage layer.

### Data Storage
- **Database**: PostgreSQL with Neon serverless database.
- **Schema Management**: Drizzle Kit for migrations.
- **Tables**: Motorcycles, Shopify products, Part mappings, Import history, Motorcycle category configuration.

### Key Features
- **Dual Interface**: Admin dashboard and customer catalog views.
- **Search & Filtering**: Advanced search with multiple filter options.
- **Bulk Operations**: CSV import for motorcycles and part mappings.
- **Compatibility Management**: Link parts to motorcycle models.
- **Dynamic Category Management**: Admin panel for motorcycle categories and subcategories.
- **Responsive Design**: Mobile-first approach.
- **OE Match Highlighting**: Visual identification of Original Equipment parts.
- **OE Parts Table**: Professional table displaying all OE parts with Category, Part Number, Description, Available Options count, and Add to Cart action. Responsive design transforms to stacked cards on mobile.
- **Alternative Variants Display**: Show all gearing options for multi-variant products.
- **Dynamic Section Management**: Create and reorder part sections and categories via drag-and-drop.
- **SKU-based Part Mapping**: References SKU for consistent product identification.

### System Design Choices
- **UI/UX**: Utilizes Radix UI and Tailwind CSS for a consistent, accessible, and responsive design, with specific styling for OE matches and variant displays.
- **Technical Implementations**: Employs TypeScript throughout for type safety, Drizzle ORM for database interactions, and Zod for validation across layers.
- **Feature Specifications**: Supports complex product matching logic including prefix matching for SKUs, dynamic UI updates for reordering, and robust CSV import capabilities with optional RECID assignment and concurrency control.
- **Category Label Management**: Section headers dynamically fetch and display category labels from parts mapping configuration (via `/api/part-category-tags`), ensuring headers reflect admin-configured names (e.g., "Handlebars", "Front Sprocket") rather than product-specific labels (e.g., "OE Handlebar"). Falls back to product labels if mapping is unavailable.

## External Dependencies

### Database Services
- **Neon Database**: PostgreSQL-compatible serverless database.
- **connect-pg-simple**: PostgreSQL session store.

### Frontend Libraries
- **Radix UI**: UI primitives.
- **TanStack Query**: Data fetching and state management.
- **React Hook Form**: Form management.
- **date-fns**: Date utilities.
- **Tailwind CSS**: Utility-first CSS framework.
- **Wouter**: Client-side router.
- **@dnd-kit**: Drag-and-drop library.

### Backend Services
- **Drizzle ORM**: TypeScript ORM.
- **Express.js**: Web framework.
- **Zod**: Schema validation.

### Development Tools
- **Vite**: Build tool.
- **TypeScript**: Static type checking.
- **PostCSS**: CSS processing.

### UI Components
- **Material Icons**: Icon system.
- **Embla Carousel**: Carousel component.
- **Lucide Icons**: Additional icons.
- **class-variance-authority**: CSS class variant utility.