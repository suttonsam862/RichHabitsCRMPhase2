import { createClient } from '@supabase/supabase-js';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

// Initialize Supabase client with service role for storage operations
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

const BUCKET_NAME = 'app'; // Use standardized app bucket

export async function ensureBucketExists() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);
  
  if (!bucketExists) {
    const { error } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml'],
      fileSizeLimit: 5242880, // 5MB
    });
    
    if (error) {
      throw new Error(`Failed to create bucket: ${error.message}`);
    }
  }
}

export async function uploadLogo(file: Express.Multer.File, orgId?: string): Promise<string> {
  if (!orgId) {
    throw new Error('Organization ID is required for logo upload');
  }
  
  await ensureBucketExists();
  
  const fileExt = file.originalname.split('.').pop();
  const fileName = `logo.${fileExt}`;
  const filePath = `org/${orgId}/branding/${fileName}`;
  
  const { error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });
    
  if (error) {
    throw new Error(`Failed to upload logo: ${error.message}`);
  }
  
  const { data: { publicUrl } } = supabaseAdmin.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);
    
  return publicUrl;
}

export { upload };