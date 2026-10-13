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
    console.log('RESOURCES COUNT:', resources.length);
    for (const r of resources) {
      console.log('ID:', r._id.toString());
      console.log('Title:', r.title);
      console.log('fileUrl:', r.fileUrl);
      console.log('fileName:', r.fileName);
      console.log('fileType:', r.fileType);
      console.log('communityId:', r.communityId);
      
      const uploadDir = process.env.UPLOAD_DIR || 'uploads';
      // Strip leading slash if any
      const relativePath = r.fileUrl.startsWith('/') ? r.fileUrl.slice(1) : r.fileUrl;
      const fullDiskPath = path.resolve(process.cwd(), relativePath);
      const existsOnDisk = fs.existsSync(fullDiskPath);
      console.log('Full Disk Path:', fullDiskPath);
      console.log('Exists on Disk:', existsOnDisk);
      console.log('------------------------------------');
    }

    // Also list everything in uploads directory recursively
    const uploadsRoot = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
    console.log('UPLOADS_ROOT:', uploadsRoot);
    if (fs.existsSync(uploadsRoot)) {
      const listFiles = (dir: string): string[] => {
        let results: string[] = [];
        const list = fs.readdirSync(dir);
        list.forEach((file) => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);
          if (stat && stat.isDirectory()) {
            results = results.concat(listFiles(filePath));
          } else {
            results.push(filePath);
          }
        });
        return results;
      };
      console.log('PHYSICAL FILES IN UPLOADS:');
      console.log(listFiles(uploadsRoot));
    } else {
      console.log('UPLOADS_ROOT DOES NOT EXIST!');
    }

  } catch (err: any) {
    console.error('ERROR:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

check();
