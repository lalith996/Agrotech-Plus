import { prisma } from './db-optimization';
import { cacheService } from './redis';

export interface UserPreferences {
  favoriteCategories: string[];
  preferredFarms: string[];
  dietaryRestrictions: string[];
  maxDeliveryDistance?: number;
  priceRange?: {
    min: number;
    max: number;
  };
  notificationSettings: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
}

export interface PersonalizedRecommendation {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  unit: string;
  images: string[];
  farmer: {
    id: string;
    farmName: string;
    location: string;
  };
  score: number;
  reason: string;
  seasonality?: {
    inSeason: boolean;
    peakSeason: boolean;
  };
}

export interface SeasonalProduct {
  id: string;
  name: string;
  category: string;
  season: string;
  peakMonths: number[];
  availability: 'high' | 'medium' | 'low';
}

class PersonalizationService {
  /**
   * Get or create user preferences
   */
  static async getUserPreferences(userId: string): Promise<UserPreferences> {
    const cacheKey = `preferences:${userId}`;
    
    return await cacheService.get(
      `preferences:${userId}`,
      async () => {
        // Mock preferences lookup - in real implementation use prisma.userPreference.findUnique
        let preferences = null; // await prisma.userPreference.findUnique({ where: { userId } });

        if (!preferences) {
          // Create default preferences based on user behavior
          const defaultPrefs = await this.generateDefaultPreferences(userId);
          
          // Mock preferences creation - in real implementation use prisma.userPreference.create
          preferences = {
            userId,
            favoriteCategories: defaultPrefs.favoriteCategories,
            preferredFarms: defaultPrefs.preferredFarms,
            dietaryRestrictions: defaultPrefs.dietaryRestrictions,
            maxDeliveryDistance: defaultPrefs.maxDeliveryDistance,
            priceRange: defaultPrefs.priceRange,
            notificationSettings: defaultPrefs.notificationSettings
          };
        }

        return {
          favoriteCategories: preferences.favoriteCategories,
          preferredFarms: preferences.preferredFarms,
          dietaryRestrictions: preferences.dietaryRestrictions,
          maxDeliveryDistance: preferences.maxDeliveryDistance,
          priceRange: preferences.priceRange as any,
          notificationSettings: preferences.notificationSettings as any
        };
      },
      { redisTTL: 600, memoryTTL: 300 } // 10 minutes cache
    );
  }

  /**
   * Update user preferences
   */
  static async updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<UserPreferences> {
    try {
      // Mock preferences update - in real implementation use prisma.userPreference.upsert
      const updated = {
        userId,
        favoriteCategories: preferences.favoriteCategories || [],
        preferredFarms: preferences.preferredFarms || [],
        dietaryRestrictions: preferences.dietaryRestrictions || [],
        maxDeliveryDistance: preferences.maxDeliveryDistance,
        priceRange: preferences.priceRange,
        notificationSettings: preferences.notificationSettings || {
          email: true,
          sms: false,
          push: true
        }
      };

      // Invalidate cache
      await cacheService.invalidate(`preferences:${userId}`);

      return {
        favoriteCategories: updated.favoriteCategories,
        preferredFarms: updated.preferredFarms,
        dietaryRestrictions: updated.dietaryRestrictions,
        maxDeliveryDistance: updated.maxDeliveryDistance,
        priceRange: updated.priceRange as any,
        notificationSettings: updated.notificationSettings as any
      };
    } catch (error) {
      // console.error('Update preferences error:', error);
      throw error;
    }
  }

  /**
   * Get personalized product recommendations
   */
  static async getPersonalizedRecommendations(
    userId: string,
    limit: number = 20
  ): Promise<PersonalizedRecommendation[]> {
    const cacheKey = `recommendations:${userId}:${limit}`;
    
    return await cacheService.get(
      `recommendations:${userId}:${limit}`,
      async () => {
        const preferences = await this.getUserPreferences(userId);
        const purchaseHistory = await this.getUserPurchaseHistory(userId);
        const seasonalProducts = await this.getSeasonalProducts();

        // Get base products
        const products = await prisma.product.findMany({
          where: {
            isActive: true,
            farmer: {
              isApproved: true
            }
          },
          include: {
            farmer: {
              select: {
                id: true,
                farmName: true,
                location: true
              }
            }
          },
          take: limit * 3 // Get more to filter and score
        });

        // Score and rank products
        const scoredProducts = products.map(product => {
          const score = this.calculatePersonalizationScore(
            product,
            preferences,
            purchaseHistory,
            seasonalProducts
          );

          const reason = this.generateRecommendationReason(
            product,
            preferences,
            purchaseHistory,
            seasonalProducts
          );

          const seasonality = this.getProductSeasonality(product, seasonalProducts);

          return {
            id: product.id,
            name: product.name,
            category: product.category,
            basePrice: product.basePrice,
            unit: product.unit,
            images: product.images,
            farmer: product.farmer,
            score,
            reason,
            seasonality
          };
        });

        // Sort by score and return top recommendations
        return scoredProducts
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);
      },
      { redisTTL: 300, memoryTTL: 150 } // 5 minutes cache
    );
  }

  /**
   * Get seasonal product recommendations
   */
  static async getSeasonalRecommendations(
    userId?: string,
    limit: number = 10
  ): Promise<PersonalizedRecommendation[]> {
    const currentMonth = new Date().getMonth() + 1; // 1-12
    const seasonalProducts = await this.getSeasonalProducts();
    
    // Filter products that are in season
    const inSeasonProducts = seasonalProducts.filter(product => 
      product.peakMonths.includes(currentMonth) || 
      (product.availability === 'high' && this.isInSeason(product, currentMonth))
    );

    const products = await prisma.product.findMany({
      where: {
        id: {
          in: inSeasonProducts.map(p => p.id)
        },
        isActive: true,
        farmer: {
          isApproved: true
        }
      },
      include: {
        farmer: {
          select: {
            id: true,
            farmName: true,
            location: true
          }
        }
      },
      take: limit
    });

    let preferences: UserPreferences | null = null;
    let purchaseHistory: any[] = [];

    if (userId) {
      preferences = await this.getUserPreferences(userId);
      purchaseHistory = await this.getUserPurchaseHistory(userId);
    }

    return products.map(product => {
      const seasonalProduct = inSeasonProducts.find(sp => sp.id === product.id);
      const score = preferences ? 
        this.calculatePersonalizationScore(product, preferences, purchaseHistory, seasonalProducts) :
        this.calculateSeasonalScore(product, seasonalProduct!);

      return {
        id: product.id,
        name: product.name,
        category: product.category,
        basePrice: product.basePrice,
        unit: product.unit,
        images: product.images,
        farmer: product.farmer,
        score,
        reason: `In peak season - ${seasonalProduct?.season}`,
        seasonality: {
          inSeason: true,
          peakSeason: seasonalProduct?.peakMonths.includes(currentMonth) || false
        }
      };
    }).sort((a, b) => b.score - a.score);
  }

  /**
   * Track user interaction for learning
   */
  static async trackUserInteraction(
    userId: string,
    productId: string,
    action: 'view' | 'add_to_cart' | 'purchase' | 'like' | 'share'
  ): Promise<void> {
    try {
      // This could be stored in a separate interactions table
      // For now, we'll update preferences based on the interaction
      
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: { category: true, farmerId: true }
      });

      if (!product) return;

      const preferences = await this.getUserPreferences(userId);
      
      // Update preferences based on interaction
      const updatedPreferences = { ...preferences };

      if (action === 'purchase' || action === 'add_to_cart' || action === 'like') {
        // Add to favorite categories if not already there
        if (!updatedPreferences.favoriteCategories.includes(product.category)) {
          updatedPreferences.favoriteCategories.push(product.category);
        }

        // Add to preferred farms if not already there
        if (!updatedPreferences.preferredFarms.includes(product.farmerId)) {
          updatedPreferences.preferredFarms.push(product.farmerId);
        }
      }

      await this.updateUserPreferences(userId, updatedPreferences);
    } catch (error) {
      // console.error('Track interaction error:', error);
    }
  }

  /**
   * Generate default preferences based on user behavior
   */
  private static async generateDefaultPreferences(userId: string): Promise<UserPreferences> {
    try {
      // Analyze user's order history to infer preferences
      const orders = await prisma.order.findMany({
        where: { customerId: userId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  category: true,
                  farmerId: true,
                  basePrice: true
                }
              }
            }
          }
        },
        take: 20,
        orderBy: { createdAt: 'desc' }
      });

      const categoryCount: Record<string, number> = {};
      const farmerCount: Record<string, number> = {};
      const prices: number[] = [];

      orders.forEach(order => {
        order.items.forEach(item => {
          const category = item.product.category;
          const farmerId = item.product.farmerId;
          const price = item.product.basePrice;

          categoryCount[category] = (categoryCount[category] || 0) + 1;
          farmerCount[farmerId] = (farmerCount[farmerId] || 0) + 1;
          prices.push(price);
        });
      });

      // Get top categories and farmers
      const favoriteCategories = Object.entries(categoryCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([category]) => category);

      const preferredFarms = Object.entries(farmerCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([farmerId]) => farmerId);

      // Calculate price range
      let priceRange;
      if (prices.length > 0) {
        prices.sort((a, b) => a - b);
        const min = prices[Math.floor(prices.length * 0.1)]; // 10th percentile
        const max = prices[Math.floor(prices.length * 0.9)]; // 90th percentile
        priceRange = { min, max };
      }

      return {
        favoriteCategories,
        preferredFarms,
        dietaryRestrictions: [],
        maxDeliveryDistance: 50, // Default 50km
        priceRange,
        notificationSettings: {
          email: true,
          sms: false,
          push: true
        }
      };
    } catch (error) {
      // console.error('Generate default preferences error:', error);
      return {
        favoriteCategories: [],
        preferredFarms: [],
        dietaryRestrictions: [],
        maxDeliveryDistance: 50,
        notificationSettings: {
          email: true,
          sms: false,
          push: true
        }
      };
    }
  }

  /**
   * Get user purchase history for recommendations
   */
  private static async getUserPurchaseHistory(userId: string): Promise<any[]> {
    try {
      const orders = await prisma.order.findMany({
        where: { customerId: userId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  category: true,
                  farmerId: true
                }
              }
            }
          }
        },
        take: 50,
        orderBy: { createdAt: 'desc' }
      });

      return orders.flatMap(order => 
        order.items.map(item => ({
          productId: item.product.id,
          category: item.product.category,
          farmerId: item.product.farmerId,
          quantity: item.quantity,
          orderDate: order.createdAt
        }))
      );
    } catch (error) {
      // console.error('Get purchase history error:', error);
      return [];
    }
  }

  /**
   * Get seasonal products data
   */
  private static async getSeasonalProducts(): Promise<SeasonalProduct[]> {
    // This would typically come from a seasonal products database
    // For now, return hardcoded seasonal data
    return [
      {
        id: 'seasonal-1',
        name: 'Tomatoes',
        category: 'vegetables',
        season: 'Summer',
        peakMonths: [6, 7, 8, 9], // June to September
        availability: 'high'
      },
      {
        id: 'seasonal-2',
        name: 'Apples',
        category: 'fruits',
        season: 'Fall',
        peakMonths: [9, 10, 11], // September to November
        availability: 'high'
      },
      {
        id: 'seasonal-3',
        name: 'Leafy Greens',
        category: 'vegetables',
        season: 'Spring',
        peakMonths: [3, 4, 5], // March to May
        availability: 'medium'
      }
    ];
  }

  /**
   * Calculate personalization score for a product
   */
  private static calculatePersonalizationScore(
    product: any,
    preferences: UserPreferences,
    purchaseHistory: any[],
    seasonalProducts: SeasonalProduct[]
  ): number {
    let score = 0;

    // Category preference (30% weight)
    if (preferences.favoriteCategories.includes(product.category)) {
      score += 30;
    }

    // Farmer preference (25% weight)
    if (preferences.preferredFarms.includes(product.farmer.id)) {
      score += 25;
    }

    // Price preference (20% weight)
    if (preferences.priceRange) {
      const { min, max } = preferences.priceRange;
      if (product.basePrice >= min && product.basePrice <= max) {
        score += 20;
      } else {
        // Partial score based on how close it is
        const distance = Math.min(
          Math.abs(product.basePrice - min),
          Math.abs(product.basePrice - max)
        );
        score += Math.max(0, 20 - (distance / max) * 20);
      }
    }

    // Purchase history (15% weight)
    const previousPurchases = purchaseHistory.filter(p => p.productId === product.id);
    if (previousPurchases.length > 0) {
      score += 15;
    } else {
      // Similar category purchases
      const categoryPurchases = purchaseHistory.filter(p => p.category === product.category);
      score += Math.min(10, categoryPurchases.length * 2);
    }

    // Seasonality (10% weight)
    const seasonalProduct = seasonalProducts.find(sp => 
      sp.category === product.category || sp.name.toLowerCase().includes(product.name.toLowerCase())
    );
    if (seasonalProduct && this.isInSeason(seasonalProduct, new Date().getMonth() + 1)) {
      score += 10;
    }

    return Math.min(100, score);
  }

  /**
   * Calculate seasonal score for products
   */
  private static calculateSeasonalScore(product: any, seasonalProduct: SeasonalProduct): number {
    const currentMonth = new Date().getMonth() + 1;
    let score = 50; // Base score

    if (seasonalProduct.peakMonths.includes(currentMonth)) {
      score += 30; // Peak season bonus
    } else if (this.isInSeason(seasonalProduct, currentMonth)) {
      score += 15; // In season bonus
    }

    if (seasonalProduct.availability === 'high') {
      score += 20;
    } else if (seasonalProduct.availability === 'medium') {
      score += 10;
    }

    return score;
  }

  /**
   * Generate recommendation reason
   */
  private static generateRecommendationReason(
    product: any,
    preferences: UserPreferences,
    purchaseHistory: any[],
    seasonalProducts: SeasonalProduct[]
  ): string {
    const reasons: string[] = [];

    if (preferences.favoriteCategories.includes(product.category)) {
      reasons.push(`You love ${product.category}`);
    }

    if (preferences.preferredFarms.includes(product.farmer.id)) {
      reasons.push(`From your favorite farm: ${product.farmer.farmName}`);
    }

    const previousPurchases = purchaseHistory.filter(p => p.productId === product.id);
    if (previousPurchases.length > 0) {
      reasons.push('You\'ve ordered this before');
    }

    const seasonalProduct = seasonalProducts.find(sp => 
      sp.category === product.category || sp.name.toLowerCase().includes(product.name.toLowerCase())
    );
    if (seasonalProduct && this.isInSeason(seasonalProduct, new Date().getMonth() + 1)) {
      reasons.push(`In season now (${seasonalProduct.season})`);
    }

    return reasons.length > 0 ? reasons.join(' • ') : 'Popular choice';
  }

  /**
   * Get product seasonality information
   */
  private static getProductSeasonality(product: any, seasonalProducts: SeasonalProduct[]) {
    const currentMonth = new Date().getMonth() + 1;
    const seasonalProduct = seasonalProducts.find(sp => 
      sp.category === product.category || sp.name.toLowerCase().includes(product.name.toLowerCase())
    );

    if (seasonalProduct) {
      return {
        inSeason: this.isInSeason(seasonalProduct, currentMonth),
        peakSeason: seasonalProduct.peakMonths.includes(currentMonth)
      };
    }

    return undefined;
  }

  /**
   * Check if product is in season
   */
  private static isInSeason(seasonalProduct: SeasonalProduct, month: number): boolean {
    // Extend peak months by 1 month on each side for "in season"
    const extendedMonths = [
      ...seasonalProduct.peakMonths,
      ...seasonalProduct.peakMonths.map(m => m === 1 ? 12 : m - 1),
      ...seasonalProduct.peakMonths.map(m => m === 12 ? 1 : m + 1)
    ];

    return extendedMonths.includes(month);
  }
}

export { PersonalizationService };