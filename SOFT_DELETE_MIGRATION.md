# Soft Delete Pattern Migration Guide

This guide explains how to add soft delete support to your Prisma models.

## What is Soft Delete?

Soft delete marks records as deleted without physically removing them from the database. This provides:

- **Data retention** for compliance and auditing
- **Recovery** of accidentally deleted data
- **Historical tracking** of deleted records
- **Referential integrity** preservation
- **Audit trails** for legal requirements

## Models Supporting Soft Delete

The following models have soft delete support:

- User
- Customer
- Farmer
- Product
- Order
- OrderItem
- Address
- ProductReview
- Subscription

## Step 1: Update Schema

Add `deletedAt` field to models in `prisma/schema.prisma`:

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  password  String?
  role      UserRole
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime? // Add this field

  // ... other fields
}

model Product {
  id          String    @id @default(cuid())
  name        String
  description String?
  price       Decimal   @db.Decimal(10, 2)
  farmerId    String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime? // Add this field

  // ... other fields
}

model Order {
  id         String      @id @default(cuid())
  customerId String
  status     OrderStatus
  totalAmount Decimal    @db.Decimal(10, 2)
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt
  deletedAt  DateTime?  // Add this field

  // ... other fields
}

// Repeat for other models
```

## Step 2: Create Migration

```bash
# Generate migration
npx prisma migrate dev --name add_soft_delete

# Or for production
npx prisma migrate deploy
```

## Step 3: Initialize Middleware

In your app initialization (e.g., `pages/_app.tsx` or API setup):

```typescript
import { setupSoftDeleteMiddleware } from '@/lib/soft-delete'

// Initialize on app start
setupSoftDeleteMiddleware()
```

## Step 4: Usage

### Normal Delete (Automatic Soft Delete)

```typescript
// This will set deletedAt instead of deleting
await prisma.user.delete({
  where: { id: userId }
})

// DeleteMany also becomes soft delete
await prisma.product.deleteMany({
  where: { farmerId: farmerId }
})
```

### Query Operations (Auto-Filtered)

```typescript
// Automatically excludes soft-deleted records
const users = await prisma.user.findMany()

// Also filtered
const user = await prisma.user.findUnique({
  where: { id: userId }
})

// Count excludes deleted
const count = await prisma.user.count()
```

### Include Deleted Records

```typescript
import { withDeleted, onlyDeleted } from '@/lib/soft-delete'

// Include both active and deleted
const allUsers = await prisma.user.findMany({
  where: withDeleted()
})

// Only deleted records
const deletedUsers = await prisma.user.findMany({
  where: onlyDeleted()
})
```

### Restore Deleted Records

```typescript
import { restore } from '@/lib/soft-delete'

// Restore a user
await restore('User', { id: userId })

// Restore with query
await restore('Product', { farmerId: farmerId })
```

### Hard Delete (Permanent)

```typescript
import { hardDelete } from '@/lib/soft-delete'

// Permanently delete (use with caution!)
await hardDelete(
  'User',
  { id: userId },
  {
    reason: 'GDPR right to be forgotten request',
    userId: adminId
  }
)
```

### Find Deleted Records

```typescript
import { findDeleted, countDeleted } from '@/lib/soft-delete'

// Get deleted records
const deletedProducts = await findDeleted('Product', {
  where: { farmerId: farmerId },
  take: 10,
  orderBy: { deletedAt: 'desc' }
})

// Count deleted
const deletedCount = await countDeleted('Product')
```

### Check if Deleted

```typescript
import { isDeleted, getDeletionInfo } from '@/lib/soft-delete'

const user = await prisma.user.findUnique({
  where: { id: userId }
})

// Simple check
if (isDeleted(user)) {
  console.log('User is deleted')
}

// Detailed info
const info = getDeletionInfo(user)
console.log(info)
// {
//   isDeleted: true,
//   deletedAt: Date,
//   daysSinceDeleted: 5
// }
```

## API Endpoints

### Trash Endpoint

```typescript
// pages/api/admin/trash.ts
import { NextApiRequest, NextApiResponse } from 'next'
import { findDeleted, countDeleted } from '@/lib/soft-delete'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const { model, page = 1, limit = 20 } = req.query

    const items = await findDeleted(
      model as any,
      {
        take: Number(limit),
        skip: (Number(page) - 1) * Number(limit)
      }
    )

    const total = await countDeleted(model as any)

    return res.json({
      items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    })
  }
}
```

### Restore Endpoint

```typescript
// pages/api/admin/restore.ts
import { NextApiRequest, NextApiResponse } from 'next'
import { restore } from '@/lib/soft-delete'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    const { model, id } = req.body

    const success = await restore(model, { id })

    if (success) {
      return res.json({ message: 'Restored successfully' })
    } else {
      return res.status(400).json({ message: 'Restore failed' })
    }
  }
}
```

## Cleanup Jobs

### Purge Old Deleted Records

Create a cron job or scheduled task:

```typescript
// lib/jobs/purge-deleted.ts
import { purgeOldDeleted } from '@/lib/soft-delete'

export async function purgeDeletedRecordsJob() {
  const models = ['User', 'Product', 'Order'] as const

  for (const model of models) {
    // Delete records older than 90 days
    const count = await purgeOldDeleted(model, 90)
    console.log(`Purged ${count} ${model} records`)
  }
}

// Run daily
// purgeDeletedRecordsJob()
```

## Migration Checklist

When adding soft delete to a model:

- [ ] Add `deletedAt DateTime?` field to schema
- [ ] Add model to `SOFT_DELETE_MODELS` in `lib/soft-delete.ts`
- [ ] Run Prisma migration
- [ ] Test delete operations
- [ ] Test query operations (ensure deleted excluded)
- [ ] Test restore functionality
- [ ] Add trash UI (if needed)
- [ ] Document any special handling
- [ ] Update API tests

## Best Practices

### 1. Cascading Deletes

When deleting a parent record, consider soft-deleting children:

```typescript
// Delete user and all related data
await prisma.$transaction(async (tx) => {
  // Soft delete orders
  await tx.order.updateMany({
    where: { customerId: userId },
    data: { deletedAt: new Date() }
  })

  // Soft delete addresses
  await tx.address.updateMany({
    where: { userId: userId },
    data: { deletedAt: new Date() }
  })

  // Finally delete user
  await tx.user.delete({
    where: { id: userId }
  })
})
```

### 2. Indexes

Add index on `deletedAt` for better query performance:

```prisma
model User {
  id        String    @id @default(cuid())
  // ... fields
  deletedAt DateTime?

  @@index([deletedAt])
  @@index([email, deletedAt]) // Composite index for filtered queries
}
```

### 3. Compliance

For GDPR/data privacy:

```typescript
// Right to be forgotten
async function forgetUser(userId: string) {
  // Anonymize data first
  await prisma.user.update({
    where: { id: userId },
    data: {
      email: `deleted-${userId}@example.com`,
      name: 'Deleted User',
      phone: null,
      // ... anonymize other PII
      deletedAt: new Date()
    }
  })

  // Schedule hard delete after retention period
  // await scheduleHardDelete('User', userId, 90) // 90 days
}
```

### 4. Audit Logging

Log all soft deletes and restores:

```typescript
import { logInfo } from '@/lib/logger'

async function deleteWithAudit(model: string, id: string, userId: string) {
  await (prisma as any)[model.toLowerCase()].delete({
    where: { id }
  })

  logInfo('Record soft deleted', {
    model,
    recordId: id,
    deletedBy: userId,
    timestamp: new Date().toISOString()
  })
}
```

### 5. UI Indicators

Show deleted status in admin UI:

```typescript
function RecordRow({ record }: { record: any }) {
  const deletionInfo = getDeletionInfo(record)

  return (
    <tr>
      <td>{record.name}</td>
      {deletionInfo.isDeleted && (
        <td className="text-red-600">
          Deleted {deletionInfo.daysSinceDeleted} days ago
          <button onClick={() => restore(record)}>Restore</button>
        </td>
      )}
    </tr>
  )
}
```

## Troubleshooting

### Issue: Records still showing after delete

**Solution:** Ensure middleware is initialized:
```typescript
setupSoftDeleteMiddleware()
```

### Issue: Can't query deleted records

**Solution:** Use `withDeleted()` or `onlyDeleted()`:
```typescript
const all = await prisma.user.findMany({
  where: withDeleted()
})
```

### Issue: Unique constraint violations

**Solution:** Add deletedAt to unique constraints:
```prisma
model User {
  email     String
  deletedAt DateTime?

  @@unique([email, deletedAt])
}
```

This allows same email if one is deleted.

## Testing

```typescript
describe('Soft Delete', () => {
  it('should soft delete record', async () => {
    const user = await prisma.user.create({
      data: { email: 'test@example.com' }
    })

    await prisma.user.delete({ where: { id: user.id } })

    const deleted = await prisma.user.findUnique({
      where: { id: user.id }
    })

    expect(deleted).toBeNull() // Not found in normal query

    const withDeleted = await prisma.user.findFirst({
      where: { id: user.id, deletedAt: { not: null } }
    })

    expect(withDeleted).not.toBeNull()
    expect(withDeleted.deletedAt).toBeInstanceOf(Date)
  })

  it('should restore deleted record', async () => {
    // ... test restore functionality
  })
})
```

## Summary

Soft delete pattern provides data safety and compliance benefits. Follow this guide to implement it consistently across your models.

For questions: See `lib/soft-delete.ts` for implementation details.
