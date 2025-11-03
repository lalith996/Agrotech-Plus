/**
 * System Configuration Management
 * Centralized configuration retrieval from database
 */

import { prisma } from './prisma';
import { logWarn, logInfo } from './logger';

// Configuration cache with TTL
const configCache = new Map<string, { value: any; expiresAt: number }>();
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export enum ConfigKey {
  // Revenue & Commission
  FARMER_COMMISSION_RATE = 'farmer_commission_rate',
  PLATFORM_FEE_PERCENTAGE = 'platform_fee_percentage',

  // Business Rules
  MIN_ORDER_AMOUNT = 'min_order_amount',
  MAX_ORDER_AMOUNT = 'max_order_amount',
  DEFAULT_DELIVERY_FEE = 'default_delivery_fee',
  FREE_DELIVERY_THRESHOLD = 'free_delivery_threshold',

  // Limits
  MAX_SUBSCRIPTION_ITEMS = 'max_subscription_items',
  MAX_CART_ITEMS = 'max_cart_items',
  MAX_FILE_SIZE_MB = 'max_file_size_mb',

  // QC
  QC_ACCEPTANCE_THRESHOLD = 'qc_acceptance_threshold',
  QC_PHOTO_REQUIRED = 'qc_photo_required',

  // Notifications
  EMAIL_NOTIFICATIONS_ENABLED = 'email_notifications_enabled',
  SMS_NOTIFICATIONS_ENABLED = 'sms_notifications_enabled',

  // Features
  PRODUCT_REVIEWS_ENABLED = 'product_reviews_enabled',
  SUBSCRIPTION_PAUSING_ENABLED = 'subscription_pausing_enabled',
}

interface ConfigValue {
  string: string;
  number: number;
  boolean: boolean;
  json: any;
}

/**
 * Get configuration value from database with caching
 */
export async function getConfig<T extends keyof ConfigValue>(
  key: ConfigKey,
  type: T,
  defaultValue: ConfigValue[T]
): Promise<ConfigValue[T]> {
  // Check cache first
  const cached = configCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key },
    });

    if (!config || !config.isActive) {
      logWarn(`Config key '${key}' not found or inactive, using default`, {
        key,
        defaultValue,
      });
      return defaultValue;
    }

    let value: any;

    switch (type) {
      case 'string':
        value = String(config.value);
        break;
      case 'number':
        value = Number(config.value);
        if (isNaN(value)) {
          logWarn(`Config key '${key}' is not a valid number`, { value: config.value });
          value = defaultValue;
        }
        break;
      case 'boolean':
        value = Boolean(config.value);
        break;
      case 'json':
        value = config.value;
        break;
      default:
        value = config.value;
    }

    // Cache the value
    configCache.set(key, {
      value,
      expiresAt: Date.now() + DEFAULT_CACHE_TTL,
    });

    return value;
  } catch (error) {
    logWarn(`Failed to fetch config '${key}', using default`, {
      key,
      defaultValue,
      error: error instanceof Error ? error.message : String(error),
    });
    return defaultValue;
  }
}

/**
 * Set configuration value in database
 */
export async function setConfig(
  key: ConfigKey,
  value: any,
  category: string,
  description?: string
): Promise<void> {
  try {
    await prisma.systemConfig.upsert({
      where: { key },
      update: {
        value,
        category,
        description,
        isActive: true,
      },
      create: {
        key,
        value,
        category,
        description,
        isActive: true,
      },
    });

    // Invalidate cache
    configCache.delete(key);

    logInfo(`Config updated: ${key}`, { key, value, category });
  } catch (error) {
    throw new Error(`Failed to set config '${key}': ${error}`);
  }
}

/**
 * Clear configuration cache
 */
export function clearConfigCache(key?: ConfigKey): void {
  if (key) {
    configCache.delete(key);
  } else {
    configCache.clear();
  }
}

// ===================================
// Helper Functions for Common Configs
// ===================================

/**
 * Get farmer commission rate (percentage they receive from sales)
 * Default: 60% (0.6)
 */
export async function getFarmerCommissionRate(): Promise<number> {
  return getConfig(ConfigKey.FARMER_COMMISSION_RATE, 'number', 0.6);
}

/**
 * Get platform fee percentage
 * Default: 40% (0.4)
 */
export async function getPlatformFeePercentage(): Promise<number> {
  return getConfig(ConfigKey.PLATFORM_FEE_PERCENTAGE, 'number', 0.4);
}

/**
 * Get minimum order amount
 * Default: 100 INR
 */
export async function getMinOrderAmount(): Promise<number> {
  return getConfig(ConfigKey.MIN_ORDER_AMOUNT, 'number', 100);
}

/**
 * Get maximum order amount
 * Default: 50000 INR
 */
export async function getMaxOrderAmount(): Promise<number> {
  return getConfig(ConfigKey.MAX_ORDER_AMOUNT, 'number', 50000);
}

/**
 * Get default delivery fee
 * Default: 50 INR
 */
export async function getDefaultDeliveryFee(): Promise<number> {
  return getConfig(ConfigKey.DEFAULT_DELIVERY_FEE, 'number', 50);
}

/**
 * Get free delivery threshold
 * Default: 500 INR
 */
export async function getFreeDeliveryThreshold(): Promise<number> {
  return getConfig(ConfigKey.FREE_DELIVERY_THRESHOLD, 'number', 500);
}

/**
 * Calculate farmer revenue from order item
 */
export async function calculateFarmerRevenue(
  orderAmount: number
): Promise<number> {
  const commissionRate = await getFarmerCommissionRate();
  return orderAmount * commissionRate;
}

/**
 * Calculate platform fee from order item
 */
export async function calculatePlatformFee(
  orderAmount: number
): Promise<number> {
  const platformFee = await getPlatformFeePercentage();
  return orderAmount * platformFee;
}

/**
 * Initialize default configurations
 * Run this during application setup
 */
export async function initializeDefaultConfigs(): Promise<void> {
  const defaults = [
    {
      key: ConfigKey.FARMER_COMMISSION_RATE,
      value: 0.6,
      category: 'revenue',
      description: 'Percentage of revenue that goes to farmers (0.6 = 60%)',
    },
    {
      key: ConfigKey.PLATFORM_FEE_PERCENTAGE,
      value: 0.4,
      category: 'revenue',
      description: 'Platform fee percentage (0.4 = 40%)',
    },
    {
      key: ConfigKey.MIN_ORDER_AMOUNT,
      value: 100,
      category: 'business_rules',
      description: 'Minimum order amount in INR',
    },
    {
      key: ConfigKey.MAX_ORDER_AMOUNT,
      value: 50000,
      category: 'business_rules',
      description: 'Maximum order amount in INR',
    },
    {
      key: ConfigKey.DEFAULT_DELIVERY_FEE,
      value: 50,
      category: 'business_rules',
      description: 'Default delivery fee in INR',
    },
    {
      key: ConfigKey.FREE_DELIVERY_THRESHOLD,
      value: 500,
      category: 'business_rules',
      description: 'Order amount above which delivery is free in INR',
    },
    {
      key: ConfigKey.MAX_SUBSCRIPTION_ITEMS,
      value: 20,
      category: 'limits',
      description: 'Maximum items allowed in a subscription',
    },
    {
      key: ConfigKey.MAX_CART_ITEMS,
      value: 50,
      category: 'limits',
      description: 'Maximum items allowed in cart',
    },
    {
      key: ConfigKey.MAX_FILE_SIZE_MB,
      value: 10,
      category: 'limits',
      description: 'Maximum file upload size in MB',
    },
    {
      key: ConfigKey.QC_ACCEPTANCE_THRESHOLD,
      value: 0.8,
      category: 'qc',
      description: 'Minimum acceptance rate for QC (0.8 = 80%)',
    },
    {
      key: ConfigKey.QC_PHOTO_REQUIRED,
      value: true,
      category: 'qc',
      description: 'Whether photos are required for QC',
    },
    {
      key: ConfigKey.EMAIL_NOTIFICATIONS_ENABLED,
      value: true,
      category: 'notifications',
      description: 'Enable email notifications',
    },
    {
      key: ConfigKey.SMS_NOTIFICATIONS_ENABLED,
      value: false,
      category: 'notifications',
      description: 'Enable SMS notifications',
    },
    {
      key: ConfigKey.PRODUCT_REVIEWS_ENABLED,
      value: true,
      category: 'features',
      description: 'Enable product reviews',
    },
    {
      key: ConfigKey.SUBSCRIPTION_PAUSING_ENABLED,
      value: true,
      category: 'features',
      description: 'Allow users to pause subscriptions',
    },
  ];

  for (const config of defaults) {
    try {
      await prisma.systemConfig.upsert({
        where: { key: config.key },
        update: {},
        create: config as any,
      });
    } catch (error) {
      logWarn(`Failed to initialize config: ${config.key}`, { error });
    }
  }

  logInfo('Default configurations initialized');
}
