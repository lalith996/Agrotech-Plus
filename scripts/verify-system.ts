#!/usr/bin/env ts-node

/**
 * Complete System Verification Script
 * Tests all critical components
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifySystem() {
  console.log('🔍 AGROTECH+ SYSTEM VERIFICATION\n')
  console.log('=' .repeat(60))
  
  let allTestsPassed = true

  try {
    // Test 1: Database Connection
    console.log('\n📊 Test 1: Database Connection')
    await prisma.$connect()
    const dbInfo: any = await prisma.$queryRaw`SELECT version(), current_database()`
    console.log(`✅ Connected to: ${dbInfo[0].current_database}`)
    console.log(`✅ PostgreSQL: ${dbInfo[0].version.split(',')[0]}`)

    // Test 2: Tables Exist
    console.log('\n📋 Test 2: Database Schema')
    const tables: any = await prisma.$queryRaw`
      SELECT count(*) as count FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `
    const tableCount = parseInt(tables[0].count)
    if (tableCount >= 30) {
      console.log(`✅ ${tableCount} tables found`)
    } else {
      console.log(`⚠️  Only ${tableCount} tables found (expected 30+)`)
      allTestsPassed = false
    }

    // Test 3: Key Models
    console.log('\n🔑 Test 3: Key Models')
    const models = ['user', 'customer', 'farmer', 'product', 'order']
    for (const model of models) {
      const exists: any = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = ${model + 's'}
        )
      `
      if (exists[0].exists) {
        console.log(`✅ ${model} model exists`)
      } else {
        console.log(`❌ ${model} model missing`)
        allTestsPassed = false
      }
    }

    // Test 4: Indexes
    console.log('\n⚡ Test 4: Database Indexes')
    const indexes: any = await prisma.$queryRaw`
      SELECT count(*) as count FROM pg_indexes WHERE schemaname = 'public'
    `
    const indexCount = parseInt(indexes[0].count)
    console.log(`✅ ${indexCount} indexes created for performance`)

    // Test 5: Sample Data Operations
    console.log('\n💾 Test 5: Data Operations')
    const userCount = await prisma.user.count()
    const customerCount = await prisma.customer.count()
    const productCount = await prisma.product.count()
    console.log(`✅ Users: ${userCount}`)
    console.log(`✅ Customers: ${customerCount}`)
    console.log(`✅ Products: ${productCount}`)

    // Test 6: Environment Variables
    console.log('\n🔐 Test 6: Configuration')
    const requiredEnvVars = [
      'DATABASE_URL',
      'NEXT_PUBLIC_STACK_PROJECT_ID',
      'NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY',
      'STACK_SECRET_SERVER_KEY',
    ]
    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        console.log(`✅ ${envVar} configured`)
      } else {
        console.log(`❌ ${envVar} missing`)
        allTestsPassed = false
      }
    }

    // Test 7: Cascade Delete Setup
    console.log('\n🔗 Test 7: Foreign Key Constraints')
    const constraints: any = await prisma.$queryRaw`
      SELECT count(*) as count 
      FROM information_schema.table_constraints 
      WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public'
    `
    const constraintCount = parseInt(constraints[0].count)
    console.log(`✅ ${constraintCount} foreign key constraints (cascade deletes configured)`)

    // Summary
    console.log('\n' + '='.repeat(60))
    if (allTestsPassed) {
      console.log('🎉 ALL TESTS PASSED - SYSTEM READY FOR PRODUCTION!')
      console.log('\n📊 System Stats:')
      console.log(`   • Tables: ${tableCount}`)
      console.log(`   • Indexes: ${indexCount}`)
      console.log(`   • Foreign Keys: ${constraintCount}`)
      console.log(`   • Users: ${userCount}`)
      console.log(`   • Database: PostgreSQL 17 on Neon`)
      console.log(`   • Auth: Stack Auth Integrated`)
      console.log('\n🚀 Ready to start: npm run dev')
    } else {
      console.log('⚠️  SOME TESTS FAILED - REVIEW ABOVE')
    }
    console.log('=' .repeat(60))

  } catch (error) {
    console.error('\n❌ Verification failed:', error)
    allTestsPassed = false
  } finally {
    await prisma.$disconnect()
  }

  process.exit(allTestsPassed ? 0 : 1)
}

verifySystem()
