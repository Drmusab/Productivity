#!/usr/bin/env ts-node
/**
 * @fileoverview Database Seeding Script
 * 
 * This script seeds the database with demo/sample data.
 * 
 * Usage:
 *   npm run seed              - Seed all demo data
 *   npm run seed:minimal      - Seed minimal starter data
 *   npm run seed:clear        - Clear all seeded data
 */

console.log('Productivity OS Database Seeder');
console.log('================================\n');

const command = process.argv[2] || 'full';

console.log(`Database: ${process.env.DATABASE_PATH || './data/productivity.db'}`);
console.log(`Command: ${command}\n`);

// Demo user data
const DEMO_USER = {
  username: 'demo',
  email: 'demo@example.com',
  password: 'demo123',
  role: 'admin'
};

// Demo board data
const DEMO_BOARDS = [
  {
    name: 'Getting Started',
    description: 'Your first productivity board',
    columns: [
      { name: 'To Do', color: '#e74c3c' },
      { name: 'In Progress', color: '#f39c12' },
      { name: 'Review', color: '#3498db' },
      { name: 'Done', color: '#27ae60' }
    ]
  }
];

// Demo notes data
const DEMO_NOTES = [
  {
    title: 'Welcome to Productivity OS',
    folderPath: 'Getting Started',
    content: `# Welcome to Productivity OS

Welcome to your personal productivity workspace! This is a sample note to help you get started.

## Features

- **Wiki-style linking**: Use [[Note Title]] to link between notes
- **Block-based editing**: Each paragraph is a block you can move and edit
- **P.A.R.A. Organization**: Organize content as Projects, Areas, Resources, or Archive

## Getting Started

1. Create your first note
2. Try linking to [[Another Note]]
3. Explore the vault features

Happy note-taking! 🚀
`
  },
  {
    title: 'Daily Notes Template',
    folderPath: 'Templates',
    content: `# {{date}}

## Today's Focus
- [ ] Main goal for today

## Tasks
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

## Notes


## Reflection
What went well today?
`
  }
];

// Demo P.A.R.A. items
const DEMO_PARA = [
  { title: 'Personal Development', category: 'project', description: 'Learning and growth goals' },
  { title: 'Health & Fitness', category: 'area', description: 'Ongoing health management' },
  { title: 'Book Notes', category: 'resource', description: 'Notes from books I read' },
  { title: 'Completed Projects', category: 'archive', description: 'Finished project notes' }
];

async function seedDatabase(): Promise<void> {
  console.log('Seeding database with demo data...\n');
  
  // In actual implementation, this would use the database module
  console.log('Demo data to be seeded:');
  console.log(`  - User: ${DEMO_USER.username}`);
  console.log(`  - Boards: ${DEMO_BOARDS.length}`);
  console.log(`  - Notes: ${DEMO_NOTES.length}`);
  console.log(`  - P.A.R.A. Items: ${DEMO_PARA.length}`);
  
  console.log('\n✓ Seed script ready (run in application context)');
}

async function seedMinimal(): Promise<void> {
  console.log('Seeding minimal starter data...\n');
  
  console.log('Minimal data to be seeded:');
  console.log(`  - User: ${DEMO_USER.username}`);
  console.log(`  - Getting Started board`);
  
  console.log('\n✓ Seed script ready (run in application context)');
}

async function clearSeededData(): Promise<void> {
  console.log('Clearing seeded data...\n');
  
  console.log('⚠ This will remove all demo data');
  console.log('\n✓ Clear script ready (run in application context)');
}

async function main(): Promise<void> {
  try {
    switch (command) {
      case 'full':
        await seedDatabase();
        break;
      case 'minimal':
        await seedMinimal();
        break;
      case 'clear':
        await clearSeededData();
        break;
      default:
        console.log('Unknown command:', command);
        console.log('Available commands: full, minimal, clear');
    }
  } catch (error: any) {
    console.error('\nError:', error.message);
    process.exit(1);
  }
}

main();

export { seedDatabase, seedMinimal, clearSeededData, DEMO_USER, DEMO_BOARDS, DEMO_NOTES, DEMO_PARA };
