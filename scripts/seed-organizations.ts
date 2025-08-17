import { db } from "../server/db";
import { organizations } from "../shared/schema";
import { v4 as uuidv4 } from "uuid";

const demoOrganizations = [
  {
    name: "Lincoln High School",
    state: "CA",
    address: "1600 Lincoln Way, San Francisco, CA 94122",
    phone: "(415) 759-2700",
    email: "info@lincolnhs.edu",
    is_business: false,
    notes: "Premium school partner since 2020. Regular orders for sports teams and graduation events.",
    universalDiscounts: { bulk: 10, seasonal: 5 },
    logoUrl: null,
  },
  {
    name: "Tech Innovators Inc.",
    state: "TX",
    address: "5000 Innovation Drive, Austin, TX 78759",
    phone: "(512) 555-0100",
    email: "orders@techinnovators.com",
    is_business: true,
    notes: "Corporate client. Custom branded apparel for events and employee uniforms.",
    universalDiscounts: { corporate: 15, volume: 20 },
    logoUrl: null,
  },
  {
    name: "Riverside Academy",
    state: "NY",
    address: "250 Riverside Blvd, New York, NY 10025",
    phone: "(212) 555-3400",
    email: "athletics@riversideacademy.org",
    is_business: false,
    notes: "Elite preparatory school. High-value orders for multiple sports programs.",
    universalDiscounts: { prepay: 8 },
    logoUrl: null,
  },
];

async function seedOrganizations() {
  console.log("🌱 Starting organization seed...");

  try {
    // Check if organizations already exist
    const existing = await db.select().from(organizations).limit(1);
    
    if (existing.length > 0) {
      console.log("⚠️  Organizations already exist. Skipping seed to avoid duplicates.");
      console.log("   To reseed, manually delete existing organizations first.");
      return;
    }

    // Insert demo organizations
    const inserted = await db
      .insert(organizations)
      .values(demoOrganizations)
      .returning({ id: organizations.id, name: organizations.name });

    console.log("✅ Successfully seeded organizations:");
    inserted.forEach((org) => {
      console.log(`   - ${org.name} (${org.id})`);
    });

    console.log(`\n🎉 Seed complete! Created ${inserted.length} demo organizations.`);
  } catch (error) {
    console.error("❌ Error seeding organizations:", error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the seed
seedOrganizations();