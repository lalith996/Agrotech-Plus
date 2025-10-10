import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.id) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  if (session.user.role !== UserRole.FARMER) {
    return res.status(403).json({ message: "Access denied" })
  }

  if (req.method === "GET") {
    try {
      const farmer = await prisma.farmer.findUnique({
        where: { userId: session.user.id },
      })

      if (!farmer) {
        return res.status(404).json({ message: "Farmer profile not found" })
      }

      // Get QC results for insights
      const qcResults = await prisma.qCResult.findMany({
        where: { farmerId: farmer.id },
        include: {
          product: { select: { name: true } }
        },
        orderBy: { timestamp: "desc" }
      })

      // Calculate overall QC score
      const overallQCScore = qcResults.length > 0 
        ? qcResults.reduce((sum, result) => {
            const total = result.acceptedQuantity + result.rejectedQuantity
            return sum + (total > 0 ? (result.acceptedQuantity / total) * 100 : 0)
          }, 0) / qcResults.length
        : 0

      // Mock performance data for the last 6 months
      const performanceData = [
        { month: "Jul", acceptanceRate: 85, revenue: 15000, deliveries: 12 },
        { month: "Aug", acceptanceRate: 88, revenue: 18000, deliveries: 15 },
        { month: "Sep", acceptanceRate: 92, revenue: 22000, deliveries: 18 },
        { month: "Oct", acceptanceRate: 89, revenue: 19500, deliveries: 16 },
        { month: "Nov", acceptanceRate: 94, revenue: 25000, deliveries: 20 },
        { month: "Dec", acceptanceRate: overallQCScore, revenue: 28000, deliveries: 22 },
      ]

      // Get product insights
      const products = await prisma.product.findMany({
        where: { farmerId: farmer.id },
        include: {
          qcResults: {
            orderBy: { timestamp: "desc" },
            take: 10
          }
        }
      })

      const productInsights = products.map(product => {
        const productQCResults = product.qcResults
        const averageAcceptanceRate = productQCResults.length > 0
          ? productQCResults.reduce((sum, result) => {
              const total = result.acceptedQuantity + result.rejectedQuantity
              return sum + (total > 0 ? (result.acceptedQuantity / total) * 100 : 0)
            }, 0) / productQCResults.length
          : 0

        // Extract common rejection reasons
        const allReasons = productQCResults.flatMap(result => result.rejectionReasons)
        const reasonCounts = allReasons.reduce((acc, reason) => {
          acc[reason] = (acc[reason] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        
        const recentIssues = Object.entries(reasonCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([reason]) => reason)

        // Generate recommendations based on issues
        const recommendations = []
        if (recentIssues.includes("Size inconsistency")) {
          recommendations.push("Focus on uniform sizing during harvest")
        }
        if (recentIssues.includes("Quality degradation")) {
          recommendations.push("Improve post-harvest handling and storage")
        }
        if (recentIssues.includes("Packaging issues")) {
          recommendations.push("Review packaging materials and methods")
        }
        if (averageAcceptanceRate < 85) {
          recommendations.push("Consider consulting with our agronomist for quality improvement")
        }

        return {
          productName: product.name,
          totalDeliveries: productQCResults.length,
          averageAcceptanceRate,
          trend: averageAcceptanceRate > 90 ? "up" : averageAcceptanceRate > 70 ? "stable" : "down",
          recentIssues,
          recommendations
        }
      })

      // Mock achievements
      const achievements = []
      if (overallQCScore > 90) {
        achievements.push({
          id: "quality-champion",
          title: "Quality Champion",
          description: "Maintained 90%+ acceptance rate",
          earnedDate: new Date().toISOString(),
          icon: "trophy"
        })
      }
      if (qcResults.length > 50) {
        achievements.push({
          id: "reliable-supplier",
          title: "Reliable Supplier",
          description: "Completed 50+ deliveries",
          earnedDate: new Date().toISOString(),
          icon: "star"
        })
      }

      const totalRevenue = performanceData.reduce((sum, data) => sum + data.revenue, 0)
      const totalDeliveries = performanceData.reduce((sum, data) => sum + data.deliveries, 0)

      const insights = {
        overallQCScore,
        totalRevenue,
        totalDeliveries,
        performanceData,
        productInsights,
        achievements
      }

      res.status(200).json({ insights })
    } catch (error) {
      // console.error("Farmer insights error:", error)
      res.status(500).json({ message: "Internal server error" })
    }
  } else {
    res.status(405).json({ message: "Method not allowed" })
  }
}