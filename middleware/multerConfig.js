// middleware/multerConfig.js
const multer = require("multer");
const path  = require("path");
const fs    = require("fs");

// which fields we treat as “user” docs vs “car” docs
const USER_DOC_FIELDS = ["cnicOrPassport","drivingLicense","companyDoc"];
const CAR_DOC_FIELDS  = ["grayCard","controlTechniqueFiles","assuranceFiles"];

const getStorage = (folder) => multer.diskStorage({
  destination: (req, file, cb) => {
    let targetFolder = folder;

    if (USER_DOC_FIELDS.includes(file.fieldname)) {
      targetFolder = "userDocs";
    } else if (CAR_DOC_FIELDS.includes(file.fieldname)) {
      targetFolder = "carDocs";
    }

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

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    // images
    "image/jpeg","image/png","image/gif",
    // text & csv
    "text/plain","text/csv",
    // pdf
    "application/pdf",
    // Microsoft Office
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    // video
    "video/mp4","video/x-msvideo","video/mpeg","video/quicktime"
  ]; 
   if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG, PNG, and GIF files are allowed"), false);
  }
};

module.exports = (folder) => multer({
  storage: getStorage(folder),
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});
