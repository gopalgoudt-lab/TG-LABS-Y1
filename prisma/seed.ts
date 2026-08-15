import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const tests = [
  { slug: 'hba1c', name: 'HbA1c', description: 'Average blood glucose over the previous 2–3 months.', price: 350 },
  { slug: 'cbc', name: 'CBC', description: 'Complete blood count profile.', price: 300 },
  { slug: 'thyroid-profile', name: 'Thyroid Profile', description: 'Core thyroid function markers.', price: 450 },
  { slug: 'vitamin-d', name: 'Vitamin D', description: '25-OH Vitamin D assessment.', price: 700 },
  { slug: 'lipid-profile', name: 'Lipid Profile', description: 'Cholesterol and triglyceride assessment.', price: 550 },
  { slug: 'liver-function-test', name: 'Liver Function Test', description: 'Routine liver function markers.', price: 650 },
];

async function main() {
  for (const test of tests) {
    await prisma.diagnosticTest.upsert({
      where: { slug: test.slug },
      update: test,
      create: test,
    });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
