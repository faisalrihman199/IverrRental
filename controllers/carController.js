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

    if (!files || files.length === 0) {
      await t.rollback();
      return res.status(400).json({ success: false, message: "At least one car image is required." });
    }

    const imagePaths = files.map(file => `/uploads/cars/${file.filename}`);
    const imagesJson = JSON.stringify(imagePaths);
    
    let car;
    if (id) {
      car = await Car.findByPk(id, { transaction: t });
      if (!car) {
        await t.rollback();
        return res.status(404).json({ success: false, message: "Car not found." });
      }
      // Allow update if user is admin OR the car belongs to the current user.
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
      // If not admin, assign userId from the request; if admin, keep the existing car.userId.
      updateData.userId = req.user.role !== 'admin' ? userId : car.userId;

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
      console.log("Setting facilities:", facilitiesArray);
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
    return res.status(200).json({ success: true, cars });
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

module.exports = {
  saveCar,
  getCars,
  deleteCar,
  getOptions
};
