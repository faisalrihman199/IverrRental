const { Booking } = require("../models");
const { Op } = require("sequelize");

function formatDate(date) {
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

const saveBooking = async (req, res) => {
  try {
    const { id } = req.query;
    const userId = req.user.id;
    const { carId, status, isDriver, pickDate, pickTime, returnDate, returnTime } = req.body;
    let effectiveData = {};

    if (id) {
      const booking = await Booking.findByPk(id);
      if (!booking) {
        return res.status(404).json({ success: false, message: "Booking not found." });
      }
      if (req.user.role !== "admin" && booking.userId !== userId) {
        return res.status(403).json({ success: false, message: "Not authorized to update this booking." });
      }
      effectiveData.carId = carId !== undefined ? carId : booking.carId;
      effectiveData.status = status !== undefined ? status : booking.status;
      effectiveData.isDriver = isDriver !== undefined ? isDriver : booking.isDriver;
      effectiveData.pickDate = pickDate !== undefined ? pickDate : booking.pickDate;
      effectiveData.pickTime = pickTime !== undefined ? pickTime : booking.pickTime;
      effectiveData.returnDate = returnDate !== undefined ? returnDate : booking.returnDate;
      effectiveData.returnTime = returnTime !== undefined ? returnTime : booking.returnTime;
    } else {
      if (!carId || !status || isDriver === undefined || !pickDate || !pickTime || !returnDate || !returnTime) {
        return res.status(400).json({ success: false, message: "All fields (carId, status, isDriver, pickDate, pickTime, returnDate, returnTime) are required." });
      }
      effectiveData = { carId, status, isDriver, pickDate, pickTime, returnDate, returnTime, userId };
    }

    if (new Date(effectiveData.pickDate) > new Date(effectiveData.returnDate)) {
      return res.status(400).json({ success: false, message: "Pick date cannot be after return date." });
    }

    let conflictCondition = {
      carId: effectiveData.carId,
      [Op.and]: [
        { pickDate: { [Op.lte]: effectiveData.returnDate } },
        { returnDate: { [Op.gte]: effectiveData.pickDate } }
      ]
    };

    if (id) {
      conflictCondition.id = { [Op.ne]: id };
    }

    const conflictBooking = await Booking.findOne({ where: conflictCondition });
    if (conflictBooking) {
      return res.status(400).json({ success: false, message: "Car is already booked for one or more of the selected dates." });
    }

    let booking;
    if (id) {
      let updateData = {};
      if (carId !== undefined) updateData.carId = carId;
      if (status !== undefined) updateData.status = status;
      if (isDriver !== undefined) updateData.isDriver = isDriver;
      if (pickDate !== undefined) updateData.pickDate = pickDate;
      if (pickTime !== undefined) updateData.pickTime = pickTime;
      if (returnDate !== undefined) updateData.returnDate = returnDate;
      if (returnTime !== undefined) updateData.returnTime = returnTime;
      await Booking.update(updateData, { where: { id } });
      booking = await Booking.findByPk(id);
      return res.status(200).json({ success: true, message: "Booking updated successfully.", booking });
    } else {
      booking = await Booking.create(effectiveData);
      return res.status(201).json({ success: true, message: "Booking created successfully.", booking });
    }
  } catch (error) {
    console.error("Error in saveBooking:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

const getBookings = async (req, res) => {
  try {
    const { carId, userId, startDate, endDate, startTime, endTime, status, driver } = req.query;
    const currentUserId = req.user.id;
    const isAdmin = req.user.role === "admin";
    let whereClause = {};

    if (!isAdmin) {
      whereClause.userId = currentUserId;
    } else {
      if (userId) {
        whereClause.userId = userId;
      }
    }

    if (carId) {
      whereClause.carId = carId;
    }
    if (status) {
      whereClause.status = status;
    }
    if (startDate && endDate) {
      whereClause[Op.and] = [
        { pickDate: { [Op.lte]: endDate } },
        { returnDate: { [Op.gte]: startDate } }
      ];
    } else if (startDate) {
      whereClause.pickDate = { [Op.gte]: startDate };
    } else if (endDate) {
      whereClause.returnDate = { [Op.lte]: endDate };
    }
    if (startTime && endTime) {
      whereClause.pickTime = { [Op.gte]: startTime };
      whereClause.returnTime = { [Op.lte]: endTime };
    } else if (startTime) {
      whereClause.pickTime = { [Op.gte]: startTime };
    } else if (endTime) {
      whereClause.returnTime = { [Op.lte]: endTime };
    }
    if (driver) {
      if (driver.toLowerCase() === "yes") {
        whereClause.isDriver = true;
      } else if (driver.toLowerCase() === "no") {
        whereClause.isDriver = false;
      }
    }

    const bookings = await Booking.findAll({ where: whereClause });
    return res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    console.error("Error in getBookings:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};
const getComingBookings = async (req, res) => {
    try {
        const { carId, startDate, endDate } = req.query;
        if (!carId) {
            return res.status(400).json({ success: false, message: "carId is required." });
        }

        // Determine effective start and end dates
        let effectiveStartDate, effectiveEndDate;
        if (startDate && endDate) {
            effectiveStartDate = new Date(startDate);
            effectiveEndDate = new Date(endDate);
        } else {
            effectiveStartDate = new Date();
            effectiveEndDate = new Date();
            effectiveEndDate.setDate(effectiveEndDate.getDate() + 30);
        }

        // Format dates as YYYY-MM-DD for comparisons (since Booking stores dates as DATEONLY)
        const formattedStart = effectiveStartDate.toISOString().split("T")[0];
        const formattedEnd = effectiveEndDate.toISOString().split("T")[0];

        // Retrieve bookings for the given car that overlap with the requested date range
        const bookings = await Booking.findAll({
            where: {
                carId,
                [Op.and]: [
                    { pickDate: { [Op.lte]: formattedEnd } },
                    { returnDate: { [Op.gte]: formattedStart } }
                ]
            }
        });

        // Aggregate the individual booked dates
        const bookedDatesSet = new Set();
        bookings.forEach(booking => {
            const bookingStart = new Date(booking.pickDate);
            const bookingEnd = new Date(booking.returnDate);
            // Calculate the intersection between booking range and requested range
            const rangeStart = bookingStart < effectiveStartDate ? effectiveStartDate : bookingStart;
            const rangeEnd = bookingEnd > effectiveEndDate ? effectiveEndDate : bookingEnd;
            for (let dt = new Date(rangeStart); dt <= rangeEnd; dt.setDate(dt.getDate() + 1)) {
                bookedDatesSet.add(formatDate(new Date(dt)));
            }
        });

        // Convert set to array and sort the dates
        const bookedDates = Array.from(bookedDatesSet);
        bookedDates.sort((a, b) => new Date(a) - new Date(b));

        return res.status(200).json({ success: true, bookedDates });
    } catch (error) {
        console.error("Error in getComingBookings:", error);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

const deleteBooking = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ success: false, message: "Booking ID is required." });
    }
    const booking = await Booking.findByPk(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }
    if (req.user.role !== "admin" && booking.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this booking." });
    }
    await booking.destroy();
    return res.status(200).json({ success: true, message: "Booking deleted successfully." });
  } catch (error) {
    console.error("Error in deleteBooking:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};

module.exports = {
  saveBooking,
  getBookings,
  deleteBooking,
  getComingBookings
};
