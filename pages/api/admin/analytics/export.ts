import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { UserRole } from '@prisma/client'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session?.user) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    if (session.user.role !== UserRole.ADMIN && session.user.role !== UserRole.OPERATIONS) {
      return res.status(403).json({ message: 'Insufficient permissions' })
    }

    const { type = 'all', days = '30' } = req.query
    const daysNumber = parseInt(days as string)
    
    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysNumber)

    let csvData = ''
    let filename = `analytics-export-${new Date().toISOString().split('T')[0]}.csv`

    switch (type) {
      case 'customers':
        csvData = generateCustomerCSV()
        filename = `customer-analytics-${new Date().toISOString().split('T')[0]}.csv`
        break
      case 'farmers':
        csvData = generateFarmerCSV()
        filename = `farmer-analytics-${new Date().toISOString().split('T')[0]}.csv`
        break
      case 'operations':
        csvData = generateOperationsCSV()
        filename = `operations-analytics-${new Date().toISOString().split('T')[0]}.csv`
        break
      case 'financial':
        csvData = generateFinancialCSV()
        filename = `financial-analytics-${new Date().toISOString().split('T')[0]}.csv`
        break
      default:
        csvData = generateAllDataCSV()
        filename = `complete-analytics-${new Date().toISOString().split('T')[0]}.csv`
    }

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    
    return res.status(200).send(csvData)

  } catch (error) {
    // console.error('Error exporting analytics:', error)
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
}

function generateCustomerCSV(): string {
  const headers = [
    'Metric',
    'Value',
    'Period',
    'Change',
    'Trend'
  ]

  const data = [
    ['Total Customers', '1,247', 'Last 30 days', '+8.2%', 'Positive'],
    ['Active Subscriptions', '892', 'Current', '+12.5%', 'Positive'],
    ['Churn Rate', '3.2%', 'Last 30 days', '-0.5%', 'Positive'],
    ['Average Order Value', '$67.50', 'Last 30 days', '+5.3%', 'Positive'],
    ['Customer Lifetime Value', '$1,250.00', 'Current', '+15.2%', 'Positive'],
    ['New Customers This Month', '89', 'Current month', '+18.7%', 'Positive'],
    ['Subscription Growth Rate', '12.5%', 'Monthly', '+2.1%', 'Positive']
  ]

  return [headers.join(','), ...data.map(row => row.join(','))].join('\n')
}

function generateFarmerCSV(): string {
  const headers = [
    'Farmer Name',
    'Quality Score',
    'Delivery Rate',
    'Volume Supplied',
    'Revenue Generated',
    'Status'
  ]

  const data = [
    ['Green Valley Farm', '9.2', '98%', '450 lbs', '$6,750', 'Active'],
    ['Sunny Acres', '8.8', '95%', '380 lbs', '$5,700', 'Active'],
    ['Organic Hills', '9.0', '92%', '420 lbs', '$6,300', 'Active'],
    ['Fresh Fields', '8.5', '89%', '350 lbs', '$5,250', 'Active'],
    ['Pure Harvest', '9.1', '96%', '400 lbs', '$6,000', 'Active'],
    ['Nature\'s Best', '8.7', '93%', '370 lbs', '$5,550', 'Active']
  ]

  return [headers.join(','), ...data.map(row => row.join(','))].join('\n')
}

function generateOperationsCSV(): string {
  const headers = [
    'Metric',
    'Value',
    'Target',
    'Performance',
    'Trend'
  ]

  const data = [
    ['Total Orders', '3,456', '3,200', '108%', 'Above Target'],
    ['Completed Deliveries', '3,201', '3,000', '107%', 'Above Target'],
    ['Average Delivery Time', '2.3 hours', '2.5 hours', '108%', 'Above Target'],
    ['Inventory Turnover', '12.5x', '10x', '125%', 'Above Target'],
    ['Procurement Efficiency', '89.7%', '85%', '105%', 'Above Target'],
    ['Route Optimization Savings', '$15,420', '$12,000', '129%', 'Above Target'],
    ['QC Pass Rate', '96.8%', '95%', '102%', 'Above Target']
  ]

  return [headers.join(','), ...data.map(row => row.join(','))].join('\n')
}

function generateFinancialCSV(): string {
  const headers = [
    'Metric',
    'Current Period',
    'Previous Period',
    'Change',
    'Percentage Change'
  ]

  const data = [
    ['Total Revenue', '$234,567.89', '$208,432.15', '$26,135.74', '+12.5%'],
    ['Monthly Recurring Revenue', '$78,456.23', '$69,821.45', '$8,634.78', '+12.4%'],
    ['Gross Margin', '42.5%', '40.2%', '+2.3%', '+5.7%'],
    ['Customer Acquisition Cost', '$45.67', '$52.34', '-$6.67', '-12.7%'],
    ['Revenue Growth Rate', '18.3%', '15.7%', '+2.6%', '+16.6%'],
    ['Profit Margin', '15.2%', '13.8%', '+1.4%', '+10.1%'],
    ['Average Revenue Per User', '$188.45', '$172.33', '$16.12', '+9.4%']
  ]

  return [headers.join(','), ...data.map(row => row.join(','))].join('\n')
}

function generateAllDataCSV(): string {
  const headers = [
    'Category',
    'Metric',
    'Value',
    'Period',
    'Change',
    'Status'
  ]

  const data = [
    // Customer Metrics
    ['Customer', 'Total Customers', '1,247', 'Current', '+8.2%', 'Good'],
    ['Customer', 'Active Subscriptions', '892', 'Current', '+12.5%', 'Excellent'],
    ['Customer', 'Churn Rate', '3.2%', 'Monthly', '-0.5%', 'Good'],
    ['Customer', 'Average Order Value', '$67.50', 'Monthly', '+5.3%', 'Good'],
    
    // Farmer Metrics
    ['Farmer', 'Total Farmers', '156', 'Current', '+5.7%', 'Good'],
    ['Farmer', 'Active Farmers', '134', 'Current', '+4.2%', 'Good'],
    ['Farmer', 'Average Quality Score', '8.7/10', 'Monthly', '+0.3', 'Excellent'],
    ['Farmer', 'On-Time Delivery Rate', '94.2%', 'Monthly', '+1.8%', 'Excellent'],
    
    // Operations Metrics
    ['Operations', 'Total Orders', '3,456', 'Monthly', '+15.3%', 'Excellent'],
    ['Operations', 'Completed Deliveries', '3,201', 'Monthly', '+14.7%', 'Excellent'],
    ['Operations', 'QC Pass Rate', '96.8%', 'Monthly', '+0.5%', 'Excellent'],
    ['Operations', 'Route Optimization Savings', '$15,420', 'Monthly', '+23.4%', 'Excellent'],
    
    // Financial Metrics
    ['Financial', 'Total Revenue', '$234,567.89', 'Monthly', '+12.5%', 'Excellent'],
    ['Financial', 'Monthly Recurring Revenue', '$78,456.23', 'Current', '+12.4%', 'Excellent'],
    ['Financial', 'Gross Margin', '42.5%', 'Monthly', '+2.3%', 'Good'],
    ['Financial', 'Revenue Growth Rate', '18.3%', 'Monthly', '+2.6%', 'Excellent']
  ]

  return [headers.join(','), ...data.map(row => row.join(','))].join('\n')
}