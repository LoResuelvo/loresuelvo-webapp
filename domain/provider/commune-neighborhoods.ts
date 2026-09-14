/**
 * Barrios oficiales de la Ciudad Autónoma de Buenos Aires según Ley N.º 1.777.
 * Utilizado para enriquecer la selección de comunas en el onboarding del prestador.
 */
export const COMMUNE_NEIGHBORHOODS: Record<string, string> = {
  "Comuna 1": "Retiro, San Nicolás, Puerto Madero, San Telmo, Montserrat, Constitución",
  "Comuna 2": "Recoleta",
  "Comuna 3": "Balvanera, San Cristóbal",
  "Comuna 4": "La Boca, Barracas, Parque Patricios, Nueva Pompeya",
  "Comuna 5": "Almagro, Boedo",
  "Comuna 6": "Caballito",
  "Comuna 7": "Flores, Parque Chacabuco",
  "Comuna 8": "Villa Soldati, Villa Riachuelo, Villa Lugano",
  "Comuna 9": "Liniers, Mataderos, Parque Avellaneda",
  "Comuna 10": "Villa Luro, Vélez Sársfield, Floresta, Monte Castro, Villa Real, Versalles",
  "Comuna 11": "Villa Devoto, Villa del Parque, Villa Santa Rita, Villa General Mitre",
  "Comuna 12": "Coghlan, Saavedra, Villa Urquiza, Villa Pueyrredón",
  "Comuna 13": "Núñez, Belgrano, Colegiales",
  "Comuna 14": "Palermo",
  "Comuna 15": "Chacarita, Villa Crespo, La Paternal, Villa Ortúzar, Agronomía, Parque Chas",
};

/**
 * Retorna la lista de barrios para un nombre de comuna dado (ej: "Comuna 6" -> "Caballito").
 */
export function getNeighborhoodsForZone(zoneName: string): string | undefined {
  return COMMUNE_NEIGHBORHOODS[zoneName.trim()];
}
