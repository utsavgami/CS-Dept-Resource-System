import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Uploads are accepted only if the file's own first bytes ("magic bytes") say
// it is a real JPG / PNG / WEBP / GIF (or PDF where allowed). The file name and
// type the browser sends are NOT trusted: the stored extension comes from the
// detected type, so an .html / .svg file renamed to .png is rejected, and an
// uploaded file can never be served as a web page.
//
// Files for `subfolder` land in backend/uploads/<subfolder>/<userId>_<time>_<random>.<ext>
function detectType(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png', mime: 'image/png' };
  const head6 = buf.subarray(0, 6).toString('latin1');
  if (head6 === 'GIF87a' || head6 === 'GIF89a') return { ext: 'gif', mime: 'image/gif' };
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return { ext: 'webp', mime: 'image/webp' };
  if (buf.subarray(0, 5).toString('latin1') === '%PDF-') return { ext: 'pdf', mime: 'application/pdf' };
  return null;
}

function createUploader(subfolder, { allowPdf = false } = {}) {
  const uploadDir = path.join(process.cwd(), 'uploads', subfolder);
  fs.mkdirSync(uploadDir, { recursive: true });

  const badTypeMessage = allowPdf
    ? 'Only JPG, PNG, WEBP, GIF, or PDF files are allowed'
    : 'Only JPG, PNG, WEBP, or GIF images are allowed';

  // Held in memory (max 5 MB) so nothing is written to disk until it passes the check.
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });

  const verifyAndSave = (req, res, next) => {
    const file = req.file;
    if (!file) return next();

    const type = detectType(file.buffer);
    if (!type || (type.ext === 'pdf' && !allowPdf)) {
      return next(new Error(badTypeMessage));
    }

    const prefix = String(req.user?._id || 'file').replace(/[^A-Za-z0-9_-]/g, '');
    const filename = `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${type.ext}`;

    fs.writeFile(path.join(uploadDir, filename), file.buffer, (err) => {
      if (err) return next(err);
      file.filename = filename;
      file.mimetype = type.mime;
      file.path = path.join(uploadDir, filename);
      delete file.buffer;
      next();
    });
  };

  // Same call shape as before: uploader.single('field') — now two middlewares
  // (multer parse, then verify+save). Express accepts the array as-is.
  return { single: (field) => [upload.single(field), verifyAndSave] };
}

export const avatarUpload = createUploader('avatars');
export const proofUpload = createUploader('complaint-proofs', { allowPdf: true });