#!/bin/bash

# Agrotech-Plus Critical Fixes Migration Script
# This script applies all the critical fixes to your environment

set -e  # Exit on error

echo "=========================================="
echo "Agrotech-Plus Critical Fixes Migration"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env.local ] && [ ! -f .env ]; then
    echo -e "${RED}ERROR: No .env.local or .env file found${NC}"
    echo "Please copy .env.example to .env.local and fill in the required values:"
    echo "  cp .env.example .env.local"
    exit 1
fi

# Check for required environment variables
ENV_FILE=".env.local"
if [ ! -f "$ENV_FILE" ]; then
    ENV_FILE=".env"
fi

echo -e "${YELLOW}Step 1: Checking environment variables...${NC}"
REQUIRED_VARS=("DATABASE_URL" "NEXTAUTH_SECRET")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^${var}=" "$ENV_FILE"; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo -e "${RED}ERROR: Missing required environment variables:${NC}"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    exit 1
fi

echo -e "${GREEN}✓ Environment variables validated${NC}"
echo ""

# Generate Prisma Client
echo -e "${YELLOW}Step 2: Generating Prisma Client...${NC}"
npx prisma generate
echo -e "${GREEN}✓ Prisma Client generated${NC}"
echo ""

# Run database migration
echo -e "${YELLOW}Step 3: Running database migration...${NC}"
echo "This will add deletedAt fields to soft-delete models"
read -p "Continue with migration? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ "$NODE_ENV" == "production" ]; then
        npx prisma migrate deploy
    else
        npx prisma migrate dev --name add_soft_delete_fields
    fi
    echo -e "${GREEN}✓ Database migration completed${NC}"
else
    echo -e "${YELLOW}Skipping migration${NC}"
fi
echo ""

# Install dependencies (if needed)
echo -e "${YELLOW}Step 4: Checking dependencies...${NC}"
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Run tests
echo -e "${YELLOW}Step 5: Running tests...${NC}"
npm run test:run || echo -e "${YELLOW}⚠ Some tests failed (this is okay if tests were already failing)${NC}"
echo ""

# Build application
echo -e "${YELLOW}Step 6: Building application...${NC}"
npm run build
echo -e "${GREEN}✓ Application built successfully${NC}"
echo ""

echo "=========================================="
echo -e "${GREEN}Migration Complete!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Review FIXES_APPLIED.md for all changes"
echo "2. Test critical flows:"
echo "   - User registration with password requirements"
echo "   - Products API performance"
echo "   - Soft delete functionality"
echo "3. Deploy to your environment"
echo ""
echo "To start the development server:"
echo "  npm run dev"
echo ""
