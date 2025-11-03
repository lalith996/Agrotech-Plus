#!/bin/bash
# cleanup.sh - Automated cleanup script for Agrotech-Plus
# Run: chmod +x cleanup.sh && ./cleanup.sh

echo "🧹 Starting Agrotech-Plus project cleanup..."
echo ""

# Counter for tracking
REMOVED=0

# Remove redundant documentation files
echo "📄 Removing redundant documentation files..."
FILES_TO_REMOVE=(
  "FINAL_IMPLEMENTATION_REPORT.md"
  "IMPLEMENTATION_SUMMARY.md"
  "PROGRESS_UPDATE.md"
  "QUICK_REFERENCE.md"
  "SCHEMA_OPTIMIZATION_SUMMARY.md"
  "TASK_COMPLETION_SUMMARY.md"
  "TEST_RESULTS.md"
)

for file in "${FILES_TO_REMOVE[@]}"; do
  if [ -f "$file" ]; then
    rm -f "$file"
    echo "  ✓ Removed: $file"
    ((REMOVED++))
  fi
done

# Remove unknown/obsolete files
echo ""
echo "🗑️  Removing obsolete files..."
OBSOLETE_FILES=(
  "aegrfvz"
  "esdh"
  "replit.md"
)

for file in "${OBSOLETE_FILES[@]}"; do
  if [ -f "$file" ]; then
    rm -f "$file"
    echo "  ✓ Removed: $file"
    ((REMOVED++))
  fi
done

# Remove backup and cache directories
echo ""
echo "📁 Removing backup and cache directories..."
DIRS_TO_REMOVE=(
  "pages/dashboard_backup"
  ".kiro"
  ".idx"
  ".local"
  ".cursor"
)

for dir in "${DIRS_TO_REMOVE[@]}"; do
  if [ -d "$dir" ]; then
    rm -rf "$dir"
    echo "  ✓ Removed directory: $dir"
    ((REMOVED++))
  fi
done

# Remove test files
echo ""
echo "🧪 Removing test files..."
TEST_FILES=(
  "pages/upload-test.tsx"
)

for file in "${TEST_FILES[@]}"; do
  if [ -f "$file" ]; then
    rm -f "$file"
    echo "  ✓ Removed: $file"
    ((REMOVED++))
  fi
done

# Optional: Remove Firebase Data Connect (uncomment if not using)
# echo ""
# echo "🔥 Removing Firebase Data Connect files..."
# if [ -d "dataconnect" ]; then
#   rm -rf dataconnect
#   echo "  ✓ Removed directory: dataconnect"
#   ((REMOVED++))
# fi
# if [ -d "src/dataconnect-generated" ]; then
#   rm -rf src/dataconnect-generated
#   echo "  ✓ Removed directory: src/dataconnect-generated"
#   ((REMOVED++))
# fi

# Optional: Remove Docker files (uncomment if not using Docker)
# echo ""
# echo "🐳 Removing Docker files..."
# if [ -f "Dockerfile" ]; then
#   rm -f Dockerfile
#   echo "  ✓ Removed: Dockerfile"
#   ((REMOVED++))
# fi
# if [ -f "docker-compose.prod.yml" ]; then
#   rm -f docker-compose.prod.yml
#   echo "  ✓ Removed: docker-compose.prod.yml"
#   ((REMOVED++))
# fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Cleanup complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Summary:"
echo "  • Removed $REMOVED files/directories"
echo "  • Kept all essential code and configs"
echo "  • Project structure is now cleaner"
echo ""
echo "📝 Next Steps:"
echo "  1. Review PROJECT_REQUIREMENTS.md"
echo "  2. Start building missing pages (Phase 1)"
echo "  3. Run: npm install (if needed)"
echo "  4. Run: npx prisma generate"
echo "  5. Run: npm run dev"
echo ""
echo "🚀 Ready for development!"
