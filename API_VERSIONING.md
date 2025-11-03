# API Versioning Guide

AgroTrack+ uses semantic API versioning to maintain backward compatibility and allow gradual migrations when introducing breaking changes.

## Current Version

**Current Version:** v1
**Supported Versions:** v1

## Version Detection

The API version can be specified in multiple ways (checked in this order):

### 1. HTTP Header (Recommended)
```bash
curl -H "X-API-Version: v1" https://api.agrotrack.com/products
```

### 2. Accept-Version Header
```bash
curl -H "Accept-Version: v1" https://api.agrotrack.com/products
```

### 3. Query Parameter
```bash
curl https://api.agrotrack.com/products?version=v1
```

### 4. URL Path
```bash
curl https://api.agrotrack.com/v1/products
```

### 5. Default
If no version is specified, the current version (v1) is used.

## Creating Versioned Endpoints

### Method 1: Version-Specific Handlers

```typescript
// pages/api/products.ts
import { versionedHandler } from '@/lib/api-versioning'

export default versionedHandler({
  v1: async (req, res) => {
    // v1 implementation
    res.json({
      products: [...],
      count: 10
    })
  },

  v2: async (req, res) => {
    // v2 with breaking changes
    res.json({
      items: [...],  // renamed from 'products'
      total: 10,     // renamed from 'count'
      meta: {...}    // new field
    })
  }
})
```

### Method 2: Separate Files

```
pages/api/
├── v1/
│   ├── products.ts
│   ├── orders.ts
│   └── customers.ts
├── v2/
│   ├── products.ts
│   └── orders.ts
```

## Version Response Headers

All API responses include version headers:

```
X-API-Version: v1
X-API-Current-Version: v1
X-API-Supported-Versions: v1, v2
```

## Deprecation Warnings

When a version is deprecated, responses include deprecation headers:

```
X-API-Deprecated: true
X-API-Deprecated-Since: 2024-01-01T00:00:00Z
X-API-Sunset: 2024-12-31T00:00:00Z
X-API-Sunset-Days: 90
X-API-Deprecation-Message: Please migrate to v2
```

Example with deprecation:

```typescript
import { versionedHandler, deprecationWarning } from '@/lib/api-versioning'

const handler = versionedHandler({
  v1: async (req, res) => {
    // v1 implementation
  }
})

export default async (req, res) => {
  const deprecated = deprecationWarning(
    'v1',
    new Date('2024-01-01'),    // deprecated since
    new Date('2024-12-31'),    // sunset date
    'Please migrate to v2 API'
  )

  deprecated(req, res, () => handler(req, res))
}
```

## Data Migrations

When data structure changes between versions, use migrations:

```typescript
import { applyMigration, VersionMigration } from '@/lib/api-versioning'

const migrations: VersionMigration[] = [
  {
    from: 'v1',
    to: 'v2',
    transform: (data) => ({
      items: data.products,      // rename field
      total: data.count,         // rename field
      meta: {                    // add new field
        page: 1,
        perPage: 10
      }
    })
  }
]

// Apply migration
const v2Data = applyMigration(v1Data, 'v1', 'v2', migrations)
```

## Version Changelog

Check `/api/v1/version` for current version info and changelog:

```bash
curl https://api.agrotrack.com/v1/version
```

Response:
```json
{
  "version": "v1",
  "currentVersion": "v1",
  "supportedVersions": ["v1"],
  "changelog": {
    "version": "v1",
    "releaseDate": "2024-01-01T00:00:00Z",
    "changes": {
      "added": [
        "Initial API release",
        "Authentication endpoints",
        "Product management"
      ]
    }
  }
}
```

## Best Practices

### 1. Use Headers for Version
Prefer using `X-API-Version` header over URL path for cleaner URLs and easier routing.

### 2. Plan Breaking Changes
Only introduce breaking changes in major versions:
- **Breaking:** Field renamed, removed, or type changed
- **Non-breaking:** New optional field, new endpoint

### 3. Deprecation Period
- Announce deprecation at least 6 months before sunset
- Include migration guide
- Monitor usage of deprecated versions

### 4. Version Lifecycle

```
v1 Released → v2 Released → v1 Deprecated → v1 Sunset
   |             |              |              |
   |             | 6 months     | 6 months     |
   |             |              |              |
   Active    Both Active    v1 Deprecated   v1 Removed
```

### 5. Testing

Test all supported versions:

```typescript
describe('API Versioning', () => {
  it('should support v1', async () => {
    const res = await fetch('/api/products', {
      headers: { 'X-API-Version': 'v1' }
    })
    expect(res.status).toBe(200)
  })

  it('should reject unsupported versions', async () => {
    const res = await fetch('/api/products', {
      headers: { 'X-API-Version': 'v99' }
    })
    expect(res.status).toBe(400)
  })
})
```

## Migration Checklist

When introducing a new API version:

- [ ] Update `SUPPORTED_VERSIONS` in `lib/api-versioning.ts`
- [ ] Add changelog entry to `API_CHANGELOG`
- [ ] Create migration transforms if needed
- [ ] Update API documentation
- [ ] Test all endpoints with new version
- [ ] Set deprecation warnings for old version
- [ ] Communicate changes to API consumers
- [ ] Monitor usage of old vs new version
- [ ] Plan sunset date for deprecated version

## Common Patterns

### Pattern 1: Gradual Migration

```typescript
// Support both old and new field names during transition
export default versionedHandler({
  v1: async (req, res) => {
    const data = await fetchData()
    res.json({
      products: data,    // old name
      items: data        // also include new name for smooth transition
    })
  },
  v2: async (req, res) => {
    const data = await fetchData()
    res.json({
      items: data        // only new name
    })
  }
})
```

### Pattern 2: Feature Flags

```typescript
// Use config to control version-specific features
const features = {
  v1: { advancedFilters: false, bulkOperations: false },
  v2: { advancedFilters: true, bulkOperations: true }
}

export default versionedHandler({
  v1: handler(features.v1),
  v2: handler(features.v2)
})
```

### Pattern 3: Shared Logic

```typescript
// Share business logic, differ only in response format
async function getProducts(filters) {
  // shared business logic
  return await prisma.product.findMany({ where: filters })
}

export default versionedHandler({
  v1: async (req, res) => {
    const products = await getProducts(req.query)
    res.json({ products, count: products.length })
  },
  v2: async (req, res) => {
    const products = await getProducts(req.query)
    res.json({
      items: products,
      total: products.length,
      meta: { version: 'v2' }
    })
  }
})
```

## Error Responses

Version-related errors follow standard format:

```json
{
  "error": "Unsupported API Version",
  "message": "API version 'v99' is not supported",
  "supportedVersions": ["v1", "v2"],
  "currentVersion": "v2"
}
```

## Monitoring

Track version usage:

```typescript
// Automatic logging in versionedHandler
// Check logs for version distribution:
{
  "message": "API request",
  "version": "v1",
  "endpoint": "/api/products",
  "deprecated": false
}
```

## Support

For questions about API versioning:
- Documentation: https://docs.agrotrack.com/api/versioning
- Support: api-support@agrotrack.com
- GitHub Issues: https://github.com/agrotrack/api/issues
