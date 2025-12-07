/**
 * @file src/seeds/skills.seed.js
 * @description Seed initial skills data
 */

const Skill = require("../models/Skill");
const { SKILL_CATEGORIES } = require("../config/constants");

/**
 * Generate slug from name (handles special cases)
 * @param {string} name
 * @returns {string}
 */
const generateSlug = (name) => {
  // Handle special cases first
  const specialCases = {
    "C++": "cpp",
    "C#": "csharp",
    "ASP.NET": "aspnet",
    "Vue.js": "vuejs",
    "Next.js": "nextjs",
    "Node.js": "nodejs",
    "CI/CD": "cicd",
    "REST API": "rest-api",
    "iOS Development": "ios-development",
  };

  if (specialCases[name]) {
    return specialCases[name];
  }

  return name
    .toLowerCase()
    .replace(/\./g, "") // Remove dots
    .replace(/\+/g, "plus") // Replace + with plus
    .replace(/#/g, "sharp") // Replace # with sharp
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with dash
    .replace(/^-|-$/g, ""); // Remove leading/trailing dashes
};

const initialSkills = [
  // Languages
  { name: "JavaScript", category: SKILL_CATEGORIES.LANGUAGE },
  { name: "TypeScript", category: SKILL_CATEGORIES.LANGUAGE },
  { name: "Python", category: SKILL_CATEGORIES.LANGUAGE },
  { name: "Java", category: SKILL_CATEGORIES.LANGUAGE },
  { name: "C++", category: SKILL_CATEGORIES.LANGUAGE },
  { name: "C#", category: SKILL_CATEGORIES.LANGUAGE },
  { name: "Go", category: SKILL_CATEGORIES.LANGUAGE },
  { name: "Rust", category: SKILL_CATEGORIES.LANGUAGE },
  { name: "Ruby", category: SKILL_CATEGORIES.LANGUAGE },
  { name: "PHP", category: SKILL_CATEGORIES.LANGUAGE },
  { name: "Swift", category: SKILL_CATEGORIES.LANGUAGE },
  { name: "Kotlin", category: SKILL_CATEGORIES.LANGUAGE },

  // Frontend
  { name: "React", category: SKILL_CATEGORIES.FRONTEND },
  { name: "Vue.js", category: SKILL_CATEGORIES.FRONTEND },
  { name: "Angular", category: SKILL_CATEGORIES.FRONTEND },
  { name: "Next.js", category: SKILL_CATEGORIES.FRONTEND },
  { name: "Svelte", category: SKILL_CATEGORIES.FRONTEND },
  { name: "HTML", category: SKILL_CATEGORIES.FRONTEND },
  { name: "CSS", category: SKILL_CATEGORIES.FRONTEND },
  { name: "Tailwind CSS", category: SKILL_CATEGORIES.FRONTEND },
  { name: "Bootstrap", category: SKILL_CATEGORIES.FRONTEND },
  { name: "Sass", category: SKILL_CATEGORIES.FRONTEND },
  { name: "Material UI", category: SKILL_CATEGORIES.FRONTEND },

  // Backend
  { name: "Node.js", category: SKILL_CATEGORIES.BACKEND },
  { name: "Express", category: SKILL_CATEGORIES.BACKEND },
  { name: "NestJS", category: SKILL_CATEGORIES.BACKEND },
  { name: "Django", category: SKILL_CATEGORIES.BACKEND },
  { name: "Flask", category: SKILL_CATEGORIES.BACKEND },
  { name: "FastAPI", category: SKILL_CATEGORIES.BACKEND },
  { name: "Spring Boot", category: SKILL_CATEGORIES.BACKEND },
  { name: "Ruby on Rails", category: SKILL_CATEGORIES.BACKEND },
  { name: "ASP.NET", category: SKILL_CATEGORIES.BACKEND },
  { name: "Laravel", category: SKILL_CATEGORIES.BACKEND },

  // Databases
  { name: "MongoDB", category: SKILL_CATEGORIES.DATABASE },
  { name: "PostgreSQL", category: SKILL_CATEGORIES.DATABASE },
  { name: "MySQL", category: SKILL_CATEGORIES.DATABASE },
  { name: "Redis", category: SKILL_CATEGORIES.DATABASE },
  { name: "Elasticsearch", category: SKILL_CATEGORIES.DATABASE },
  { name: "Firebase", category: SKILL_CATEGORIES.DATABASE },
  { name: "DynamoDB", category: SKILL_CATEGORIES.DATABASE },
  { name: "SQLite", category: SKILL_CATEGORIES.DATABASE },

  // DevOps
  { name: "AWS", category: SKILL_CATEGORIES.DEVOPS },
  { name: "Azure", category: SKILL_CATEGORIES.DEVOPS },
  { name: "GCP", category: SKILL_CATEGORIES.DEVOPS },
  { name: "Docker", category: SKILL_CATEGORIES.DEVOPS },
  { name: "Kubernetes", category: SKILL_CATEGORIES.DEVOPS },
  { name: "CI/CD", category: SKILL_CATEGORIES.DEVOPS },
  { name: "Jenkins", category: SKILL_CATEGORIES.DEVOPS },
  { name: "Terraform", category: SKILL_CATEGORIES.DEVOPS },
  { name: "Linux", category: SKILL_CATEGORIES.DEVOPS },
  { name: "Nginx", category: SKILL_CATEGORIES.DEVOPS },

  // Mobile
  { name: "React Native", category: SKILL_CATEGORIES.MOBILE },
  { name: "Flutter", category: SKILL_CATEGORIES.MOBILE },
  { name: "iOS Development", category: SKILL_CATEGORIES.MOBILE },
  { name: "Android Development", category: SKILL_CATEGORIES.MOBILE },

  // Tools
  { name: "Git", category: SKILL_CATEGORIES.TOOLS },
  { name: "GraphQL", category: SKILL_CATEGORIES.TOOLS },
  { name: "REST API", category: SKILL_CATEGORIES.TOOLS },
  { name: "Webpack", category: SKILL_CATEGORIES.TOOLS },
  { name: "Jest", category: SKILL_CATEGORIES.TOOLS },
  { name: "Postman", category: SKILL_CATEGORIES.TOOLS },

  // Soft Skills
  { name: "Agile", category: SKILL_CATEGORIES.SOFT_SKILL },
  { name: "Scrum", category: SKILL_CATEGORIES.SOFT_SKILL },
  { name: "Team Leadership", category: SKILL_CATEGORIES.SOFT_SKILL },
  { name: "Communication", category: SKILL_CATEGORIES.SOFT_SKILL },

  // Other
  { name: "Machine Learning", category: SKILL_CATEGORIES.OTHER },
  { name: "Data Science", category: SKILL_CATEGORIES.OTHER },
  { name: "Microservices", category: SKILL_CATEGORIES.OTHER },
  { name: "System Design", category: SKILL_CATEGORIES.OTHER },
];

const seedSkills = async () => {
  console.log("🔧 Seeding skills...");

  try {
    // Clear existing skills first (to handle partial inserts from failed runs)
    const existingCount = await Skill.countDocuments();

    if (existingCount > 0 && existingCount < initialSkills.length) {
      console.log(
        `   Found ${existingCount} partial skills. Clearing and reseeding...`
      );
      await Skill.deleteMany({});
    } else if (existingCount >= initialSkills.length) {
      console.log(
        `   Skills already seeded (${existingCount} found). Skipping.`
      );
      return;
    }

    // Add slug to each skill before inserting
    const skillsWithSlug = initialSkills.map((skill) => ({
      ...skill,
      slug: generateSlug(skill.name),
    }));

    // Verify no duplicate slugs
    const slugs = skillsWithSlug.map((s) => s.slug);
    const uniqueSlugs = new Set(slugs);
    if (slugs.length !== uniqueSlugs.size) {
      const duplicates = slugs.filter(
        (slug, index) => slugs.indexOf(slug) !== index
      );
      throw new Error(`Duplicate slugs found: ${duplicates.join(", ")}`);
    }

    // Insert skills
    const skills = await Skill.insertMany(skillsWithSlug);
    console.log(`   ✅ Seeded ${skills.length} skills`);

    // Show summary
    const grouped = await Skill.getGroupedByCategory();
    console.log("   Skills by category:");
    Object.entries(grouped).forEach(([category, skillList]) => {
      console.log(`      ${category}: ${skillList.length}`);
    });
  } catch (error) {
    console.error("   ❌ Error seeding skills:", error.message);
    throw error;
  }
};

module.exports = seedSkills;
