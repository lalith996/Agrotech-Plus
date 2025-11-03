#!/usr/bin/env ts-node

/**
 * Database Connection Test Script
 * Tests connection to Neon PostgreSQL database
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})

async function testConnection() {
  console.log('🔍 Testing Neon PostgreSQL connection...\n')

  try {
    // Test 1: Basic connection
    console.log('Test 1: Basic Connection')
    await prisma.$connect()
    console.log('✅ Successfully connected to database\n')

    // Test 2: Query execution
    console.log('Test 2: Query Execution')
    const result = await prisma.$queryRaw`SELECT version(), current_database(), current_user`
    console.log('✅ Query executed successfully')
    console.log('Database Info:', result)
    console.log('')

    // Test 3: Check database extensions
    console.log('Test 3: Database Extensions')
    const extensions = await prisma.$queryRaw`
      SELECT extname, extversion 
      FROM pg_extension 
      WHERE extname IN ('pg_trgm', 'btree_gin')
    `
    console.log('✅ Extensions check:')
    console.log(extensions)
    console.log('')

    // Test 4: Check tables exist
    console.log('Test 4: Schema Tables')
    const tables = await prisma.$queryRaw`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `
    console.log('✅ Tables in database:')
    console.log(tables)
    console.log('')

    console.log('🎉 All database tests passed!')

  } catch (error) {
    console.error('❌ Database test failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
