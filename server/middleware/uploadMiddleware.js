const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Allowed MIME types and extensions
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf'];

// Configure disk storage with safe unique filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const randomHex = crypto.randomBytes(8).toString('hex');
    const safeName = `evidence-${Date.now()}-${randomHex}${ext}`;
    cb(null, safeName);
  },
});

// File filter for format validation
const fileFilter = (req, file, cb) => {
  // Check for null bytes or path traversal characters in originalname
  if (!file.originalname || file.originalname.includes('\0') || file.originalname.includes('..')) {
    const err = new Error('Invalid or suspicious filename.');
    err.statusCode = 400;
    return cb(err, false);
  }

  const rawExt = path.extname(file.originalname).toLowerCase();
  const isMimeAllowed = ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase());
  const isExtAllowed = ALLOWED_EXTENSIONS.includes(rawExt);

  // Prevent dangerous double extensions (e.g., shell.php.jpg or script.exe.pdf)
  const baseNameWithoutExt = path.basename(file.originalname, rawExt).toLowerCase();
  const dangerousInnerExtensions = ['.php', '.exe', '.sh', '.bat', '.cmd', '.js', '.vbs', '.py', '.pl', '.jsp', '.asp', '.aspx', '.cgi', '.html', '.htm'];
  const hasDangerousInnerExt = dangerousInnerExtensions.some((dExt) => baseNameWithoutExt.endsWith(dExt));

  if (hasDangerousInnerExt) {
    const err = new Error('Executable, script, and web-active file extensions are strictly forbidden.');
    err.statusCode = 400;
    return cb(err, false);
  }

  if (isMimeAllowed && isExtAllowed) {
    return cb(null, true);
  }

  const error = new Error(
    `Invalid file format (${rawExt || 'unknown'}). Only JPG, JPEG, PNG, and PDF files are allowed.`
  );
  error.statusCode = 400;
  cb(error, false);
};

// Multer upload instance with 5MB limit
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

/**
 * Middleware wrapper to catch Multer errors and format clean JSON responses
 * @param {string} fieldName
 */
const uploadSingle = (fieldName = 'attachment') => {
  return (req, res, next) => {
    const uploader = upload.single(fieldName);

    uploader(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            status: 'error',
            message: 'File is too large. Maximum allowed file size is 5MB.',
          });
        }
        return res.status(400).json({
          status: 'error',
          message: `Upload error: ${err.message}`,
        });
      } else if (err) {
        return res.status(err.statusCode || 400).json({
          status: 'error',
          message: err.message || 'File upload failed.',
        });
      }
      next();
    });
  };
};

module.exports = {
  upload,
  uploadSingle,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
};
