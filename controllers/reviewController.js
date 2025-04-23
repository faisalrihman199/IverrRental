// controllers/reviewController.js
const models    = require("../models");
const sequelize = require("../config/db");

// saveReview handles both creation and update; update uses id from query string
exports.saveReview = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    // id provided via query, e.g. /saveReview?id=123
    const id = req.query.id;

    // body fields
    const {
      content,
      rating,
      carId,
      revieweeId: explicitReviewee,
      writerId:   explicitWriter
    } = req.body;

    let review;

    if (id) {
      // ——— UPDATE ———
      if (req.user.role !== "admin") {
        await t.rollback();
        return res
          .status(403)
          .json({ success: false, message: "Forbidden: admins only" });
      }

      review = await models.Review.findByPk(id, { transaction: t });
      if (!review) {
        await t.rollback();
        return res
          .status(404)
          .json({ success: false, message: "Review not found" });
      }

      // apply provided fields
      for (const field of ["content", "rating", "status", "carId", "revieweeId", "writerId"]) {
        if (req.body[field] !== undefined) {
          review[field] = req.body[field];
        }
      }

      await review.save({ transaction: t });

    } else {
      // ——— CREATE ———
      // determine writer: explicit if admin, otherwise current user
      if (req.user.role !== "admin" && explicitWriter) {
        await t.rollback();
        return res
          .status(403)
          .json({ success: false, message: "Forbidden: admins only" });
      }
      const writer = (req.user.role === "admin" && explicitWriter)
        ? explicitWriter
        : req.user.id;

      // determine reviewee: explicit or via car.ownerId
      let reviewee = explicitReviewee;
      if (carId) {
        const car = await models.Car.findByPk(carId, { transaction: t });
        if (!car) {
          await t.rollback();
          return res.status(400).json({ success: false, message: "Invalid carId" });
        }
        reviewee = car.userId;
      }
      review = await models.Review.create({
        content,
        rating,
        status:     "published",
        carId:      carId || null,
        writerId:   writer,
        revieweeId: reviewee || null,
      }, { transaction: t });
    }

    await t.commit();
    return res.status(200).json({message:"Review Saved Succesfuly!", success: true, data: review });

  } catch (err) {
    await t.rollback();
    console.error("Error in saveReview:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

exports.getReviews = async (req, res) => {
    try {
      let {userId}=req.query;
      
      userId =userId || req.user.id;

      const query = { ...req.query };
      delete query.userId;

      let role='admin'
      // Extract special 'reviewee' flag and remove it from filters
      const revieweeFlag = query.reviewee;
      delete query.reviewee;
  
      // Prepare where clause
      let where = {};
      
        // Non-admin: determine base condition
        let base = {};
        if (revieweeFlag !== undefined) {
          base = revieweeFlag === 'true'
            ? { revieweeId: userId }
            : { writerId: userId };
        } else if (Object.keys(query).length === 0) {
          // no filters: default to writer's reviews
          base = { writerId: userId };
        } else {
          // filters exist: default to writer's reviews
          base = { writerId: userId };
        }
        where = { ...base, ...query };
      
  
      const reviews = await models.Review.findAll({ where });
      return res.status(200).json({ success: true, data: reviews });
    } catch (error) {
      console.error("Error fetching reviews:", error);
      return res.status(500).json({ success: false, message: "Error fetching reviews" });
    }
  };
  
  exports.deleteReview = async (req, res) => {
    try {
      const id = req.query.id;
      if (!id) {
        return res.status(400).json({ success: false, message: "Review id is required" });
      }
  
      const review = await models.Review.findByPk(id);
      if (!review) {
        return res.status(404).json({ success: false, message: "Review not found" });
      }
  
      if (req.user.role !== 'admin' && review.writerId !== req.user.id) {
        return res.status(403).json({ success: false, message: "Forbidden: not allowed to delete" });
      }
  
      await review.destroy();
      return res.status(200).json({ success: true, message: "Review deleted successfully" });
    } catch (error) {
      console.error("Error deleting review:", error);
      return res.status(500).json({ success: false, message: "Error deleting review" });
    }
  };