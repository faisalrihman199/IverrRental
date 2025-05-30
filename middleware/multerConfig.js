// middleware/multerConfig.js
const multer = require("multer");
const path  = require("path");
const fs    = require("fs");

// categorize fields
const USER_DOC_FIELDS    = ["cnicOrPassport","drivingLicense","companyDoc"];
const CAR_DOC_FIELDS     = ["grayCard","controlTechniqueFiles","assuranceFiles"];
const BOOKING_DOC_FIELDS = ["carPickDocs","personPickDocs","carDropDocs","personDropDocs"];

const getStorage = (folder) => multer.diskStorage({
  destination: (req, file, cb) => {
    let target = folder;
    if (USER_DOC_FIELDS.includes(file.fieldname)) {
      target = "userDocs";
    } else if (CAR_DOC_FIELDS.includes(file.fieldname)) {
      target = "carDocs";
    } else if (BOOKING_DOC_FIELDS.includes(file.fieldname)) {
      target = "bookingDocs";
    }

    const uploadPath = path.join(__dirname, `../public/uploads/${target}`);
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const suffix = `${Date.now()}-${Math.round(Math.random()*1e9)}`;
    cb(null, suffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // allow images, docs, csv, pdf, video
  const allowed = [
    "image/jpeg","image/png","image/gif","image/webp",
    "text/plain","text/csv","application/pdf",
    "application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "video/mp4","video/x-msvideo","video/mpeg","video/quicktime"
  ];
  cb(allowed.includes(file.mimetype) ? null : new Error(`Unsupported file type: ${file.mimetype}`),
     allowed.includes(file.mimetype));
};

module.exports = (folder) => multer({
  storage: getStorage(folder),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});
