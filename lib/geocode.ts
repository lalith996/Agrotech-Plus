
import { Address } from "@prisma/client";

// A more specific type for the address data needed for geocoding
type GeocodableAddress = Pick<Address, "street" | "city" | "state" | "zipCode">;

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";

/**
 * Geocodes a given address using the OpenStreetMap Nominatim API.
 * 
 * @param address - An object containing the street, city, state, and zipCode.
 * @returns A promise that resolves to an object with latitude and longitude, or null if not found.
 */
export async function geocodeAddress(
  address: GeocodableAddress
): Promise<{ latitude: number; longitude: number } | null> {
  const { street, city, state, zipCode } = address;
  const addressString = `${street}, ${city}, ${state} ${zipCode}`;

  try {
    const params = new URLSearchParams({
      q: addressString,
      format: "json",
      limit: "1",
    });

    const url = `${NOMINATIM_ENDPOINT}?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "AgroTech/1.0 (dev@agrotech.com)", // Nominatim requires a user agent
      },
    });

    if (!response.ok) {
      // console.error(`Nominatim API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();

    if (data && data.length > 0) {
      const { lat, lon } = data[0];
      return {
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
      };
    }

    // console.warn(`Address not found for: ${addressString}`);
    return null;
  } catch (error) {
    // console.error("Geocoding failed:", error);
    return null;
  }
}

