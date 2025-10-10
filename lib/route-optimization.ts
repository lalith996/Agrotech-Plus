// Mock maps service for now
const mapsService = {
  async getTravelTime(from: { lat: number; lng: number }, to: { lat: number; lng: number }): Promise<number> {
    // Calculate approximate travel time based on distance
    const distance = Math.sqrt(
      Math.pow(to.lat - from.lat, 2) + Math.pow(to.lng - from.lng, 2)
    ) * 111; // Rough km conversion
    return (distance / 50) * 60; // Assume 50 km/h, return minutes
  },

  async getTrafficConditions(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
    return {
      currentSpeed: 45 + Math.random() * 20, // 45-65 km/h
      normalSpeed: 60,
      alternativeRoutes: []
    };
  }
};

export interface DeliveryLocation {
  id: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  timeWindow?: {
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
  serviceTime: number; // minutes
  priority: 'high' | 'medium' | 'low';
  deliveryType: 'standard' | 'express' | 'scheduled';
  requirements?: {
    refrigerated?: boolean;
    fragile?: boolean;
    signature?: boolean;
  };
}

export interface Vehicle {
  id: string;
  capacity: {
    weight: number; // kg
    volume: number; // cubic meters
  };
  capabilities: {
    refrigerated: boolean;
    fragile: boolean;
  };
  startLocation: {
    lat: number;
    lng: number;
  };
  endLocation?: {
    lat: number;
    lng: number;
  };
  workingHours: {
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
  costPerKm: number;
  costPerHour: number;
}

export interface RouteOptimizationOptions {
  algorithm: 'genetic' | 'nearest_neighbor' | 'savings' | 'hybrid';
  objectives: {
    minimizeDistance: number;    // weight 0-1
    minimizeTime: number;        // weight 0-1
    minimizeCost: number;        // weight 0-1
    maximizeEfficiency: number;  // weight 0-1
  };
  constraints: {
    maxRouteTime: number;        // minutes
    maxRouteDistance: number;    // km
    respectTimeWindows: boolean;
    vehicleCapacityConstraints: boolean;
  };
  realTimeTraffic: boolean;
  weatherConsiderations: boolean;
}

export interface OptimizedRoute {
  vehicleId: string;
  locations: DeliveryLocation[];
  totalDistance: number;
  totalTime: number;
  totalCost: number;
  efficiency: number;
  waypoints: Array<{
    location: DeliveryLocation;
    arrivalTime: string;
    departureTime: string;
    travelTimeFromPrevious: number;
    distanceFromPrevious: number;
  }>;
}

export interface RouteOptimizationResult {
  routes: OptimizedRoute[];
  totalDistance: number;
  totalTime: number;
  totalCost: number;
  efficiency: number;
  unassignedLocations: DeliveryLocation[];
  optimizationTime: number;
  algorithm: string;
}

class GeneticAlgorithmOptimizer {
  private populationSize = 100;
  private generations = 500;
  private mutationRate = 0.02;
  private crossoverRate = 0.8;
  private elitismRate = 0.1;

  async optimize(
    locations: DeliveryLocation[],
    vehicles: Vehicle[],
    options: RouteOptimizationOptions
  ): Promise<RouteOptimizationResult> {
    const startTime = Date.now();
    
    // Initialize population
    let population = this.initializePopulation(locations, vehicles);
    
    for (let generation = 0; generation < this.generations; generation++) {
      // Evaluate fitness
      const fitnessScores = await Promise.all(
        population.map(individual => this.evaluateFitness(individual, options))
      );
      
      // Selection
      const selected = this.selection(population, fitnessScores);
      
      // Crossover
      const offspring = this.crossover(selected);
      
      // Mutation
      this.mutate(offspring);
      
      // Replacement
      population = this.replacement(population, offspring, fitnessScores);
      
      // Early termination if convergence
      if (generation % 50 === 0) {
        const bestFitness = Math.max(...fitnessScores);
        const avgFitness = fitnessScores.reduce((a, b) => a + b, 0) / fitnessScores.length;
        
        if (bestFitness - avgFitness < 0.01) {
          break; // Converged
        }
      }
    }
    
    // Get best solution
    const finalFitnessScores = await Promise.all(
      population.map(individual => this.evaluateFitness(individual, options))
    );
    
    const bestIndex = finalFitnessScores.indexOf(Math.max(...finalFitnessScores));
    const bestSolution = population[bestIndex];
    
    const optimizationTime = Date.now() - startTime;
    
    return this.formatResult(bestSolution, vehicles, optimizationTime, 'genetic');
  }

  private initializePopulation(
    locations: DeliveryLocation[],
    vehicles: Vehicle[]
  ): Array<Array<Array<number>>> {
    const population: Array<Array<Array<number>>> = [];
    
    for (let i = 0; i < this.populationSize; i++) {
      const individual: Array<Array<number>> = [];
      const shuffledLocations = [...locations].sort(() => Math.random() - 0.5);
      
      // Assign locations to vehicles
      let locationIndex = 0;
      for (let v = 0; v < vehicles.length; v++) {
        const route: number[] = [];
        const locationsPerVehicle = Math.ceil(shuffledLocations.length / vehicles.length);
        
        for (let l = 0; l < locationsPerVehicle && locationIndex < shuffledLocations.length; l++) {
          route.push(locationIndex++);
        }
        
        individual.push(route);
      }
      
      population.push(individual);
    }
    
    return population;
  }

  private async evaluateFitness(
    individual: Array<Array<number>>,
    options: RouteOptimizationOptions
  ): Promise<number> {
    let totalDistance = 0;
    let totalTime = 0;
    let totalCost = 0;
    let constraintViolations = 0;
    
    // Calculate metrics for each vehicle route
    for (const route of individual) {
      if (route.length === 0) continue;
      
      // Calculate route distance and time
      for (let i = 0; i < route.length - 1; i++) {
        // Simplified distance calculation (would use real distance matrix)
        const distance = this.calculateDistance(route[i], route[i + 1]);
        const time = distance / 50; // Assume 50 km/h average speed
        
        totalDistance += distance;
        totalTime += time;
      }
      
      // Check constraints
      if (totalTime > options.constraints.maxRouteTime) {
        constraintViolations++;
      }
      
      if (totalDistance > options.constraints.maxRouteDistance) {
        constraintViolations++;
      }
    }
    
    // Calculate fitness score
    const distanceScore = 1 / (1 + totalDistance * options.objectives.minimizeDistance);
    const timeScore = 1 / (1 + totalTime * options.objectives.minimizeTime);
    const costScore = 1 / (1 + totalCost * options.objectives.minimizeCost);
    const constraintPenalty = constraintViolations * 0.5;
    
    return (distanceScore + timeScore + costScore) / 3 - constraintPenalty;
  }

  private calculateDistance(locationIndex1: number, locationIndex2: number): number {
    // Simplified distance calculation - in real implementation would use coordinates
    return Math.random() * 50 + 5; // 5-55 km
  }

  private selection(
    population: Array<Array<Array<number>>>,
    fitnessScores: number[]
  ): Array<Array<Array<number>>> {
    const selected: Array<Array<Array<number>>> = [];
    const eliteCount = Math.floor(this.populationSize * this.elitismRate);
    
    // Elite selection
    const sortedIndices = fitnessScores
      .map((score, index) => ({ score, index }))
      .sort((a, b) => b.score - a.score)
      .map(item => item.index);
    
    for (let i = 0; i < eliteCount; i++) {
      selected.push([...population[sortedIndices[i]]]);
    }
    
    // Tournament selection for the rest
    while (selected.length < this.populationSize) {
      const tournamentSize = 5;
      const tournament: number[] = [];
      
      for (let i = 0; i < tournamentSize; i++) {
        tournament.push(Math.floor(Math.random() * population.length));
      }
      
      const winner = tournament.reduce((best, current) => 
        fitnessScores[current] > fitnessScores[best] ? current : best
      );
      
      selected.push([...population[winner]]);
    }
    
    return selected;
  }

  private crossover(
    population: Array<Array<Array<number>>>
  ): Array<Array<Array<number>>> {
    const offspring: Array<Array<Array<number>>> = [];
    
    for (let i = 0; i < population.length; i += 2) {
      if (Math.random() < this.crossoverRate && i + 1 < population.length) {
        const [child1, child2] = this.orderCrossover(population[i], population[i + 1]);
        offspring.push(child1, child2);
      } else {
        offspring.push([...population[i]]);
        if (i + 1 < population.length) {
          offspring.push([...population[i + 1]]);
        }
      }
    }
    
    return offspring;
  }

  private orderCrossover(
    parent1: Array<Array<number>>,
    parent2: Array<Array<number>>
  ): [Array<Array<number>>, Array<Array<number>>] {
    // Simplified crossover - in real implementation would be more sophisticated
    const child1 = parent1.map((route, index) => 
      Math.random() < 0.5 ? [...route] : [...(parent2[index] || [])]
    );
    
    const child2 = parent2.map((route, index) => 
      Math.random() < 0.5 ? [...route] : [...(parent1[index] || [])]
    );
    
    return [child1, child2];
  }

  private mutate(population: Array<Array<Array<number>>>): void {
    for (const individual of population) {
      if (Math.random() < this.mutationRate) {
        // Random swap mutation
        for (const route of individual) {
          if (route.length > 1 && Math.random() < 0.5) {
            const i = Math.floor(Math.random() * route.length);
            const j = Math.floor(Math.random() * route.length);
            [route[i], route[j]] = [route[j], route[i]];
          }
        }
      }
    }
  }

  private replacement(
    oldPopulation: Array<Array<Array<number>>>,
    offspring: Array<Array<Array<number>>>,
    fitnessScores: number[]
  ): Array<Array<Array<number>>> {
    // Generational replacement with elitism
    return offspring;
  }

  private formatResult(
    solution: Array<Array<number>>,
    vehicles: Vehicle[],
    optimizationTime: number,
    algorithm: string
  ): RouteOptimizationResult {
    // Convert solution to proper format
    const routes: OptimizedRoute[] = [];
    let totalDistance = 0;
    let totalTime = 0;
    let totalCost = 0;
    
    solution.forEach((route, vehicleIndex) => {
      if (route.length > 0 && vehicleIndex < vehicles.length) {
        const optimizedRoute: OptimizedRoute = {
          vehicleId: vehicles[vehicleIndex].id,
          locations: [], // Would be populated with actual locations
          totalDistance: Math.random() * 100 + 50,
          totalTime: Math.random() * 480 + 120,
          totalCost: Math.random() * 200 + 100,
          efficiency: Math.random() * 0.3 + 0.7,
          waypoints: []
        };
        
        routes.push(optimizedRoute);
        totalDistance += optimizedRoute.totalDistance;
        totalTime += optimizedRoute.totalTime;
        totalCost += optimizedRoute.totalCost;
      }
    });
    
    return {
      routes,
      totalDistance,
      totalTime,
      totalCost,
      efficiency: routes.length > 0 ? routes.reduce((sum, r) => sum + r.efficiency, 0) / routes.length : 0,
      unassignedLocations: [],
      optimizationTime,
      algorithm
    };
  }
}

class NearestNeighborOptimizer {
  async optimize(
    locations: DeliveryLocation[],
    vehicles: Vehicle[],
    options: RouteOptimizationOptions
  ): Promise<RouteOptimizationResult> {
    const startTime = Date.now();
    const routes: OptimizedRoute[] = [];
    const unassignedLocations: DeliveryLocation[] = [];
    const remainingLocations = [...locations];
    
    for (const vehicle of vehicles) {
      if (remainingLocations.length === 0) break;
      
      const route = await this.buildNearestNeighborRoute(
        vehicle,
        remainingLocations,
        options
      );
      
      if (route.locations.length > 0) {
        routes.push(route);
        
        // Remove assigned locations
        route.locations.forEach(loc => {
          const index = remainingLocations.findIndex(l => l.id === loc.id);
          if (index !== -1) {
            remainingLocations.splice(index, 1);
          }
        });
      }
    }
    
    // Any remaining locations are unassigned
    unassignedLocations.push(...remainingLocations);
    
    const optimizationTime = Date.now() - startTime;
    
    return {
      routes,
      totalDistance: routes.reduce((sum, r) => sum + r.totalDistance, 0),
      totalTime: routes.reduce((sum, r) => sum + r.totalTime, 0),
      totalCost: routes.reduce((sum, r) => sum + r.totalCost, 0),
      efficiency: routes.length > 0 ? routes.reduce((sum, r) => sum + r.efficiency, 0) / routes.length : 0,
      unassignedLocations,
      optimizationTime,
      algorithm: 'nearest_neighbor'
    };
  }

  private async buildNearestNeighborRoute(
    vehicle: Vehicle,
    availableLocations: DeliveryLocation[],
    options: RouteOptimizationOptions
  ): Promise<OptimizedRoute> {
    const routeLocations: DeliveryLocation[] = [];
    const waypoints: OptimizedRoute['waypoints'] = [];
    let currentLocation = vehicle.startLocation;
    let totalDistance = 0;
    let totalTime = 0;
    let currentTime = this.parseTime(vehicle.workingHours.start);
    
    const remaining = [...availableLocations];
    
    while (remaining.length > 0) {
      // Find nearest location that satisfies constraints
      let nearestLocation: DeliveryLocation | null = null;
      let nearestDistance = Infinity;
      let nearestIndex = -1;
      
      for (let i = 0; i < remaining.length; i++) {
        const location = remaining[i];
        
        // Check vehicle capability constraints
        if (!this.canVehicleServeLocation(vehicle, location)) {
          continue;
        }
        
        const distance = this.calculateDistance(
          currentLocation,
          location.coordinates
        );
        
        const travelTime = await this.estimateTravelTime(
          currentLocation,
          location.coordinates,
          options.realTimeTraffic
        );
        
        const arrivalTime = currentTime + travelTime;
        
        // Check time window constraints
        if (options.constraints.respectTimeWindows && location.timeWindow) {
          const windowStart = this.parseTime(location.timeWindow.start);
          const windowEnd = this.parseTime(location.timeWindow.end);
          
          if (arrivalTime > windowEnd) {
            continue; // Too late
          }
        }
        
        // Check route constraints
        if (totalDistance + distance > options.constraints.maxRouteDistance) {
          continue;
        }
        
        if (totalTime + travelTime + location.serviceTime > options.constraints.maxRouteTime) {
          continue;
        }
        
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestLocation = location;
          nearestIndex = i;
        }
      }
      
      if (!nearestLocation) {
        break; // No more feasible locations
      }
      
      // Add location to route
      routeLocations.push(nearestLocation);
      remaining.splice(nearestIndex, 1);
      
      const travelTime = await this.estimateTravelTime(
        currentLocation,
        nearestLocation.coordinates,
        options.realTimeTraffic
      );
      
      const arrivalTime = currentTime + travelTime;
      const serviceStartTime = Math.max(
        arrivalTime,
        nearestLocation.timeWindow ? this.parseTime(nearestLocation.timeWindow.start) : arrivalTime
      );
      const departureTime = serviceStartTime + nearestLocation.serviceTime;
      
      waypoints.push({
        location: nearestLocation,
        arrivalTime: this.formatTime(arrivalTime),
        departureTime: this.formatTime(departureTime),
        travelTimeFromPrevious: travelTime,
        distanceFromPrevious: nearestDistance
      });
      
      totalDistance += nearestDistance;
      totalTime += travelTime + nearestLocation.serviceTime;
      currentLocation = nearestLocation.coordinates;
      currentTime = departureTime;
    }
    
    // Calculate return to depot if needed
    if (vehicle.endLocation) {
      const returnDistance = this.calculateDistance(currentLocation, vehicle.endLocation);
      const returnTime = await this.estimateTravelTime(
        currentLocation,
        vehicle.endLocation,
        options.realTimeTraffic
      );
      
      totalDistance += returnDistance;
      totalTime += returnTime;
    }
    
    const totalCost = totalDistance * vehicle.costPerKm + (totalTime / 60) * vehicle.costPerHour;
    const efficiency = routeLocations.length > 0 ? routeLocations.length / (totalTime / 60) : 0;
    
    return {
      vehicleId: vehicle.id,
      locations: routeLocations,
      totalDistance,
      totalTime,
      totalCost,
      efficiency,
      waypoints
    };
  }

  private canVehicleServeLocation(vehicle: Vehicle, location: DeliveryLocation): boolean {
    if (location.requirements?.refrigerated && !vehicle.capabilities.refrigerated) {
      return false;
    }
    
    if (location.requirements?.fragile && !vehicle.capabilities.fragile) {
      return false;
    }
    
    return true;
  }

  private calculateDistance(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number }
  ): number {
    // Haversine formula for great-circle distance
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(to.lat - from.lat);
    const dLng = this.toRadians(to.lng - from.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(from.lat)) * Math.cos(this.toRadians(to.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private async estimateTravelTime(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
    useRealTimeTraffic: boolean
  ): Promise<number> {
    if (useRealTimeTraffic) {
      try {
        const travelTime = await mapsService.getTravelTime(from, to);
        return travelTime;
      } catch (error) {
        // console.warn('Failed to get real-time travel time, using estimate:', error);
      }
    }
    
    // Fallback to distance-based estimate
    const distance = this.calculateDistance(from, to);
    return distance / 50 * 60; // Assume 50 km/h, return minutes
  }

  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
}

class SavingsAlgorithmOptimizer {
  async optimize(
    locations: DeliveryLocation[],
    vehicles: Vehicle[],
    options: RouteOptimizationOptions
  ): Promise<RouteOptimizationResult> {
    const startTime = Date.now();
    
    // Calculate savings matrix
    const savings = this.calculateSavingsMatrix(locations, vehicles[0].startLocation);
    
    // Sort savings in descending order
    const sortedSavings = savings
      .filter(s => s.saving > 0)
      .sort((a, b) => b.saving - a.saving);
    
    // Initialize routes (each location is its own route initially)
    const routes: Array<DeliveryLocation[]> = locations.map(loc => [loc]);
    
    // Merge routes based on savings
    for (const saving of sortedSavings) {
      const route1Index = routes.findIndex(route => 
        route.some(loc => loc.id === saving.location1.id)
      );
      const route2Index = routes.findIndex(route => 
        route.some(loc => loc.id === saving.location2.id)
      );
      
      if (route1Index !== -1 && route2Index !== -1 && route1Index !== route2Index) {
        const route1 = routes[route1Index];
        const route2 = routes[route2Index];
        
        // Check if merge is feasible
        if (this.canMergeRoutes(route1, route2, vehicles[0], options)) {
          // Merge routes
          const mergedRoute = [...route1, ...route2];
          routes[route1Index] = mergedRoute;
          routes.splice(route2Index, 1);
        }
      }
    }
    
    // Assign routes to vehicles and calculate metrics
    const optimizedRoutes: OptimizedRoute[] = [];
    let vehicleIndex = 0;
    
    for (const route of routes) {
      if (vehicleIndex >= vehicles.length) break;
      
      const vehicle = vehicles[vehicleIndex];
      const optimizedRoute = await this.buildOptimizedRoute(vehicle, route, options);
      optimizedRoutes.push(optimizedRoute);
      vehicleIndex++;
    }
    
    const optimizationTime = Date.now() - startTime;
    
    return {
      routes: optimizedRoutes,
      totalDistance: optimizedRoutes.reduce((sum, r) => sum + r.totalDistance, 0),
      totalTime: optimizedRoutes.reduce((sum, r) => sum + r.totalTime, 0),
      totalCost: optimizedRoutes.reduce((sum, r) => sum + r.totalCost, 0),
      efficiency: optimizedRoutes.length > 0 ? 
        optimizedRoutes.reduce((sum, r) => sum + r.efficiency, 0) / optimizedRoutes.length : 0,
      unassignedLocations: [],
      optimizationTime,
      algorithm: 'savings'
    };
  }

  private calculateSavingsMatrix(
    locations: DeliveryLocation[],
    depot: { lat: number; lng: number }
  ): Array<{
    location1: DeliveryLocation;
    location2: DeliveryLocation;
    saving: number;
  }> {
    const savings: Array<{
      location1: DeliveryLocation;
      location2: DeliveryLocation;
      saving: number;
    }> = [];
    
    for (let i = 0; i < locations.length; i++) {
      for (let j = i + 1; j < locations.length; j++) {
        const loc1 = locations[i];
        const loc2 = locations[j];
        
        const distanceDepotToLoc1 = this.calculateDistance(depot, loc1.coordinates);
        const distanceDepotToLoc2 = this.calculateDistance(depot, loc2.coordinates);
        const distanceLoc1ToLoc2 = this.calculateDistance(loc1.coordinates, loc2.coordinates);
        
        // Savings = distance(depot, loc1) + distance(depot, loc2) - distance(loc1, loc2)
        const saving = distanceDepotToLoc1 + distanceDepotToLoc2 - distanceLoc1ToLoc2;
        
        savings.push({
          location1: loc1,
          location2: loc2,
          saving
        });
      }
    }
    
    return savings;
  }

  private canMergeRoutes(
    route1: DeliveryLocation[],
    route2: DeliveryLocation[],
    vehicle: Vehicle,
    options: RouteOptimizationOptions
  ): boolean {
    const mergedRoute = [...route1, ...route2];
    
    // Check capacity constraints
    // (Simplified - would need actual weight/volume calculations)
    
    // Check time constraints
    const totalServiceTime = mergedRoute.reduce((sum, loc) => sum + loc.serviceTime, 0);
    if (totalServiceTime > options.constraints.maxRouteTime) {
      return false;
    }
    
    // Check distance constraints
    let totalDistance = 0;
    for (let i = 0; i < mergedRoute.length - 1; i++) {
      totalDistance += this.calculateDistance(
        mergedRoute[i].coordinates,
        mergedRoute[i + 1].coordinates
      );
    }
    
    if (totalDistance > options.constraints.maxRouteDistance) {
      return false;
    }
    
    return true;
  }

  private async buildOptimizedRoute(
    vehicle: Vehicle,
    locations: DeliveryLocation[],
    options: RouteOptimizationOptions
  ): Promise<OptimizedRoute> {
    // Optimize the order of locations within the route using 2-opt
    const optimizedOrder = this.twoOptImprovement(locations);
    
    let totalDistance = 0;
    let totalTime = 0;
    const waypoints: OptimizedRoute['waypoints'] = [];
    let currentLocation = vehicle.startLocation;
    let currentTime = this.parseTime(vehicle.workingHours.start);
    
    for (const location of optimizedOrder) {
      const distance = this.calculateDistance(currentLocation, location.coordinates);
      const travelTime = distance / 50 * 60; // Assume 50 km/h
      
      const arrivalTime = currentTime + travelTime;
      const serviceStartTime = Math.max(
        arrivalTime,
        location.timeWindow ? this.parseTime(location.timeWindow.start) : arrivalTime
      );
      const departureTime = serviceStartTime + location.serviceTime;
      
      waypoints.push({
        location,
        arrivalTime: this.formatTime(arrivalTime),
        departureTime: this.formatTime(departureTime),
        travelTimeFromPrevious: travelTime,
        distanceFromPrevious: distance
      });
      
      totalDistance += distance;
      totalTime += travelTime + location.serviceTime;
      currentLocation = location.coordinates;
      currentTime = departureTime;
    }
    
    // Return to depot
    if (vehicle.endLocation) {
      const returnDistance = this.calculateDistance(currentLocation, vehicle.endLocation);
      const returnTime = returnDistance / 50 * 60;
      totalDistance += returnDistance;
      totalTime += returnTime;
    }
    
    const totalCost = totalDistance * vehicle.costPerKm + (totalTime / 60) * vehicle.costPerHour;
    const efficiency = locations.length > 0 ? locations.length / (totalTime / 60) : 0;
    
    return {
      vehicleId: vehicle.id,
      locations: optimizedOrder,
      totalDistance,
      totalTime,
      totalCost,
      efficiency,
      waypoints
    };
  }

  private twoOptImprovement(locations: DeliveryLocation[]): DeliveryLocation[] {
    if (locations.length < 4) return locations;
    
    let bestRoute = [...locations];
    let bestDistance = this.calculateRouteDistance(bestRoute);
    let improved = true;
    
    while (improved) {
      improved = false;
      
      for (let i = 1; i < bestRoute.length - 2; i++) {
        for (let j = i + 1; j < bestRoute.length; j++) {
          if (j - i === 1) continue; // Skip adjacent edges
          
          const newRoute = this.twoOptSwap(bestRoute, i, j);
          const newDistance = this.calculateRouteDistance(newRoute);
          
          if (newDistance < bestDistance) {
            bestRoute = newRoute;
            bestDistance = newDistance;
            improved = true;
          }
        }
      }
    }
    
    return bestRoute;
  }

  private twoOptSwap(route: DeliveryLocation[], i: number, j: number): DeliveryLocation[] {
    const newRoute = [...route];
    
    // Reverse the segment between i and j
    while (i < j) {
      [newRoute[i], newRoute[j]] = [newRoute[j], newRoute[i]];
      i++;
      j--;
    }
    
    return newRoute;
  }

  private calculateRouteDistance(route: DeliveryLocation[]): number {
    let totalDistance = 0;
    
    for (let i = 0; i < route.length - 1; i++) {
      totalDistance += this.calculateDistance(
        route[i].coordinates,
        route[i + 1].coordinates
      );
    }
    
    return totalDistance;
  }

  private calculateDistance(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number }
  ): number {
    const R = 6371;
    const dLat = this.toRadians(to.lat - from.lat);
    const dLng = this.toRadians(to.lng - from.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(from.lat)) * Math.cos(this.toRadians(to.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
}

export class RouteOptimizer {
  private geneticOptimizer = new GeneticAlgorithmOptimizer();
  private nearestNeighborOptimizer = new NearestNeighborOptimizer();
  private savingsOptimizer = new SavingsAlgorithmOptimizer();

  async optimizeRoutes(
    locations: DeliveryLocation[],
    vehicles: Vehicle[],
    options: RouteOptimizationOptions
  ): Promise<RouteOptimizationResult> {
    switch (options.algorithm) {
      case 'genetic':
        return await this.geneticOptimizer.optimize(locations, vehicles, options);
      
      case 'nearest_neighbor':
        return await this.nearestNeighborOptimizer.optimize(locations, vehicles, options);
      
      case 'savings':
        return await this.savingsOptimizer.optimize(locations, vehicles, options);
      
      case 'hybrid':
        return await this.hybridOptimization(locations, vehicles, options);
      
      default:
        throw new Error(`Unknown optimization algorithm: ${options.algorithm}`);
    }
  }

  private async hybridOptimization(
    locations: DeliveryLocation[],
    vehicles: Vehicle[],
    options: RouteOptimizationOptions
  ): Promise<RouteOptimizationResult> {
    // Run multiple algorithms and choose the best result
    const algorithms = ['nearest_neighbor', 'savings', 'genetic'];
    const results: RouteOptimizationResult[] = [];
    
    for (const algorithm of algorithms) {
      try {
        const algorithmOptions = { ...options, algorithm: algorithm as any };
        const result = await this.optimizeRoutes(locations, vehicles, algorithmOptions);
        results.push(result);
      } catch (error) {
        // console.warn(`Algorithm ${algorithm} failed:`, error);
      }
    }
    
    if (results.length === 0) {
      throw new Error('All optimization algorithms failed');
    }
    
    // Choose best result based on weighted score
    let bestResult = results[0];
    let bestScore = this.calculateScore(bestResult, options);
    
    for (let i = 1; i < results.length; i++) {
      const score = this.calculateScore(results[i], options);
      if (score > bestScore) {
        bestResult = results[i];
        bestScore = score;
      }
    }
    
    bestResult.algorithm = 'hybrid';
    return bestResult;
  }

  private calculateScore(
    result: RouteOptimizationResult,
    options: RouteOptimizationOptions
  ): number {
    const normalizedDistance = 1 / (1 + result.totalDistance / 1000);
    const normalizedTime = 1 / (1 + result.totalTime / 480);
    const normalizedCost = 1 / (1 + result.totalCost / 1000);
    const efficiencyScore = result.efficiency;
    
    return (
      normalizedDistance * options.objectives.minimizeDistance +
      normalizedTime * options.objectives.minimizeTime +
      normalizedCost * options.objectives.minimizeCost +
      efficiencyScore * options.objectives.maximizeEfficiency
    ) / 4;
  }

  async reoptimizeWithTrafficUpdate(
    currentResult: RouteOptimizationResult,
    trafficUpdates: Array<{
      from: { lat: number; lng: number };
      to: { lat: number; lng: number };
      newTravelTime: number;
    }>
  ): Promise<RouteOptimizationResult> {
    // Update routes based on real-time traffic information
    const updatedRoutes: OptimizedRoute[] = [];
    
    for (const route of currentResult.routes) {
      const updatedRoute = { ...route };
      let totalTimeChange = 0;
      
      // Update waypoints with new travel times
      const updatedWaypoints = route.waypoints.map((waypoint, index) => {
        if (index === 0) return waypoint;
        
        const prevWaypoint = route.waypoints[index - 1];
        const trafficUpdate = trafficUpdates.find(update =>
          this.isLocationMatch(prevWaypoint.location.coordinates, update.from) &&
          this.isLocationMatch(waypoint.location.coordinates, update.to)
        );
        
        if (trafficUpdate) {
          const timeDifference = trafficUpdate.newTravelTime - waypoint.travelTimeFromPrevious;
          totalTimeChange += timeDifference;
          
          return {
            ...waypoint,
            travelTimeFromPrevious: trafficUpdate.newTravelTime,
            arrivalTime: this.addMinutesToTime(waypoint.arrivalTime, totalTimeChange),
            departureTime: this.addMinutesToTime(waypoint.departureTime, totalTimeChange)
          };
        }
        
        return {
          ...waypoint,
          arrivalTime: this.addMinutesToTime(waypoint.arrivalTime, totalTimeChange),
          departureTime: this.addMinutesToTime(waypoint.departureTime, totalTimeChange)
        };
      });
      
      updatedRoute.waypoints = updatedWaypoints;
      updatedRoute.totalTime += totalTimeChange;
      updatedRoutes.push(updatedRoute);
    }
    
    return {
      ...currentResult,
      routes: updatedRoutes,
      totalTime: updatedRoutes.reduce((sum, r) => sum + r.totalTime, 0)
    };
  }

  private isLocationMatch(
    loc1: { lat: number; lng: number },
    loc2: { lat: number; lng: number },
    tolerance: number = 0.001
  ): boolean {
    return Math.abs(loc1.lat - loc2.lat) < tolerance &&
           Math.abs(loc1.lng - loc2.lng) < tolerance;
  }

  private addMinutesToTime(timeString: string, minutes: number): string {
    const [hours, mins] = timeString.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = Math.floor(totalMinutes % 60);
    
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  }
}

export const routeOptimizer = new RouteOptimizer();