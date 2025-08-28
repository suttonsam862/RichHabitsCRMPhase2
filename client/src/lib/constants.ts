// Sports available for organizations
export const AVAILABLE_SPORTS = [
  { id: "550e8400-e29b-41d4-a716-446655440001", name: "Football" },
  { id: "550e8400-e29b-41d4-a716-446655440002", name: "Basketball" },
  { id: "550e8400-e29b-41d4-a716-446655440003", name: "Soccer" },
  { id: "550e8400-e29b-41d4-a716-446655440004", name: "Baseball" },
  { id: "550e8400-e29b-41d4-a716-446655440005", name: "Track & Field" },
  { id: "550e8400-e29b-41d4-a716-446655440006", name: "Swimming" },
  { id: "550e8400-e29b-41d4-a716-446655440007", name: "Volleyball" },
  { id: "550e8400-e29b-41d4-a716-446655440008", name: "Tennis" },
  { id: "550e8400-e29b-41d4-a716-446655440009", name: "Wrestling" },
  { id: "550e8400-e29b-41d4-a716-446655440010", name: "Golf" },
  { id: "550e8400-e29b-41d4-a716-446655440011", name: "Cross Country" },
  { id: "550e8400-e29b-41d4-a716-446655440012", name: "Lacrosse" },
  { id: "550e8400-e29b-41d4-a716-446655440013", name: "Hockey" },
  { id: "550e8400-e29b-41d4-a716-446655440014", name: "Softball" },
  { id: "550e8400-e29b-41d4-a716-446655440015", name: "Cheerleading" },
];

// User roles
export const USER_ROLES = {
  CUSTOMER: 'customer',
  CONTACT: 'contact',
  ADMIN: 'admin',
  STAFF: 'staff',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];