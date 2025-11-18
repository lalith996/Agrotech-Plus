import { z } from "zod"
import { UserRole, OrderStatus, SubscriptionStatus } from "@prisma/client"

// User validation schemas
export const userSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  role: z.nativeEnum(UserRole),
})

export const customerSchema = z.object({
  id: z.string().cuid().optional(),
  userId: z.string().cuid(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number").optional(),
})

export const farmerSchema = z.object({
  id: z.string().cuid().optional(),
  userId: z.string().cuid(),
  farmName: z.string().min(1, "Farm name is required").max(100),
  location: z.string().min(1, "Location is required").max(200),
  description: z.string().max(1000).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number").optional(),
  isApproved: z.boolean().default(false),
})

// Address validation schema
export const addressSchema = z.object({
  id: z.string().cuid().optional(),
  customerId: z.string().cuid(),
  name: z.string().min(1, "Address name is required").max(50),
  street: z.string().min(1, "Street address is required").max(200),
  city: z.string().min(1, "City is required").max(50),
  state: z.string().min(1, "State is required").max(50),
  zipCode: z.string().regex(/^\d{6}$/, "Invalid ZIP code (6 digits required)"),
  isDefault: z.boolean().default(false),
})

// Product validation schema
export const productSchema = z.object({
  id: z.string().cuid().optional(),
  name: z.string().min(1, "Product name is required").max(100),
  category: z.string().min(1, "Category is required").max(50),
  description: z.string().max(1000).optional(),
  images: z.array(z.string().url()).default([]),
  basePrice: z.number().positive("Price must be positive"),
  unit: z.string().min(1, "Unit is required").max(20),
  isActive: z.boolean().default(true),
  farmerId: z.string().cuid(),
})

// Subscription validation schemas
export const subscriptionItemSchema = z.object({
  id: z.string().cuid().optional(),
  subscriptionId: z.string().cuid(),
  productId: z.string().cuid(),
  quantity: z.number().positive("Quantity must be positive"),
  frequency: z.enum(["weekly", "biweekly", "monthly"]).default("weekly"),
})

export const subscriptionSchema = z.object({
  id: z.string().cuid().optional(),
  customerId: z.string().cuid(),
  deliveryZone: z.string().min(1, "Delivery zone is required"),
  deliveryDay: z.string().min(1, "Delivery day is required"),
  status: z.nativeEnum(SubscriptionStatus).default(SubscriptionStatus.ACTIVE),
  startDate: z.date(),
  pausedUntil: z.date().optional(),
  items: z.array(subscriptionItemSchema).min(1, "At least one item is required"),
})

// Order validation schemas
export const orderItemSchema = z.object({
  id: z.string().cuid().optional(),
  orderId: z.string().cuid(),
  productId: z.string().cuid(),
  quantity: z.number().positive("Quantity must be positive"),
  price: z.number().positive("Price must be positive"),
})

export const orderSchema = z.object({
  id: z.string().cuid().optional(),
  customerId: z.string().cuid(),
  subscriptionId: z.string().cuid().optional(),
  addressId: z.string().cuid(),
  deliverySlot: z.string().min(1, "Delivery slot is required"),
  status: z.nativeEnum(OrderStatus).default(OrderStatus.PENDING),
  totalAmount: z.number().positive("Total amount must be positive"),
  deliveryDate: z.date(),
  specialNotes: z.string().max(500).optional(),
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
})

// QC validation schema
export const qcResultSchema = z.object({
  id: z.string().cuid().optional(),
  farmerDeliveryId: z.string().cuid(),
  productId: z.string().cuid(),
  farmerId: z.string().cuid(),
  expectedQuantity: z.number().positive("Expected quantity must be positive"),
  acceptedQuantity: z.number().min(0, "Accepted quantity cannot be negative"),
  rejectedQuantity: z.number().min(0, "Rejected quantity cannot be negative"),
  rejectionReasons: z.array(z.string()).default([]),
  photos: z.array(z.string().url()).default([]),
  inspectorId: z.string().cuid(),
  notes: z.string().max(1000).optional(),
})

// Password complexity validation
const passwordComplexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(passwordComplexityRegex, {
    message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)"
  })

// Authentication schemas
export const signUpSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
  role: z.nativeEnum(UserRole).default(UserRole.CUSTOMER),
  // Additional fields based on role
  farmName: z.string().optional(),
  location: z.string().optional(),
  phone: z.string().optional(),
})

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

export const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// Profile update schemas
export const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number").optional(),
})

export const updateFarmerProfileSchema = z.object({
  farmName: z.string().min(1, "Farm name is required").max(100),
  location: z.string().min(1, "Location is required").max(200),
  description: z.string().max(1000).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number").optional(),
})

// Type exports for use in components
export type SignUpInput = z.infer<typeof signUpSchema>
export type SignInInput = z.infer<typeof signInSchema>
export type UserInput = z.infer<typeof userSchema>
export type CustomerInput = z.infer<typeof customerSchema>
export type FarmerInput = z.infer<typeof farmerSchema>
export type AddressInput = z.infer<typeof addressSchema>
export type ProductInput = z.infer<typeof productSchema>
export type SubscriptionInput = z.infer<typeof subscriptionSchema>
export type OrderInput = z.infer<typeof orderSchema>
export type QCResultInput = z.infer<typeof qcResultSchema>