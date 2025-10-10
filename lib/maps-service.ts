// Google Maps API integration for route optimization and delivery tracking

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
}

export interface RouteWaypoint {
  id: string;
  address: Address;
  coordinates: Coordinates;
  deliveryWindow?: {
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
  estimatedDuration?: number; // minutes
  priority?: 'high' | 'medium' | 'low';
}

export interface RouteOptimizationRequest {
  origin: Coordinates;
  destination?: Coordinates;
  waypoints: RouteWaypoint[];
  vehicleType?: 'car' | 'truck' | 'motorcycle';
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  departureTime?: Date;
}

export interface OptimizedRoute {
  id: string;
  waypoints: RouteWaypoint[];
  totalDistance: number; // meters
  totalDuration: number; // seconds
  estimatedFuelCost: number;
  polyline: string;
  legs: RouteLeg[];
  trafficInfo?: TrafficInfo;
}

export interface RouteLeg {
  startAddress: string;
  endAddress: string;
  distance: number; // meters
  duration: number; // seconds
  durationInTraffic?: number; // seconds
  steps: RouteStep[];
}

export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  startLocation: Coordinates;
  endLocation: Coordinates;
  maneuver?: string;
}

export interface TrafficInfo {
  currentConditions: 'light' | 'moderate' | 'heavy' | 'severe';
  incidents: TrafficIncident[];
  averageSpeed: number; // km/h
  delayMinutes: number;
}

export interface TrafficIncident {
  id: string;
  type: 'accident' | 'construction' | 'closure' | 'congestion';
  severity: 'minor' | 'moderate' | 'major';
  description: string;
  location: Coordinates;
  estimatedClearTime?: Date;
}

export interface GeocodingResult {
  address: string;
  coordinates: Coordinates;
  formattedAddress: string;
  addressComponents: {
    streetNumber?: string;
    route?: string;
    locality?: string;
    administrativeAreaLevel1?: string;
    postalCode?: string;
    country?: string;
  };
  placeId: string;
}

export class GoogleMapsService {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_MAPS_API_KEY || '';
    if (!this.apiKey) {
      // console.warn('Google Maps API key not provided');
    }
  }

  /**
   * Geocode an address to coordinates
   */
  async geocodeAddress(address: string): Promise<GeocodingResult[]> {
    try {
      const url = `${this.baseUrl}/geocode/json?address=${encodeURIComponent(address)}&key=${this.apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Geocoding failed: ${data.status}`);
      }

      return data.results.map((result: any) => ({
        address: result.formatted_address,
        coordinates: {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng
        },
        formattedAddress: result.formatted_address,
        addressComponents: this.parseAddressComponents(result.address_components),
        placeId: result.place_id
      }));
    } catch (error) {
      // console.error('Geocoding error:', error);
      throw error;
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(coordinates: Coordinates): Promise<GeocodingResult[]> {
    try {
      const url = `${this.baseUrl}/geocode/json?latlng=${coordinates.lat},${coordinates.lng}&key=${this.apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Reverse geocoding failed: ${data.status}`);
      }

      return data.results.map((result: any) => ({
        address: result.formatted_address,
        coordinates,
        formattedAddress: result.formatted_address,
        addressComponents: this.parseAddressComponents(result.address_components),
        placeId: result.place_id
      }));
    } catch (error) {
      // console.error('Reverse geocoding error:', error);
      throw error;
    }
  }

  /**
   * Calculate route between multiple points
   */
  async calculateRoute(request: RouteOptimizationRequest): Promise<OptimizedRoute> {
    try {
      const origin = `${request.origin.lat},${request.origin.lng}`;
      const destination = request.destination 
        ? `${request.destination.lat},${request.destination.lng}`
        : origin;

      // Build waypoints string
      const waypoints = request.waypoints
        .map(wp => `${wp.coordinates.lat},${wp.coordinates.lng}`)
        .join('|');

      let url = `${this.baseUrl}/directions/json?origin=${origin}&destination=${destination}&key=${this.apiKey}`;
      
      if (waypoints) {
        url += `&waypoints=optimize:true|${waypoints}`;
      }

      // Add optional parameters
      if (request.avoidTolls) url += '&avoid=tolls';
      if (request.avoidHighways) url += '&avoid=highways';
      if (request.departureTime) {
        url += `&departure_time=${Math.floor(request.departureTime.getTime() / 1000)}`;
      }

      // Add traffic model for better estimates
      url += '&traffic_model=best_guess';

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Route calculation failed: ${data.status}`);
      }

      const route = data.routes[0];
      const legs = route.legs.map((leg: any) => ({
        startAddress: leg.start_address,
        endAddress: leg.end_address,
        distance: leg.distance.value,
        duration: leg.duration.value,
        durationInTraffic: leg.duration_in_traffic?.value,
        steps: leg.steps.map((step: any) => ({
          instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
          distance: step.distance.value,
          duration: step.duration.value,
          startLocation: step.start_location,
          endLocation: step.end_location,
          maneuver: step.maneuver
        }))
      }));

      // Reorder waypoints based on optimization
      const optimizedWaypoints = this.reorderWaypoints(
        request.waypoints,
        data.routes[0].waypoint_order || []
      );

      return {
        id: `route_${Date.now()}`,
        waypoints: optimizedWaypoints,
        totalDistance: route.legs.reduce((sum: number, leg: any) => sum + leg.distance.value, 0),
        totalDuration: route.legs.reduce((sum: number, leg: any) => sum + leg.duration.value, 0),
        estimatedFuelCost: this.calculateFuelCost(
          route.legs.reduce((sum: number, leg: any) => sum + leg.distance.value, 0),
          request.vehicleType
        ),
        polyline: route.overview_polyline.points,
        legs,
        trafficInfo: this.extractTrafficInfo(route)
      };
    } catch (error) {
      // console.error('Route calculation error:', error);
      throw error;
    }
  }

  /**
   * Get real-time traffic information for a route
   */
  async getTrafficInfo(route: OptimizedRoute): Promise<TrafficInfo> {
    try {
      // This would typically use Google Maps Roads API or Traffic API
      // For now, we'll simulate traffic data based on route characteristics
      
      const currentHour = new Date().getHours();
      let trafficCondition: 'light' | 'moderate' | 'heavy' | 'severe' = 'light';
      let delayMinutes = 0;

      // Simulate rush hour traffic
      if ((currentHour >= 7 && currentHour <= 9) || (currentHour >= 17 && currentHour <= 19)) {
        trafficCondition = 'heavy';
        delayMinutes = Math.floor(route.totalDuration * 0.3 / 60); // 30% delay
      } else if ((currentHour >= 6 && currentHour <= 10) || (currentHour >= 16 && currentHour <= 20)) {
        trafficCondition = 'moderate';
        delayMinutes = Math.floor(route.totalDuration * 0.15 / 60); // 15% delay
      }

      return {
        currentConditions: trafficCondition,
        incidents: [], // Would be populated from real traffic data
        averageSpeed: this.calculateAverageSpeed(route, trafficCondition),
        delayMinutes
      };
    } catch (error) {
      // console.error('Traffic info error:', error);
      throw error;
    }
  }

  /**
   * Calculate distance matrix between multiple points
   */
  async calculateDistanceMatrix(
    origins: Coordinates[],
    destinations: Coordinates[]
  ): Promise<{
    origins: string[];
    destinations: string[];
    rows: Array<{
      elements: Array<{
        distance: number;
        duration: number;
        status: string;
      }>;
    }>;
  }> {
    try {
      const originsStr = origins.map(o => `${o.lat},${o.lng}`).join('|');
      const destinationsStr = destinations.map(d => `${d.lat},${d.lng}`).join('|');

      const url = `${this.baseUrl}/distancematrix/json?origins=${originsStr}&destinations=${destinationsStr}&key=${this.apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Distance matrix calculation failed: ${data.status}`);
      }

      return {
        origins: data.origin_addresses,
        destinations: data.destination_addresses,
        rows: data.rows.map((row: any) => ({
          elements: row.elements.map((element: any) => ({
            distance: element.distance?.value || 0,
            duration: element.duration?.value || 0,
            status: element.status
          }))
        }))
      };
    } catch (error) {
      // console.error('Distance matrix error:', error);
      throw error;
    }
  }

  /**
   * Get place details by place ID
   */
  async getPlaceDetails(placeId: string): Promise<{
    name: string;
    address: string;
    coordinates: Coordinates;
    phoneNumber?: string;
    website?: string;
    rating?: number;
    openingHours?: string[];
  }> {
    try {
      const url = `${this.baseUrl}/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry,formatted_phone_number,website,rating,opening_hours&key=${this.apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(`Place details failed: ${data.status}`);
      }

      const result = data.result;
      return {
        name: result.name,
        address: result.formatted_address,
        coordinates: {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng
        },
        phoneNumber: result.formatted_phone_number,
        website: result.website,
        rating: result.rating,
        openingHours: result.opening_hours?.weekday_text
      };
    } catch (error) {
      // console.error('Place details error:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private parseAddressComponents(components: any[]): any {
    const parsed: any = {};
    
    components.forEach(component => {
      const types = component.types;
      
      if (types.includes('street_number')) {
        parsed.streetNumber = component.long_name;
      } else if (types.includes('route')) {
        parsed.route = component.long_name;
      } else if (types.includes('locality')) {
        parsed.locality = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        parsed.administrativeAreaLevel1 = component.short_name;
      } else if (types.includes('postal_code')) {
        parsed.postalCode = component.long_name;
      } else if (types.includes('country')) {
        parsed.country = component.long_name;
      }
    });
    
    return parsed;
  }

  private reorderWaypoints(waypoints: RouteWaypoint[], order: number[]): RouteWaypoint[] {
    if (order.length === 0) return waypoints;
    
    return order.map(index => waypoints[index]);
  }

  private calculateFuelCost(distanceMeters: number, vehicleType?: string): number {
    const distanceKm = distanceMeters / 1000;
    
    // Fuel efficiency estimates (km per liter)
    const fuelEfficiency = {
      car: 12,
      truck: 6,
      motorcycle: 25
    };
    
    const efficiency = fuelEfficiency[vehicleType as keyof typeof fuelEfficiency] || fuelEfficiency.car;
    const fuelPricePerLiter = 1.5; // USD, would be configurable
    
    return (distanceKm / efficiency) * fuelPricePerLiter;
  }

  private extractTrafficInfo(route: any): TrafficInfo | undefined {
    // Extract traffic information from route data
    // This would be more sophisticated with real traffic data
    return undefined;
  }

  private calculateAverageSpeed(route: OptimizedRoute, trafficCondition: string): number {
    const baseSpeed = (route.totalDistance / 1000) / (route.totalDuration / 3600); // km/h
    
    const trafficMultiplier = {
      light: 1.0,
      moderate: 0.8,
      heavy: 0.6,
      severe: 0.4
    };
    
    return baseSpeed * (trafficMultiplier[trafficCondition as keyof typeof trafficMultiplier] || 1.0);
  }
}

// Utility functions for coordinate calculations
export class GeoUtils {
  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  static calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(coord2.lat - coord1.lat);
    const dLng = this.toRadians(coord2.lng - coord1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(coord1.lat)) * Math.cos(this.toRadians(coord2.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  /**
   * Calculate bearing between two coordinates
   */
  static calculateBearing(coord1: Coordinates, coord2: Coordinates): number {
    const dLng = this.toRadians(coord2.lng - coord1.lng);
    const lat1 = this.toRadians(coord1.lat);
    const lat2 = this.toRadians(coord2.lat);
    
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    
    return (this.toDegrees(Math.atan2(y, x)) + 360) % 360;
  }

  /**
   * Check if a coordinate is within a bounding box
   */
  static isWithinBounds(
    coord: Coordinates,
    bounds: { north: number; south: number; east: number; west: number }
  ): boolean {
    return coord.lat >= bounds.south &&
           coord.lat <= bounds.north &&
           coord.lng >= bounds.west &&
           coord.lng <= bounds.east;
  }

  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private static toDegrees(radians: number): number {
    return radians * (180 / Math.PI);
  }
}

// Export singleton instance
export const googleMapsService = new GoogleMapsService();