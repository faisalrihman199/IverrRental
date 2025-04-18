const { FavouritesCar, Car, Gallery } = require("../models");
const models = require("../models");

// Update Favourite: Add or Remove a favourite car
const updateFavourite = async (req, res) => {
  try {
    const userId = req.user.id;
    const { add, remove } = req.query;

    if (!add && !remove) {
      return res.status(400).json({ success: false, message: "Provide either 'add' or 'remove' parameter with carId." });
    }
    if (add && remove) {
      return res.status(400).json({ success: false, message: "Provide only one parameter: either 'add' or 'remove'." });
    }

    if (add) {
      const carId = parseInt(add, 10);
      // Optional: Verify the car exists
      const car = await Car.findByPk(carId);
      if (!car) {
        return res.status(404).json({ success: false, message: "Car not found." });
      }
      const existingFavourite = await FavouritesCar.findOne({ where: { carId, userId } });
      if (existingFavourite) {
        return res.status(200).json({ success: true, message: "Car is already added to favourites." });
      }
      const newFavourite = await FavouritesCar.create({ carId, userId });
      return res.status(201).json({ success: true, message: "Car added to favourites.", favourite: newFavourite });
    }

    if (remove) {
      const carId = parseInt(remove, 10);
      const favourite = await FavouritesCar.findOne({ where: { carId, userId } });
      if (!favourite) {
        return res.status(404).json({ success: false, message: "Favourite not found for removal." });
      }
      await favourite.destroy();
      return res.status(200).json({ success: true, message: "Car removed from favourites." });
    }
  } catch (error) {
    console.error("Error in updateFavourite:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

// Fetch favourite cars for the authenticated user
const getFavouriteCars = async (req, res) => {
  try {
    const userId = req.user.id;
    const favourites = await FavouritesCar.findAll({
      where: { userId },
      include: [
        {
          model: Car,
          include: [
            { model: Gallery },
            {model:models.Facility},
            {model:models.CarBrand},
            {model:models.CarType},
            {model:models.City},
            {
              model: models.User,
              attributes: ['firstName', 'lastName']
            },          ]
        }
      ]
    });

    const parsedFavouriteCars = favourites
      .map(fav => {
        if (!fav.Car) return null;
        const carObj = fav.Car.toJSON();
        let carImages = [];
        let galleryImages = [];

        if (carObj.image) {
          try {
            carImages = JSON.parse(carObj.image);
          } catch (err) {
            carImages = [];
          }
        }

        if (carObj.Gallery && carObj.Gallery.image) {
          try {
            galleryImages = JSON.parse(carObj.Gallery.image);
          } catch (err) {
            galleryImages = [];
          }
        }
        if (typeof carObj.locationInfo === 'string') {
          try {
            carObj.locationInfo = JSON.parse(carObj.locationInfo);
          } catch {
            carObj.locationInfo = [];
          }
        }
       


        const combinedImages = [...carImages, ...galleryImages];
        carObj.images = combinedImages;
        carObj.image = combinedImages.length > 0 ? combinedImages[0] : null;
        carObj.owner = carObj.User
        delete carObj.Gallery;
        delete carObj.User;
        return carObj;
      })
      .filter(car => car !== null);

    return res.status(200).json({ success: true, data: parsedFavouriteCars });
  } catch (error) {
    console.error("Error in getFavouriteCars:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};


module.exports = {
  updateFavourite,
  getFavouriteCars
};
