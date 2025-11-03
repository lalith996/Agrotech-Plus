#!/bin/bash

# Agrotech-Plus Cleanup Script
# Removes unimportant and redundant files
# Run: chmod +x cleanup_unimportant.sh && ./cleanup_unimportant.sh

echo "🧹 Starting Agrotech-Plus Cleanup..."
echo ""

# Counter for deleted files
DELETED=0

# Function to safely delete files
safe_delete() {
    if [ -e "$1" ]; then
        echo "  ✓ Removing: $1"
        rm -rf "$1"
        DELETED=$((DELETED + 1))
    else
        echo "  ⊘ Not found: $1"
    fi
}

echo "📄 Removing redundant documentation files..."
safe_delete "aegrfvz"
safe_delete "esdh"
safe_delete ".replit"
safe_delete "replit.md"
safe_delete "PRODUCT_PAGES_COMPLETE.md"
safe_delete "QUICK_START_PRODUCTS.md"
safe_delete "FILES_CREATED.md"
safe_delete "PHASE2_CUSTOMER_PAGES.md"

echo ""
echo "📁 Removing duplicate/old page directories..."
safe_delete "pages/dashboard.tsx"
safe_delete "pages/dashboard_backup"
safe_delete "pages/index.agrotrack.tsx"

echo ""
echo "🗑️  Checking for empty test directories..."
if [ -d "test" ] && [ -z "$(ls -A test)" ]; then
    echo "  ✓ Removing empty test directory"
    rm -rf test
    DELETED=$((DELETED + 1))
else
    echo "  ⊘ Test directory not empty or doesn't exist (keeping)"
fi

echo ""
echo "📦 Checking for unused node_modules cache..."
if [ -d "node_modules/.cache" ]; then
    echo "  ✓ Clearing TypeScript cache"
    rm -rf node_modules/.cache
    DELETED=$((DELETED + 1))
fi

if [ -f "tsconfig.tsbuildinfo" ]; then
    echo "  ✓ Removing TypeScript build info"
    rm -f tsconfig.tsbuildinfo
    DELETED=$((DELETED + 1))
fi

echo ""
echo "✨ Cleanup complete!"
echo "   Files removed: $DELETED"
echo ""
echo "📋 Kept important files:"
echo "   ✓ README.md"
echo "   ✓ PROJECT_REQUIREMENTS.md"
echo "   ✓ CLEANUP_AND_IMPLEMENTATION_PLAN.md"
echo "   ✓ docs/DEPLOYMENT.md"
echo "   ✓ docs/USER_GUIDE.md"
echo ""
echo "🚀 Next Steps:"
echo "   1. Review CLEANUP_AND_IMPLEMENTATION_PLAN.md"
echo "   2. Start with Phase 3: Farmer pages/APIs"
echo "   3. Build shared components"
echo ""
