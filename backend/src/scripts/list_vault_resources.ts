import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import { Resource } from '../models/resource.model.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function check() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('No MONGODB_URI');
    await mongoose.connect(mongoUri);

    const resources = await Resource.find({});
    console.log('=== MONGO RESOURCES (' + resources.length + ') ===');
    for (const r of resources) {
      console.log(`- Title: "${r.title}"`);
      console.log(`  ID: ${r._id.toString()}`);
      console.log(`  department: "${r.department}"`);
      console.log(`  semester: "${r.semester}"`);
      console.log(`  category: "${r.category}"`);
      console.log(`  format: "${r.format}"`);
      console.log(`  downloadCount: ${r.downloadCount}, rating: ${r.rating}`);
      console.log(`  tags: ${JSON.stringify(r.tags)}`);
    }

  } catch (err: any) {
    console.error('ERROR:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

check();
