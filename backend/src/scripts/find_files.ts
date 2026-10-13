import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function search() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('No MONGODB_URI');
    await mongoose.connect(mongoUri);

    console.log('=== CHECKING MONGO GRIDFS ===');
    const db = mongoose.connection.db;
    if (db) {
      const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });
      const gridFsFiles = await bucket.find({}).toArray();
      console.log('GRIDFS FILES COUNT:', gridFsFiles.length);
      for (const gf of gridFsFiles) {
        console.log(`- GridFS filename: "${gf.filename}", length: ${gf.length}, contentType: ${gf.contentType}`);
      }
    }

    console.log('\n=== RECURSIVE SEARCH IN UPLOADS DIR AND ENTIRE REPO ===');
    const rootDir = path.resolve(process.cwd(), '..');
    
    function searchFiles(dir: string, depth = 0) {
      if (depth > 5) return;
      try {
        const list = fs.readdirSync(dir);
        for (const file of list) {
          if (file === 'node_modules' || file === '.git' || file === 'dist' || file === '.cache') continue;
          const fullPath = path.join(dir, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            searchFiles(fullPath, depth + 1);
          } else {
            if (file.toLowerCase().includes('docx') || file.toLowerCase().includes('pptx') || file.toLowerCase().includes('cns') || file.includes('09602ce7') || file.includes('cbcb6bde') || file.includes('d9999a82')) {
              console.log('FOUND MATCHING FILE:', fullPath, 'size:', stat.size);
            }
          }
        }
      } catch (err) {}
    }

    searchFiles(rootDir);

  } catch (err: any) {
    console.error('ERROR:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

search();
