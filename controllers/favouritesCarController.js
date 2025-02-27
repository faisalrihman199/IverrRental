const { FavouritesCar, Car, Gallery } = require("../models");

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
    // Fetch favourites with associated Car and its Gallery
    const favourites = await FavouritesCar.findAll({
      where: { userId },
      include: [
        {
          model: Car,
          include: [{ model: Gallery }]
        }
      ]
    });

    // For each favourite, combine images from Car.image and Gallery.image, then bind to Car.image
    const parsedFavourites = favourites.map(fav => {
      const favObj = fav.toJSON();
      let carImages = [];
      let galleryImages = [];

      // Parse Car.image if it exists
      if (favObj.Car && favObj.Car.image) {
        try {
          carImages = JSON.parse(favObj.Car.image);
        } catch (err) {
          carImages = [];
        }
      }
      // Parse Gallery.image if it exists
      if (favObj.Car && favObj.Car.Gallery && favObj.Car.Gallery.image) {
        try {
          galleryImages = JSON.parse(favObj.Car.Gallery.image);
        } catch (err) {
          galleryImages = [];
        }
      }
      // Combine both arrays
      favObj.Car.image = [...carImages, ...galleryImages];
      // Remove the Gallery property so that only one image key remains
      if (favObj.Car.Gallery) {
        delete favObj.Car.Gallery;
      }
      return favObj;
    });

    return res.status(200).json({ success: true, data: parsedFavourites });
  } catch (error) {
    console.error("Error in getFavouriteCars:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

module.exports = {
  updateFavourite,
  getFavouriteCars
};
