import multer from 'multer';
import fs from 'fs';
import path from 'path';

// Uploaded avatars land in backend/uploads/avatars, served statically by
// server.js at /uploads/avatars/<filename>.
const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${req.user._id}_${Date.now()}${ext}`);
  }
});

function imageOnlyFilter(req, file, cb) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error('Only JPG, PNG, WEBP, or GIF images are allowed'));
  }
  cb(null, true);
}

export const avatarUpload = multer({
  storage,
  fileFilter: imageOnlyFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});