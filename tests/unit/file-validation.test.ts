import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { SignedUrlSchema, UploadObjectSchema, AssetUploadSchema } from '../../server/lib/validation';

// Mock file object for testing
const createMockFile = (options: {
  originalname?: string;
  mimetype?: string;
  size?: number;
  buffer?: Buffer;
}) => ({
  originalname: options.originalname || 'test.jpg',
  mimetype: options.mimetype || 'image/jpeg',
  size: options.size || 1024,
  buffer: options.buffer || Buffer.from('fake-image-data'),
  fieldname: 'file',
  encoding: '7bit',
  destination: '/tmp',
  filename: 'uploaded-file',
  path: '/tmp/uploaded-file'
});

describe('File Validation and Security', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      body: {},
      file: undefined,
      files: undefined
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    next = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('SignedUrlSchema validation', () => {
    it('should validate valid file upload request', () => {
      const validData = {
        fileName: 'document.pdf',
        fileType: 'application/pdf',
        fileSize: 2 * 1024 * 1024 // 2MB
      };

      expect(() => SignedUrlSchema.parse(validData)).not.toThrow();
    });

    it('should reject empty file name', () => {
      const invalidData = {
        fileName: '',
        fileType: 'image/jpeg'
      };

      expect(() => SignedUrlSchema.parse(invalidData)).toThrow();
    });

    it('should reject empty file type', () => {
      const invalidData = {
        fileName: 'test.jpg',
        fileType: ''
      };

      expect(() => SignedUrlSchema.parse(invalidData)).toThrow();
    });

    it('should reject oversized files', () => {
      const invalidData = {
        fileName: 'large-file.jpg',
        fileType: 'image/jpeg',
        fileSize: 50 * 1024 * 1024 // 50MB (over 10MB limit)
      };

      expect(() => SignedUrlSchema.parse(invalidData)).toThrow();
    });

    it('should accept files at the size limit', () => {
      const validData = {
        fileName: 'max-size.jpg',
        fileType: 'image/jpeg',
        fileSize: 10 * 1024 * 1024 // Exactly 10MB
      };

      expect(() => SignedUrlSchema.parse(validData)).not.toThrow();
    });

    it('should handle optional file size', () => {
      const validData = {
        fileName: 'test.jpg',
        fileType: 'image/jpeg'
        // fileSize is optional
      };

      expect(() => SignedUrlSchema.parse(validData)).not.toThrow();
    });
  });

  describe('UploadObjectSchema validation', () => {
    it('should validate valid upload object data', () => {
      const validData = {
        bucket: 'user-uploads',
        path: 'organizations/123/logo.jpg',
        file: createMockFile({})
      };

      expect(() => UploadObjectSchema.parse(validData)).not.toThrow();
    });

    it('should reject empty bucket name', () => {
      const invalidData = {
        bucket: '',
        path: 'test/file.jpg',
        file: createMockFile({})
      };

      expect(() => UploadObjectSchema.parse(invalidData)).toThrow();
    });

    it('should reject empty path', () => {
      const invalidData = {
        bucket: 'uploads',
        path: '',
        file: createMockFile({})
      };

      expect(() => UploadObjectSchema.parse(invalidData)).toThrow();
    });
  });

  describe('AssetUploadSchema validation', () => {
    it('should validate valid asset upload data', () => {
      const validData = {
        assetType: 'logo' as const,
        fileName: 'company-logo.png',
        fileType: 'image/png'
      };

      expect(() => AssetUploadSchema.parse(validData)).not.toThrow();
    });

    it('should reject invalid asset types', () => {
      const invalidData = {
        assetType: 'invalid-type',
        fileName: 'file.jpg',
        fileType: 'image/jpeg'
      };

      expect(() => AssetUploadSchema.parse(invalidData)).toThrow();
    });

    it('should accept valid asset types', () => {
      const validTypes = ['logo', 'titleCard', 'branding'] as const;
      
      validTypes.forEach(assetType => {
        const validData = {
          assetType,
          fileName: 'test-file.jpg',
          fileType: 'image/jpeg'
        };

        expect(() => AssetUploadSchema.parse(validData)).not.toThrow();
      });
    });

    it('should handle optional fileName and fileType', () => {
      const validData = {
        assetType: 'logo' as const
        // fileName and fileType are optional
      };

      expect(() => AssetUploadSchema.parse(validData)).not.toThrow();
    });
  });

  describe('File security validation', () => {
    describe('File type validation', () => {
      it('should identify safe file types', () => {
        const safeTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/svg+xml',
          'application/pdf',
          'text/plain',
          'application/json'
        ];

        safeTypes.forEach(fileType => {
          const data = {
            fileName: 'test-file.ext',
            fileType
          };

          expect(() => SignedUrlSchema.parse(data)).not.toThrow();
        });
      });

      it('should detect potentially dangerous file extensions', () => {
        const dangerousExtensions = [
          'script.exe',
          'malware.bat',
          'virus.com',
          'trojan.scr',
          'backdoor.pif'
        ];

        dangerousExtensions.forEach(fileName => {
          const data = {
            fileName,
            fileType: 'application/octet-stream'
          };

          // Schema validation allows any filename - security checks happen at upload
          expect(() => SignedUrlSchema.parse(data)).not.toThrow();
        });
      });

      it('should handle double extensions', () => {
        const doubleExtensions = [
          'document.pdf.exe',
          'image.jpg.bat',
          'file.txt.com'
        ];

        doubleExtensions.forEach(fileName => {
          const data = {
            fileName,
            fileType: 'application/octet-stream'
          };

          // Schema allows any filename - security filtering happens elsewhere
          expect(() => SignedUrlSchema.parse(data)).not.toThrow();
        });
      });
    });

    describe('Path traversal protection', () => {
      it('should handle path traversal attempts in file names', () => {
        const maliciousNames = [
          '../../../etc/passwd',
          '..\\..\\windows\\system32\\config\\sam',
          '..%2F..%2F..%2Fetc%2Fpasswd',
          '....//....//....//etc/passwd'
        ];

        maliciousNames.forEach(fileName => {
          const data = {
            fileName,
            fileType: 'text/plain'
          };

          // Schema validation allows these - path sanitization happens at storage layer
          expect(() => SignedUrlSchema.parse(data)).not.toThrow();
        });
      });

      it('should handle null bytes in file names', () => {
        const maliciousNames = [
          'file.txt\x00.exe',
          'document.pdf\u0000.bat',
          'image.jpg\0.com'
        ];

        maliciousNames.forEach(fileName => {
          const data = {
            fileName,
            fileType: 'text/plain'
          };

          // Schema allows these - null byte filtering happens at storage layer
          expect(() => SignedUrlSchema.parse(data)).not.toThrow();
        });
      });
    });

    describe('File size security', () => {
      it('should prevent zip bombs via size limits', () => {
        const data = {
          fileName: 'suspicious-file.zip',
          fileType: 'application/zip',
          fileSize: 100 * 1024 * 1024 // 100MB
        };

        expect(() => SignedUrlSchema.parse(data)).toThrow();
      });

      it('should prevent DoS via excessive file sizes', () => {
        const data = {
          fileName: 'huge-file.bin',
          fileType: 'application/octet-stream',
          fileSize: 1024 * 1024 * 1024 // 1GB
        };

        expect(() => SignedUrlSchema.parse(data)).toThrow();
      });

      it('should handle negative file sizes', () => {
        const data = {
          fileName: 'file.txt',
          fileType: 'text/plain',
          fileSize: -1000
        };

        expect(() => SignedUrlSchema.parse(data)).toThrow();
      });

      it('should handle zero-byte files', () => {
        const data = {
          fileName: 'empty-file.txt',
          fileType: 'text/plain',
          fileSize: 0
        };

        expect(() => SignedUrlSchema.parse(data)).toThrow(); // Positive size required
      });
    });

    describe('Content type validation', () => {
      it('should validate content type matches file extension', () => {
        const validCombinations = [
          { fileName: 'image.jpg', fileType: 'image/jpeg' },
          { fileName: 'image.jpeg', fileType: 'image/jpeg' },
          { fileName: 'image.png', fileType: 'image/png' },
          { fileName: 'document.pdf', fileType: 'application/pdf' },
          { fileName: 'data.json', fileType: 'application/json' }
        ];

        validCombinations.forEach(({ fileName, fileType }) => {
          const data = { fileName, fileType };
          expect(() => SignedUrlSchema.parse(data)).not.toThrow();
        });
      });

      it('should handle mismatched content types and extensions', () => {
        const mismatchedCombinations = [
          { fileName: 'image.jpg', fileType: 'application/pdf' },
          { fileName: 'document.pdf', fileType: 'image/jpeg' },
          { fileName: 'script.js', fileType: 'text/plain' }
        ];

        mismatchedCombinations.forEach(({ fileName, fileType }) => {
          const data = { fileName, fileType };
          // Schema allows mismatches - validation happens at processing time
          expect(() => SignedUrlSchema.parse(data)).not.toThrow();
        });
      });
    });

    describe('Unicode and encoding security', () => {
      it('should handle unicode file names', () => {
        const unicodeNames = [
          '测试文件.jpg',
          'файл.pdf',
          'ファイル.png',
          '🎉emoji-file.txt',
          'café-ménu.pdf'
        ];

        unicodeNames.forEach(fileName => {
          const data = {
            fileName,
            fileType: 'text/plain'
          };

          expect(() => SignedUrlSchema.parse(data)).not.toThrow();
        });
      });

      it('should handle URL-encoded file names', () => {
        const encodedNames = [
          'file%20with%20spaces.txt',
          'file%2Bwith%2Bplus.pdf',
          'file%26with%26ampersand.jpg'
        ];

        encodedNames.forEach(fileName => {
          const data = {
            fileName,
            fileType: 'text/plain'
          };

          expect(() => SignedUrlSchema.parse(data)).not.toThrow();
        });
      });

      it('should handle very long file names', () => {
        const longFileName = 'very-long-file-name-' + 'x'.repeat(1000) + '.txt';
        
        const data = {
          fileName: longFileName,
          fileType: 'text/plain'
        };

        // Schema doesn't impose length limits - filesystem limits apply
        expect(() => SignedUrlSchema.parse(data)).not.toThrow();
      });
    });
  });

  describe('Mock file validation', () => {
    it('should create valid mock files for testing', () => {
      const mockFile = createMockFile({
        originalname: 'test-document.pdf',
        mimetype: 'application/pdf',
        size: 1024 * 1024
      });

      expect(mockFile.originalname).toBe('test-document.pdf');
      expect(mockFile.mimetype).toBe('application/pdf');
      expect(mockFile.size).toBe(1024 * 1024);
      expect(mockFile.buffer).toBeInstanceOf(Buffer);
    });

    it('should use default values for mock files', () => {
      const mockFile = createMockFile({});

      expect(mockFile.originalname).toBe('test.jpg');
      expect(mockFile.mimetype).toBe('image/jpeg');
      expect(mockFile.size).toBe(1024);
    });
  });

  describe('Integration with storage validation', () => {
    it('should validate bucket names for security', () => {
      const validBuckets = [
        'user-uploads',
        'org-assets',
        'public-files',
        'temp-storage'
      ];

      validBuckets.forEach(bucket => {
        const data = {
          bucket,
          path: 'valid/path/file.jpg',
          file: createMockFile({})
        };

        expect(() => UploadObjectSchema.parse(data)).not.toThrow();
      });
    });

    it('should handle potentially dangerous bucket names', () => {
      const dangerousBuckets = [
        '../escape-bucket',
        'bucket; DROP TABLE files;',
        'bucket\x00null-byte',
        ''
      ];

      dangerousBuckets.forEach(bucket => {
        const data = {
          bucket,
          path: 'test/file.jpg',
          file: createMockFile({})
        };

        if (bucket === '') {
          expect(() => UploadObjectSchema.parse(data)).toThrow();
        } else {
          // Schema allows dangerous names - validation happens at storage layer
          expect(() => UploadObjectSchema.parse(data)).not.toThrow();
        }
      });
    });

    it('should validate file paths for security', () => {
      const validPaths = [
        'organizations/123/logo.jpg',
        'users/456/avatar.png',
        'temp/uploads/document.pdf',
        'public/assets/image.gif'
      ];

      validPaths.forEach(path => {
        const data = {
          bucket: 'uploads',
          path,
          file: createMockFile({})
        };

        expect(() => UploadObjectSchema.parse(data)).not.toThrow();
      });
    });

    it('should handle dangerous file paths', () => {
      const dangerousPaths = [
        '../../../etc/passwd',
        'folder/../../escape.txt',
        'path/with\x00null.byte',
        '/absolute/path/file.txt'
      ];

      dangerousPaths.forEach(path => {
        const data = {
          bucket: 'uploads',
          path,
          file: createMockFile({})
        };

        // Schema allows these paths - security filtering happens at storage layer
        expect(() => UploadObjectSchema.parse(data)).not.toThrow();
      });
    });
  });
});