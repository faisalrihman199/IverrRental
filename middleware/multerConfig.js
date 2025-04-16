// middleware/multerConfig.js
const multer = require("multer");
const path  = require("path");
const fs    = require("fs");

// which fields we treat as “docs”:
const DOC_FIELDS = ["cnicOrPassport","drivingLicense","companyDoc"];

const getStorage = (folder) => multer.diskStorage({
  destination: (req, file, cb) => {
    // override the target folder for document uploads:
    const targetFolder = DOC_FIELDS.includes(file.fieldname)
      ? "userDocs"
      : folder;

    const uploadPath = path.join(__dirname, `../public/uploads/${targetFolder}`);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// your existing fileFilter + limits stay the same
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, and GIF files are allowed"), false);
  }
};

const upload = (folder) => multer({
  storage: getStorage(folder),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = upload;
