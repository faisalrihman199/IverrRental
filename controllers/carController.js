const fs = require('fs');
const path = require('path');
const { Car, User, Facility, CarType, CarBrand, City, sequelize } = require('../models');

const saveCar = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.query;
    const {
      name,
      number,
      driverName,
      driverPhone,
      rating,
      status,
      seat,
      AC,
      gearSystem,
      carTypeId,
      carBrandId,
      carCityId,
      rentWithDriver,
      rentDriverLess,
      engineHP,
      priceType,
      fuelType,
      description,
      pickupAddress,
      latitude,
      longitude,
      drivenKM,
      minHrsReq,
      facilities
    } = req.body;
    const userId = req.user.id;
    const files = req.files;
    
    // For creating a new car, ensure at least one image is provided.
    if (!id && (!files || files.length === 0)) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "At least one car image is required." });
    }
    
    let imagesJson;
    if (files && files.length > 0) {
      const imagePaths = files.map(file => `/uploads/cars/${file.filename}`);
      imagesJson = JSON.stringify(imagePaths);
    }
    
    let car;
    if (id) {
      car = await Car.findByPk(id, { transaction: t });
      if (!car) {
        await t.rollback();
        return res.status(404).json({ success: false, message: "Car not found." });
      }
      if (req.user.role !== 'admin' && car.userId !== userId) {
        await t.rollback();
        return res.status(403).json({ success: false, message: "You are not authorized to update this car." });
      }
      
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (number !== undefined) updateData.number = number;
      if (status !== undefined) updateData.status = status;
      if (seat !== undefined) updateData.seat = seat;
      if (AC !== undefined) updateData.AC = AC;
      if (driverName !== undefined) updateData.driverName = driverName;
      if (driverPhone !== undefined) updateData.driverPhone = driverPhone;
      if (rating !== undefined) updateData.rating = rating;
      if (gearSystem !== undefined) updateData.gearSystem = gearSystem;
      if (carTypeId !== undefined) updateData.carTypeId = carTypeId;
      if (carBrandId !== undefined) updateData.carBrandId = carBrandId;
      if (carCityId !== undefined) updateData.carCityId = carCityId;
      if (rentWithDriver !== undefined) updateData.rentWithDriver = rentWithDriver;
      if (rentDriverLess !== undefined) updateData.rentDriverLess = rentDriverLess;
      if (engineHP !== undefined) updateData.engineHP = engineHP;
      if (priceType !== undefined) updateData.priceType = priceType;
      if (fuelType !== undefined) updateData.fuelType = fuelType;
      if (description !== undefined) updateData.description = description;
      if (pickupAddress !== undefined) updateData.pickupAddress = pickupAddress;
      if (latitude !== undefined) updateData.latitude = latitude;
      if (longitude !== undefined) updateData.longitude = longitude;
      if (drivenKM !== undefined) updateData.drivenKM = drivenKM;
      if (minHrsReq !== undefined) updateData.minHrsReq = minHrsReq;
      
      // Preserve the original userId if the updater is an admin
      updateData.userId = req.user.role !== 'admin' ? userId : car.userId;
      
      // If new images are provided, delete old images and update the image field.
      if (files && files.length > 0) {
        if (car.image) {
          try {
            const oldImagePaths = JSON.parse(car.image);
            oldImagePaths.forEach(image => {
              const oldImagePath = path.join(__dirname, `../public${image}`);
              if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
              }
            });
          } catch (err) {
            console.error("Error parsing old image paths:", err);
          }
        }
        updateData.image = imagesJson;
      }
      
      await car.update(updateData, { transaction: t });
    } else {
      car = await Car.create({
        name,
        number,
        image: imagesJson,
        status,
        seat,
        AC,
        driverName,
        driverPhone,
        rating,
        gearSystem,
        carTypeId,
        carBrandId,
        carCityId,
        rentWithDriver,
        rentDriverLess,
        engineHP,
        priceType,
        fuelType,
        description,
        pickupAddress,
        latitude,
        longitude,
        drivenKM,
        minHrsReq,
        userId
      }, { transaction: t });
    }
    
    let facilitiesArray = facilities;
    if (facilities && typeof facilities === 'string') {
      try {
        facilitiesArray = JSON.parse(facilities);
      } catch (err) {
        await t.rollback();
        return res.status(400).json({ success: false, message: "Invalid facilities format." });
      }
    }
    if (facilitiesArray && Array.isArray(facilitiesArray)) {
      await car.setFacilities(facilitiesArray, { transaction: t });
    }
    
    await t.commit();
    if (id) {
      return res.status(200).json({ success: true, message: "Car updated successfully.", car });
    } else {
      return res.status(201).json({ success: true, message: "Car created successfully.", car });
    }
  } catch (error) {
    await t.rollback();
    console.error("Error in saveCar:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getCars = async (req, res) => {
  try {
    const { id, status, carTypeId, carBrandId, carCityId } = req.query;
    const userId = req.user.id;
    let whereClause = {};
    if (id) whereClause.id = id;
    if (status) whereClause.status = status;
    if (carTypeId) whereClause.carTypeId = carTypeId;
    if (carBrandId) whereClause.carBrandId = carBrandId;
    if (carCityId) whereClause.carCityId = carCityId;
    
    const cars = await Car.findAll({
      where: whereClause,
      include: [
        { model: CarType },
        { model: CarBrand },
        { model: City },
        { model: Facility }
      ]
    });
    
    const parsedCars = cars.map(car => {
      const carObj = car.toJSON();
      if (carObj.image) {
        try {
          carObj.image = JSON.parse(carObj.image);
        } catch (err) {
          carObj.image = [];
        }
      }
      return carObj;
    });
    
    return res.status(200).json({ success: true, cars: parsedCars });
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
