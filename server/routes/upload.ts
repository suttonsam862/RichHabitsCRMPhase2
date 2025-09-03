import express from 'express';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Initialize Supabase client with service role for storage operations
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 4 * 1024 * 1024, // 4MB limit per spec
  },
  fileFilter: (req, file, cb) => {
    // Strict allowlist: PNG, JPEG, JPG, SVG only (per requirements)
    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    const allowedExtensions = ['png', 'jpg', 'jpeg', 'svg'];
    
    const fileExt = file.originalname.split('.').pop()?.toLowerCase();
    
    if (allowedMimeTypes.includes(file.mimetype) && fileExt && allowedExtensions.includes(fileExt)) {
      cb(null, true);
    } else {
      const error = new Error(`Invalid file type. Only PNG, JPG/JPEG, and SVG files are allowed. Received: ${file.mimetype} (${fileExt})`);
      error.name = 'INVALID_FILE_TYPE';
      cb(error);
    }
  },
});

const BUCKET_NAME = 'org-logos';

// Test endpoint to verify route is working
router.get('/test', (req, res) => {
  res.json({ message: 'Upload route is working', timestamp: new Date().toISOString() });
});

// Ensure the logos bucket exists
async function ensureBucketExists() {
  try {
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      throw listError;
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);
    
    if (!bucketExists) {
      console.log(`Creating bucket: ${BUCKET_NAME}`);
      const { error: createError } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'],
        fileSizeLimit: 4194304, // 4MB per spec
      });
      
      if (createError) {
        console.error('Failed to create bucket:', createError);
        throw new Error(`Failed to create bucket: ${createError.message}`);
      }
      
      console.log(`✅ Bucket ${BUCKET_NAME} created successfully`);
    } else {
      console.log(`✅ Bucket ${BUCKET_NAME} already exists`);
    }
  } catch (error) {
    console.error('Error ensuring bucket exists:', error);
    throw error;
  }
}

// POST /api/upload/logo
router.post('/logo', upload.single('file'), async (req, res) => {
  console.log('🔍 Logo upload request received:', {
    hasFile: !!req.file,
    fileName: req.file?.originalname,
    fileSize: req.file?.size,
    mimeType: req.file?.mimetype
  });

  try {
    if (!req.file) {
      console.error('❌ No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Ensure bucket exists
    console.log('🪣 Ensuring bucket exists...');
    await ensureBucketExists();

    // Get file extension from original name or default to .png
    const originalName = req.file.originalname || 'upload.png';
    const fileExt = originalName.split('.').pop() || 'png';
    
    // Generate unique filename
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `org-logos/${fileName}`;

    // Determine content type
    let contentType = req.file.mimetype;
    if (fileExt.toLowerCase() === 'svg' && contentType !== 'image/svg+xml') {
      contentType = 'image/svg+xml';
    }

    // Upload to Supabase Storage
    console.log('☁️ Uploading to Supabase:', { filePath, contentType, size: req.file.buffer.length });
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, req.file.buffer, {
        contentType,
        upsert: false, // Don't overwrite existing files
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      return res.status(500).json({ 
        error: 'Failed to upload file', 
        details: uploadError.message 
      });
    }

    // Get public URL for the uploaded file
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    console.log('✅ Upload successful:', { filePath, publicUrl });

    // Return success response with consistent JSON format
    res.status(200).json({
      success: true,
      path: filePath,
      url: publicUrl,
      contentType
    });

  } catch (error: any) {
    console.error('❌ Logo upload error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    });
    
    // Handle specific multer errors with fieldErrors format
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false,
        error: 'File too large. Maximum size is 4MB.',
        fieldErrors: { 
          file: 'File too large. Maximum size is 4MB.' 
        }
      });
    }
    
    if (error.message && error.message.includes('Only PNG')) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid file type. Only PNG, JPEG, WebP, and SVG files are allowed.',
        fieldErrors: { 
          file: 'Invalid file type. Only PNG, JPEG, WebP, and SVG files are allowed.' 
        }
      });
    }

    // Generic error response
    res.status(500).json({ 
      success: false,
      error: 'Failed to upload logo', 
      message: error.message,
      details: error.message 
    });
  }
});

export default router;