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

**October 23, 2025**
- **Alternative Variants in Large Product Cards**:
  - Extended alternative variants display to the main results section (large product cards)
  - Products with multiple variants (like sprockets) now show each tooth count option as a separate large card
  - OE variant highlighted with green 3px border and "OE Match" badge in top-right corner
  - Dynamic card titles: 
    - FCWGROUP/RCWGROUP products (sprockets): OE variants show original label (e.g., "OE Front Sprocket"), alternatives show "Alternative" prefix (e.g., "Alternative Front Sprocket")
    - Other products (handlebars, etc.): Each uses its own category label from parts mapping (e.g., "Fatbar", "Twinwall", "OE Handlebar")
  - Each variant card displays: product title, SKU, option name (e.g., "12T"), price, and Add to Cart button
  - Add to Cart buttons use the correct variant ID for each specific option
  - Maintains consistent layout with existing large cards - only adds green OE styling when applicable
  - Example: Yamaha MT-03 (RECID 9215) with fcwgroup="292U-520" and oe_fcw="292U-520-14GP" shows 3 separate front sprocket cards (12T, 13T, 14T) with 14T highlighted as OE and labeled "OE Front Sprocket", others labeled "Alternative Front Sprocket"
- **FCW/RCW Group Prefix Matching - Fully Implemented**:
  - Product matching logic now supports both exact matches and prefix matches
  - CSV imports can use partial SKUs (e.g., "292U-520") instead of full product titles (e.g., "292U-520 Ultralight Rear Sprocket (KTM/Husq/Gas Gas)")
  - System checks if product title starts with the fcwgroup/rcwgroup value when exact match fails
  - Maintains full backward compatibility with existing full-title data in database
  - Simplifies CSV import process - users only need to provide the base SKU prefix
  - Verified working: RECID 9215 (Yamaha MT-03) with fcwgroup="292U-520" correctly matches and displays 3 alternative variants (12T OE, 13T, 14T)
  - Example: Importing fcwgroup="292U-520" will match "292U-520 Ultralight Rear Sprocket..." product

**October 22, 2025**
- **Alternative Variants Card Display Feature**:
  - Implemented card-based display for all gearing options within FCW/RCW Group products (sprockets)
  - Backend identifies products matching motorcycle's fcwgroup/rcwgroup fields and includes all variants as alternativeVariants array
  - Each variant includes id, sku, price, title, and isOE flag to mark the exact OE match
  - Backend automatically sorts variants so OE match always appears first in the list
  - Theme extension displays variant options as responsive cards instead of single table row
  - OE variant highlighted with green border, "OE Match" badge, and distinct background
  - Visual separator with "Alternative Options" label appears between OE card and alternative variants
  - Each variant card includes independent "Add to Cart" button with correct variant ID
  - Responsive grid layout: 4 columns desktop → 3 columns tablet → 2 columns mobile
  - Example: RECID 9211 (KTM 150 SX 2023) now shows Front Sprocket with 3 variants (12T, 13T OE, 14T+) and Rear Sprocket with 23 variants (48T-70T with 50T as OE)
  - Products without alternative variants (handlebars, accessories, etc.) continue displaying as single cards unchanged
- **Variant Matching Fix - Correct SKU Display**:
  - Fixed critical bug where multi-variant products always displayed first variant (variants[0]) instead of matched variant
  - Backend now correctly returns the matched variant's SKU and price based on motorcycle's OE fields
  - Example: RECID 9211 (KTM 150 SX 2023) now correctly shows 13T front sprocket (292U-520-13GP) instead of 12T (292U-520-12GP)
  - Theme extension "Add to Cart" buttons now add the correct variant matching the motorcycle specifications
  - matchedVariantId field tracks which specific variant matches each motorcycle's part values
- **Parts Mapping SKU Reference Update**:
  - All part assignments now reference SKU instead of product description for FCW Group, RCW Group, and all other categories
  - Parts mapping interface displays SKU as primary identifier with product title as supplementary information
  - Database stores SKU values for consistent product identification across exports and displays
  - Backward compatible: System supports both legacy title-based and new SKU-based assignments
  - CSV exports now show SKU values instead of descriptions for accurate inventory management
- **Delete Operation Bug Fix**:
  - Fixed database delete operations for part categories and sections by adding `.returning()` clause
  - Delete operations now properly verify success and return correct status codes
  - Resolved 404 errors when attempting to delete categories or sections
- **Settings Page Reorganization**:
  - Reorganized Settings into two tabbed sections for better user experience
  - **Motorcycle Settings Tab**: Contains motorcycle category management (add/edit categories and subcategories)
  - **Parts Mapping Tab**: Contains parts category settings, section order management, and create new sections
  - Clean tabbed navigation with icons for easy identification
- **Dynamic Section Management System**:
  - "Create New Section" button and form in Settings panel for adding custom part sections
  - Section dropdown menus now dynamically populated from database instead of hardcoded values
  - New sections automatically appear in category assignment dropdowns and parts mapping interface
  - Form validation ensures unique section keys and labels
  - Green-themed create form appears immediately below button for better UX
  - Supports creating custom sections alongside default sections (Handlebars, Front Sprocket, etc.)
- **Part Section Drag-and-Drop Reordering**:
  - Added database-backed section management with sortOrder field in part_sections table
  - Main sections (Bar Mounts, Brake Pads, Chain, etc.) now support drag-and-drop reordering in Settings
  - Section ordering persists to database and displays correctly in parts-mapping component
  - Initialization endpoint creates default sections with sequential sortOrder values
  - Parts-mapping component fetches sections from database and sorts by sortOrder dynamically
  - Both sections and categories within sections support independent drag-and-drop ordering
- **Part Category Drag-and-Drop Reordering**:
  - Removed manual sortOrder input fields; users now reorder categories by dragging
  - Implemented @dnd-kit library for intuitive drag-and-drop functionality
  - Categories grouped by section (Handlebars, Front Sprocket, etc.) with independent reordering within each section
  - Drag-and-drop updates sortOrder values automatically via batch mutation with optimistic updates
  - Visual drag handle (grip-vertical icon) appears on hover for clear affordance
  - "Drag to reorder" hint displayed in section headers
  - New categories automatically assigned highest sortOrder + 1 within their section
  - Backend batch update endpoint supports multi-category sortOrder updates in single transaction
  - Database sorts by assignedSection first, then sortOrder within each section
  - Frontend properly sorts categories by sortOrder when displaying grouped sections
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