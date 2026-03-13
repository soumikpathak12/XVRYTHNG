import db from '../src/config/db.js';

async function run() {
  try {
    await db.execute('ALTER TABLE retailer_projects ADD COLUMN expected_completion_date DATE DEFAULT NULL');
    console.log('Successfully added expected_completion_date to retailer_projects');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Column already exists.');
    } else {
      console.error('Error:', err);
    }
  } finally {
    process.exit(0);
  }
}

run();
