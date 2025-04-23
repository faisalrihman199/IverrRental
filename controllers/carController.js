const { Car, User, Gallery, Review, Facility, CarType, CarBrand, City, sequelize, Insurance } = require('../models');
const fs = require("fs");
const path = require("path");
const models = require("../models");
saveCar = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.query;
    const {
      name, number, driverName, driverPhone, rating,
      status, seat, AC, gearSystem, carTypeId, carBrandId,
      carCityIds, rentWithDriver, rentDriverLess, engineHP,
      priceType, fuelType, description, pickupAddress,
      latitude, longitude, drivenKM, minHrsReq,
      freeCancellation, paymentAccepted, facilities,
      insurance, controlTechniqueText, assuranceText,locationInfo
    } = req.body;
    const userId = req.user.id;

    // Normalize files array: support .array() or .fields() multer output
    const filesRaw = req.files || [];
    const allFiles = Array.isArray(filesRaw)
      ? filesRaw
      : Object.values(filesRaw).flat();

    // 1) Validate images on create (fieldname 'images')
    const imageFiles = allFiles.filter(f => f.fieldname === 'images');
    if (!id && imageFiles.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "At least one car image is required." });
    }

    // 2) Process new car images
    let imagesJson;
    if (imageFiles.length) {
      const imagePaths = imageFiles.map(f => `/uploads/cars/${f.filename}`);
      imagesJson = JSON.stringify(imagePaths);
    }

    // 3) Create or update Car
    let car;
    if (id) {
      car = await models.Car.findByPk(id, { transaction: t });
      if (!car) {
        await t.rollback();
        return res.status(404).json({ success: false, message: "Car not found." });
      }
      if (req.user.role !== 'admin' && car.userId !== userId) {
        await t.rollback();
        return res.status(403).json({ success: false, message: "Not authorized to update this car." });
      }

      const updateData = {
        userId: req.user.role === 'admin' ? car.userId : userId
      };
      [ 'name','number','status','seat','AC','driverName','driverPhone','rating',
        'gearSystem','carTypeId','carBrandId','rentWithDriver','rentDriverLess',
        'engineHP','priceType','fuelType','description','pickupAddress','latitude',
        'longitude','drivenKM','minHrsReq','locationInfo'
      ].forEach(field => {
        if (req.body[field] !== undefined) updateData[field] = req.body[field];
      });
      if (freeCancellation !== undefined) updateData.freeCancellation = freeCancellation;
      if (paymentAccepted   !== undefined) updateData.paymentAccepted   = paymentAccepted;

      if (imagesJson) {
        if (car.image) {
          try {
            const oldList = JSON.parse(car.image);
            oldList.forEach(img => {
              const p = path.join(__dirname, '../public', img.replace(/^\/+/, ''));
              if (fs.existsSync(p)) fs.unlinkSync(p);
            });
          } catch {}
        }
        updateData.image = imagesJson;
      }

      await car.update(updateData, { transaction: t });
    } else {
      car = await models.Car.create({
        name, number, image: imagesJson, status, seat, AC,
        driverName, driverPhone, rating, gearSystem,
        carTypeId, carBrandId, rentWithDriver, rentDriverLess,
        engineHP, priceType, fuelType, description, pickupAddress,
        latitude, longitude, drivenKM, minHrsReq,
        freeCancellation, paymentAccepted, userId,locationInfo
      }, { transaction: t });
    }

    // 4) Facilities
    let facArray = facilities;
    if (typeof facilities === 'string') {
      try { facArray = JSON.parse(facilities); } catch {
        await t.rollback();
        return res.status(400).json({ success: false, message: "Invalid facilities format." });
      }
    }
    if (Array.isArray(facArray)) {
      await car.setFacilities(facArray, { transaction: t });
    }

    // 5) CarCityIds
    let cityArray = carCityIds;
    if (typeof carCityIds === 'string') {
      try { cityArray = JSON.parse(carCityIds); } catch {
        await t.rollback();
        return res.status(400).json({ success: false, message: "Invalid carCityIds format." });
      }
    }
    if (Array.isArray(cityArray)) {
      await car.setCities(cityArray, { transaction: t });
    }

    // 6) Insurance
    let insArr;
    if (Array.isArray(insurance)) insArr = insurance;
    else if (insurance && Array.isArray(insurance.insurances)) insArr = insurance.insurances;
    else if (typeof insurance === 'string') {
      try { insArr = JSON.parse(insurance); } catch {
        await t.rollback();
        return res.status(400).json({ success: false, message: "Invalid insurance format." });
      }
    }
    if (Array.isArray(insArr)) {
      await models.Insurance.destroy({ where: { carId: car.id }, transaction: t });
      const insData = insArr.map(item => ({ ...item, carId: car.id }));
      await models.Insurance.bulkCreate(insData, { transaction: t });
    }

    // 7) CarDocument
    const docFields = ['grayCard','controlTechniqueFiles','assuranceFiles'];
    const textFields = { controlTechniqueText, assuranceText };
    const filesByField = allFiles.reduce((acc, f) => {
      if (docFields.includes(f.fieldname)) {
        acc[f.fieldname] = acc[f.fieldname] || [];
        acc[f.fieldname].push(f);
      }
      return acc;
    }, {});

    if (Object.keys(filesByField).length || Object.values(textFields).some(v=>v!==undefined)) {
      const [doc] = await models.CarDocument.findOrCreate({
        where: { carId: car.id }, defaults:{carId:car.id}, transaction: t
      });
      // text
      Object.entries(textFields).forEach(([k,v])=>{ if(v!==undefined) doc[k]=v });
      // files
      for(const field of docFields){
        const arr = filesByField[field]||[];
        if(arr.length){
          if(doc[field]){ try{JSON.parse(doc[field]).forEach(rel=>{const p=path.join(__dirname,'../public',rel.replace(/^\/+/,'')); if(fs.existsSync(p)) fs.unlinkSync(p);});}catch{}
          }
          doc[field]=JSON.stringify(arr.map(f=>`/uploads/carDocs/${f.filename}`));
        }
      }
      await doc.save({ transaction: t });
    }

    await t.commit();
    
    const msg = id?"Car updated successfully.":"Car created successfully.";
    return res.status(id?200:201).json({ success:true, message:msg, car });

  } catch (error) {
    await t.rollback();
    console.error("Error in saveCar:", error);
    return res.status(500).json({ success:false, message:error.message });
  }
};





const getCars = async (req, res) => {
  try {
    const { id, status, carTypeId, carBrandId, carCityId, mine } = req.query;
    const  userId =req.query.userId || req.user.id;
    let whereClause = {};
    if (mine || req.query.userId) {
      whereClause.userId = userId;
    }
    if (id)           whereClause.id         = id;
    if (status)       whereClause.status     = status;
    if (carTypeId)    whereClause.carTypeId  = carTypeId;
    if (carBrandId)   whereClause.carBrandId = carBrandId;
    if (carCityId)    whereClause.carCityId  = carCityId;

    const cars = await Car.findAll({
      where: whereClause,
      include: [
        CarType,
        CarBrand,
        City,
        Facility,
        Gallery,
        {
          model: User,
          attributes: ['firstName', 'lastName']
        },
        Insurance,
        models.Calendar,
        models.CarDocument,
        models.Review
      ]
    });
    
    const fetchCityName = async (id) => {
      return await models.City.findByPk(id);
    };
    
    const parsedCars = await Promise.all(cars.map(async (car) => {
      const c = car.toJSON();
    
      // Average rating
      if (Array.isArray(c.Reviews) && c.Reviews.length > 0) {
        const totalRating = c.Reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
        c.averageRating = parseFloat((totalRating / c.Reviews.length).toFixed(1));
      } else {
        c.averageRating = null;
      }
    
      // Images
      let carImages = [], galleryImages = [];
      if (c.image) {
        try { carImages = JSON.parse(c.image); } catch {}
      }
      if (c.Gallery?.image) {
        try { galleryImages = JSON.parse(c.Gallery.image); } catch {}
      }
      const combined = [...carImages, ...galleryImages];
      c.images = combined;
      c.image = combined[0] || null;
    
      // Owner
      c.owner = c.User;
    
      // Documents
      if (c.CarDocument) {
        const doc = c.CarDocument;
        const documents = {
          grayCard: [],
          controlTechniqueText: doc.controlTechniqueText || null,
          controlTechniqueFiles: [],
          assuranceText: doc.assuranceText || null,
          assuranceFiles: []
        };
    
        ['grayCard', 'controlTechniqueFiles', 'assuranceFiles'].forEach(field => {
          if (doc[field]) {
            try {
              documents[field] = JSON.parse(doc[field]);
            } catch {}
          }
        });
    
        c.documents = documents;
      } else {
        c.documents = null;
      }
    
      // Location info
      if (typeof c.locationInfo === 'string') {
        try {
          c.locationInfo = JSON.parse(c.locationInfo);
          if (Array.isArray(c.locationInfo)) {
            for (const loc of c.locationInfo) {
              if (loc.cityId) {
                const city = await fetchCityName(parseInt(loc.cityId));
                loc.cityName = city?.name || null;
              }
            }
          }
        } catch {
          c.locationInfo = [];
        }
      }
    
      // Clean up
      delete c.Gallery;
      delete c.User;
      delete c.CarDocument;
    
      return c;
    }));
    

    return res.status(200).json({ success: true, data: parsedCars });
  } catch (error) {
    console.error("Error in getCars:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};




const deleteCar = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ success: false, message: "Car ID is required." });
    }
    const userId = req.user.id;
    const car = await Car.findByPk(id);
    if (!car) {
      return res.status(404).json({ success: false, message: "Car not found." });
    }
    if (car.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: "You are not authorized to delete this car." });
    }
    if (car.image) {
      try {
        const imagePaths = JSON.parse(car.image);
        imagePaths.forEach(image => {
          const imagePath = path.join(__dirname, `../public${image}`);
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        });
      } catch (err) {
        console.error("Error parsing image paths for deletion:", err);
      }
    }
    await car.destroy();
    return res.status(200).json({ success: true, message: "Car deleted successfully." });
  } catch (error) {
    console.error("Error in deleteCar:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const getOptions = async (req, res) => {
  try {
    const cities = await City.findAll({ attributes: ['id', 'name'] });
    const carTypes = await CarType.findAll({ attributes: ['id', 'title'] });
    const carBrands = await CarBrand.findAll({ attributes: ['id', 'title'] });
    const facilities = await Facility.findAll({ attributes: ['id', 'name'] });
    return res.status(200).json({
      success: true,
      options: {
        cities,
        carTypes,
        carBrands,
        facilities
      }
    });
  } catch (error) {
    console.error("Error in getOptions:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};
const addCarImages = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.query;
    if (!id) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Car id is required." });
    }
    const car = await Car.findByPk(id, { transaction: t });
    if (!car) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Car not found." });
    }
    let existingImages = [];
    if (car.image) {
      try {
        existingImages = JSON.parse(car.image);
      } catch (err) {
        existingImages = [];
      }
    }
    const newFiles = req.files;
    if (!newFiles || newFiles.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "No new images provided." });
    }
    const newImagePaths = newFiles.map(file => `/uploads/cars/${file.filename}`);
    const updatedImages = existingImages.concat(newImagePaths);
    car.image = JSON.stringify(updatedImages);
    await car.save({ transaction: t });
    await t.commit();
    return res.status(200).json({ success: true, message: "Car images added successfully", images: updatedImages });
  } catch (error) {
    await t.rollback();
    console.error("Error in addCarImages:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const removeCarImage = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id, remove } = req.query;
    if (!id || !remove) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "Car id and image identifier to remove are required." });
    }
    const car = await Car.findByPk(id, { transaction: t });
    if (!car) {
      await t.rollback();
      return res.status(404).json({ success: false, message: "Car not found." });
    }
    let existingImages = [];
    if (car.image) {
      try {
        existingImages = JSON.parse(car.image);
      } catch (err) {
        existingImages = [];
      }
    }
    // Filter out the image that matches the 'remove' parameter (comparing the file name)
    const updatedImages = existingImages.filter(imagePath => path.basename(imagePath) !== remove);
    const removedImages = existingImages.filter(imagePath => path.basename(imagePath) === remove);
    removedImages.forEach(imagePath => {
      const fullPath = path.join(__dirname, `../public${imagePath}`);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    });
    car.image = JSON.stringify(updatedImages);
    await car.save({ transaction: t });
    await t.commit();
    return res.status(200).json({ success: true, message: "Car image removed successfully", images: updatedImages });
  } catch (error) {
    await t.rollback();
    console.error("Error in removeCarImage:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  saveCar,
  getCars,
  deleteCar,
  getOptions,
  addCarImages,
  removeCarImage,
};
