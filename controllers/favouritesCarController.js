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
            {model:models.Review},
            {model:models.Calendar},
            {model:models.CarDocument},
            {
              model: models.User,
              attributes: ['firstName', 'lastName']
            },        
            ]
        }
      ]
    });

    const fetchCityName = async (id) => {
      return await models.City.findByPk(id);
    };
    
    const parsedFavouriteCars = await Promise.all(
      favourites.map(async fav => {
        if (!fav.Car) return null;
    
        const carObj = fav.Car.toJSON();
        let carImages = [];
        let galleryImages = [];
    
        // Parse car images
        if (carObj.image) {
          try {
            carImages = JSON.parse(carObj.image);
          } catch {
            carImages = [];
          }
        }
    
        // Average rating
        const c = carObj;
        if (Array.isArray(c.Reviews) && c.Reviews.length > 0) {
          const totalRating = c.Reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
          c.averageRating = parseFloat((totalRating / c.Reviews.length).toFixed(1));
        } else {
          c.averageRating = null;
        }
    
        // Parse gallery images
        if (carObj.Gallery?.image) {
          try {
            galleryImages = JSON.parse(carObj.Gallery.image);
          } catch {
            galleryImages = [];
          }
        }
    
        // Parse locationInfo and fetch city names
        if (typeof carObj.locationInfo === 'string') {
          try {
            carObj.locationInfo = JSON.parse(carObj.locationInfo);
    
            if (Array.isArray(carObj.locationInfo)) {
              for (const loc of carObj.locationInfo) {
                if (loc.cityId) {
                  const city = await fetchCityName(parseInt(loc.cityId));
                  loc.cityName = city?.name || null;
                }
              }
            }
          } catch {
            carObj.locationInfo = [];
          }
        }
    
        // Parse car documents
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
    
        // Combine images
        const combinedImages = [...carImages, ...galleryImages];
        carObj.images = combinedImages;
        carObj.image = combinedImages.length > 0 ? combinedImages[0] : null;
    
        // Owner
        carObj.owner = carObj.User;
    
        // Clean up
        delete carObj.Gallery;
        delete carObj.CarDocument;
        delete carObj.User;
    
        return carObj;
      })
    );
    
    // Filter out nulls
    const filteredFavouriteCars = parsedFavouriteCars.filter(car => car !== null);
    

    return res.status(200).json({ success: true, data: filteredFavouriteCars });
  } catch (error) {
    console.error("Error in getFavouriteCars:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};


module.exports = {
  updateFavourite,
  getFavouriteCars
};
