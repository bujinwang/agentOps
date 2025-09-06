const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authenticate } = require('../middleware/auth');
const { ERROR_MESSAGES } = require('../config/constants');
const { logger } = require('../config/logger');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only images, documents, and spreadsheets are allowed'));
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

// Upload file
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please select a file to upload'
      });
    }

    const userId = req.user.user_id;
    const fileType = req.body.type || 'document';
    const file = req.file;

    // Validate file type
    const allowedTypes = ['avatar', 'document'];
    if (!allowedTypes.includes(fileType)) {
      // Clean up uploaded file
      await fs.unlink(file.path).catch(() => {});
      return res.status(400).json({
        error: 'Invalid file type',
        message: 'File type must be avatar or document'
      });
    }

    // Generate file URL
    const fileUrl = `/uploads/${path.basename(file.path)}`;
    
    logger.info(`File uploaded: ${file.originalname} by user ${userId}`);

    res.json({
      message: 'File uploaded successfully',
      data: {
        url: fileUrl,
        filename: file.filename,
        originalName: file.originalname,
        size: file.size,
        type: fileType,
        uploadedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error uploading file:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && req.file.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File too large',
          message: 'File size must be less than 10MB'
        });
      }
    }

    res.status(500).json({
      error: 'Failed to upload file',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

// Get uploaded files (list)
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const uploadDir = path.join(__dirname, '../../uploads');
    
    // Get list of files in upload directory
    const files = await fs.readdir(uploadDir);
    
    // Filter files and get their stats
    const fileList = await Promise.all(
      files.map(async (filename) => {
        const filePath = path.join(uploadDir, filename);
        const stats = await fs.stat(filePath);
        
        return {
          filename: filename,
          url: `/uploads/${filename}`,
          size: stats.size,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        };
      })
    );

    // Sort by creation date (newest first)
    fileList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      message: 'Files retrieved successfully',
      data: fileList
    });
  } catch (error) {
    logger.error('Error getting files:', error);
    res.status(500).json({
      error: 'Failed to get files',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

// Delete file
router.delete('/:filename', authenticate, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const filename = req.params.filename;
    
    // Validate filename to prevent directory traversal
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({
        error: 'Invalid filename',
        message: 'Filename contains invalid characters'
      });
    }

    const uploadDir = path.join(__dirname, '../../uploads');
    const filePath = path.join(uploadDir, filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({
        error: 'File not found',
        message: 'The specified file does not exist'
      });
    }

    // Delete the file
    await fs.unlink(filePath);

    logger.info(`File deleted: ${filename} by user ${userId}`);

    res.json({
      message: 'File deleted successfully',
      data: {
        filename: filename
      }
    });
  } catch (error) {
    logger.error('Error deleting file:', error);
    res.status(500).json({
      error: 'Failed to delete file',
      message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR
    });
  }
});

// Serve uploaded files (static files)
router.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

module.exports = router;