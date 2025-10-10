
import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { getSession } from "next-auth/react";
import { productSchema } from "@/lib/validations";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const productId = id as string;

  const session = await getSession({ req });

  if (!session || session.user.role !== "FARMER") {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const farmer = await prisma.farmer.findUnique({
    where: { userId: session.user.id },
  });

  if (!farmer) {
    return res.status(403).json({ message: "Farmer profile not found" });
  }

  // Fetch the product to ensure it exists and the farmer owns it
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  if (product.farmerId !== farmer.id) {
    return res
      .status(403)
      .json({ message: "You do not have permission to modify this product" });
  }

  if (req.method === "PUT") {
    try {
      const validatedData = productSchema.parse(req.body);
      const updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: validatedData,
      });
      res.status(200).json(updatedProduct);
    } catch (error: any) {
      // console.error("Product update error:", error);
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  } else if (req.method === "DELETE") {
    try {
      await prisma.product.delete({
        where: { id: productId },
      });
      res.status(200).json({ message: "Product deleted successfully" });
    } catch (error) {
      // console.error("Product deletion error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  } else {
    res.setHeader("Allow", ["PUT", "DELETE"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
