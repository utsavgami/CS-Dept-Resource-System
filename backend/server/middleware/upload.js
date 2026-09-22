import multer from 'multer';
import fs from 'fs';
import path from 'path';

// Generic uploader factory: files for `subfolder` land in
// backend/uploads/<subfolder>/, served statically by server.js at
// /uploads/<subfolder>/<filename>.
function createUploader(subfolder, { allowPdf = false } = {}) {
  const uploadDir = path.join(process.cwd(), 'uploads', subfolder);
  fs.mkdirSync(uploadDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const prefix = req.user?._id || 'file';
      cb(null, `${prefix}_${Date.now()}${ext}`);
    }
  });

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowPdf) allowedTypes.push('application/pdf');

  function fileFilter(req, file, cb) {
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error(allowPdf ? 'Only JPG, PNG, WEBP, GIF, or PDF files are allowed' : 'Only JPG, PNG, WEBP, or GIF images are allowed'));
    }
    cb(null, true);
  }

  return multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB
}

export const avatarUpload = createUploader('avatars');
export const proofUpload = createUploader('complaint-proofs', { allowPdf: true });