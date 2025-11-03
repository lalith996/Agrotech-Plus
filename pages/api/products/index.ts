
import { NextApiRequest, NextApiResponse } from "next"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { productSchema } from "@/lib/validations"
import { ProductWhereInput, HTTP_STATUS, ApiErrorCode, createErrorResponse, createSuccessResponse } from "@/types/api"
import { logError, logInfo } from "@/lib/logger"
import { validatePagination, sanitizeSearchQuery } from "@/lib/query-validation"
import { Prisma } from "@prisma/client"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      const { 
        category, 
        search, 
        farmerId, 
        isActive,
        availability,
        minPrice,
        maxPrice,
        minRating,
        page = "1", 
        limit = "12" 
      } = req.query

      const categories = req.query["categories[]"]
      const categoriesArray = categories ? (Array.isArray(categories) ? categories : [categories]) : []

      const farmerIds = req.query["farmerIds[]"]
      const farmerIdsArray = farmerIds ? (Array.isArray(farmerIds) ? farmerIds : [farmerIds]) : []

      // Validate pagination parameters
      const { page: pageNum, limit: limitNum, skip } = validatePagination(page, limit, {
        defaultPage: 1,
        defaultLimit: 12,
        maxLimit: 100,
      })

      // Sanitize search query
      const searchQuery = sanitizeSearchQuery(search)

      // Build where clause with proper types
      const where: Prisma.ProductWhereInput = {}

      if (availability === "in_stock") {
        where.isActive = true
      } else if (availability === "out_of_stock") {
        where.isActive = false
      } else if (availability === "all") {
        // Don't filter by isActive
      } else if (isActive !== undefined) {
        where.isActive = isActive === "true"
      } else {
        // Default: only show active products
        where.isActive = true
      }

      if (categoriesArray.length > 0) {
        where.category = { in: categoriesArray }
      } else if (category && category !== "all") {
        where.category = category
      }

      if (searchQuery) {
        where.OR = [
          { name: { contains: searchQuery, mode: "insensitive" } },
          { description: { contains: searchQuery, mode: "insensitive" } },
        ]
      }

      if (farmerIdsArray.length > 0) {
        where.farmerId = { in: farmerIdsArray }
      } else if (farmerId) {
        where.farmerId = farmerId
      }

      if (minPrice || maxPrice) {
        where.basePrice = {}
        if (minPrice) where.basePrice.gte = parseFloat(minPrice as string)
        if (maxPrice) where.basePrice.lte = parseFloat(maxPrice as string)
      }

      // Get products with farmer information and aggregate ratings
      const products = await prisma.product.findMany({
        where,
        include: {
          farmer: {
            include: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
          _count: {
            select: {
              reviews: true,
            },
          },
        },
        skip,
        take: limitNum,
        orderBy: {
          createdAt: "desc",
        },
      })

      // Calculate average rating for each product
      const productsWithRating = await Promise.all(
        products.map(async (product) => {
          const reviews = await prisma.productReview.aggregate({
            where: { productId: product.id },
            _avg: { rating: true },
          });

          return {
            ...product,
            rating: reviews._avg.rating || 0,
            reviewCount: product._count.reviews,
          };
        })
      );

      // Get total count for pagination
      const total = await prisma.product.count({ where })
      const paginatedProducts = productsWithRating

      // Get unique categories for filtering
      const uniqueCategories = await prisma.product.findMany({
        where: { isActive: true },
        select: { category: true },
        distinct: ["category"],
      })

      res.status(200).json({
        products: paginatedProducts,
        categories: uniqueCategories.map(c => c.category),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      })
    } catch (error) {
      logError("Products fetch error", error instanceof Error ? error : new Error(String(error)), {
        method: req.method,
        path: req.url,
      })
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createErrorResponse(
          ApiErrorCode.DATABASE_ERROR,
          "Failed to fetch products"
        )
      )
    }
  } else if (req.method === "POST") {
    const session = await getServerSession(req, res, authOptions)

    if (!session || session.user.role !== "FARMER") {
      return res.status(401).json({ message: "Unauthorized" })
    }

    try {
      const farmer = await prisma.farmer.findUnique({
        where: { userId: session.user.id },
      })

      if (!farmer) {
        return res.status(403).json({ message: "Farmer profile not found" })
      }

      const validatedData = productSchema.parse({
        ...req.body,
        farmerId: farmer.id,
      })

      const newProduct = await prisma.product.create({
        data: validatedData,
      })

      res.status(201).json(newProduct)
    } catch (error) {
      logError("Product creation error", error instanceof Error ? error : new Error(String(error)), {
        method: req.method,
        farmerId: session?.user?.id,
      })

      if (error instanceof Error && error.name === "ZodError") {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          createErrorResponse(
            ApiErrorCode.VALIDATION_ERROR,
            "Invalid product data",
            (error as any).errors
          )
        )
      }

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(
        createErrorResponse(
          ApiErrorCode.INTERNAL_SERVER_ERROR,
          "Failed to create product"
        )
      )
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"])
    res.status(405).json({ message: "Method not allowed" })
  }
}
