import { mutation } from "./_generated/server";

// Seed tenders data
export const seedTenders = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existing = await ctx.db.query("tenders").first();
    if (existing) {
      console.log("Tenders already seeded");
      return { message: "Already seeded", count: 0 };
    }

    const tenders = [
      {
        title: "Supply of ICT Equipment",
        organization: "Federal University of Technology, Owerri",
        budget: 25000000,
        deadline: "2026-02-18",
        category: "ICT",
        status: "qualified" as const,
        requirements: ["CAC Certificate", "Tax Clearance", "3 Past Contracts", "Company Profile"],
        missing: [],
        description: "Procurement of computers, servers, networking equipment for the ICT center.",
        location: "Owerri, Imo State",
        source: "publicprocurement.ng",
        publishedAt: "2026-02-10",
      },
      {
        title: "Renovation of Staff Quarters",
        organization: "Nigeria Maritime University, Delta",
        budget: 85000000,
        deadline: "2026-02-25",
        category: "Construction",
        status: "partial" as const,
        requirements: ["CAC Certificate", "Tax Clearance", "PENCOM", "Financial Statement"],
        missing: ["PENCOM Certificate"],
        description: "Complete renovation of 24 staff quarters including electrical and plumbing works.",
        location: "Okerenkoko, Delta State",
        source: "publicprocurement.ng",
        publishedAt: "2026-02-08",
      },
      {
        title: "Consultancy Services for IT Infrastructure",
        organization: "Universal Service Provision Fund, Abuja",
        budget: 45000000,
        deadline: "2026-02-23",
        category: "Consultancy",
        status: "qualified" as const,
        requirements: ["CAC Certificate", "Company Profile", "Past Experience"],
        missing: [],
        description: "Consultancy for design and implementation of nationwide broadband infrastructure.",
        location: "Abuja, FCT",
        source: "publicprocurement.ng",
        publishedAt: "2026-02-09",
      },
      {
        title: "Supply of Solar Equipment",
        organization: "OXFAM Nigeria",
        budget: 15000000,
        deadline: "2026-02-27",
        category: "Solar & Renewable",
        status: "low" as const,
        requirements: ["Solar Installation License", "Past Contracts"],
        missing: ["Solar Installation License", "Relevant Past Contracts"],
        description: "Supply of solar panels, batteries, and inverters for rural health centers.",
        location: "Multiple Locations",
        source: "OXFAM Portal",
        publishedAt: "2026-02-11",
      },
      {
        title: "Supply of Office Furniture",
        organization: "Central Bank of Nigeria",
        budget: 35000000,
        deadline: "2026-03-05",
        category: "Supplies",
        status: "qualified" as const,
        requirements: ["CAC Certificate", "Tax Clearance", "Company Profile"],
        missing: [],
        description: "Supply of executive and standard office furniture for new regional office.",
        location: "Lagos, Lagos State",
        source: "CBN Portal",
        publishedAt: "2026-02-12",
      },
      {
        title: "Supply of Medical Equipment",
        organization: "Federal Medical Centre, Lokoja",
        budget: 120000000,
        deadline: "2026-03-10",
        category: "Healthcare",
        status: "partial" as const,
        requirements: ["CAC Certificate", "NAFDAC License", "Past Contracts"],
        missing: ["NAFDAC License"],
        description: "Supply of diagnostic and laboratory equipment for the new wing.",
        location: "Lokoja, Kogi State",
        source: "BPP Portal",
        publishedAt: "2026-02-13",
      },
      {
        title: "Road Rehabilitation Project",
        organization: "Kogi State Ministry of Works",
        budget: 450000000,
        deadline: "2026-03-15",
        category: "Construction",
        status: "qualified" as const,
        requirements: ["CAC Certificate", "Tax Clearance", "Equipment List", "Financial Statement"],
        missing: [],
        description: "Rehabilitation of 25km Lokoja-Okene road including drainage works.",
        location: "Kogi State",
        source: "State Tenders Board",
        publishedAt: "2026-02-13",
      },
      {
        title: "IT Training Services",
        organization: "NITDA",
        budget: 35000000,
        deadline: "2026-03-08",
        category: "ICT",
        status: "qualified" as const,
        requirements: ["CAC Certificate", "Training Center License", "Past Experience"],
        missing: [],
        description: "Training of 500 civil servants in digital literacy and cybersecurity.",
        location: "Abuja, FCT",
        source: "publicprocurement.ng",
        publishedAt: "2026-02-13",
      },
    ];

    for (const tender of tenders) {
      await ctx.db.insert("tenders", tender);
    }

    return { message: "Seeded successfully", count: tenders.length };
  },
});

// Clear all data (use with caution!)
export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const tables = ["tenders", "documents", "proposals", "userTenders"] as const;
    let total = 0;

    for (const table of tables) {
      const records = await ctx.db.query(table).collect();
      for (const record of records) {
        await ctx.db.delete(record._id);
        total++;
      }
    }

    return { message: "Cleared all data", count: total };
  },
});
