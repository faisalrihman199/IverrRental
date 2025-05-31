const models = require("../models");
const { Booking, Car, BookingDocument, User, Calendar } = require("../models");
const { Op, json } = require("sequelize");
const { addNotification } = require("./notificationController");

function formatDate(date) {
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}



saveBooking = async (req, res) => {
  const transaction = await models.sequelize.transaction();
  try {
    const { id, pickup, dropoff } = req.query;
    const userId = req.user.id;
    const isAdmin = req.user.role === "admin";

    // common body fields
    const {
      carId, status, rentPrice, totalPrice, discount,
      pickupCity, dropOffCity, insuranceFee, serviceFee,
      paymentMethod, pickDate, pickTime, returnDate, returnTime,
      pickDescription, dropDescription
    } = req.body;

    let booking;

    if (id) {
      // —— UPDATE FLOW —— 
      booking = await Booking.findByPk(id, { transaction });
      if (!booking) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: "Booking not found." });
      }
      const car = await Car.findByPk(booking.carId, { transaction });


      // Only the booker or admin can update
      if (!isAdmin && booking.userId !== userId && car.userId!==userId) {
        await transaction.rollback();
        return res.status(403).json({ success: false, message: "Forbidden." });
      }

      // Dynamic updates: only set fields that were provided
      const updateData = {};
      [
        "carId", "status",, "totalPrice", "discount",
        "pickupCity", "dropOffCity", "insuranceFee", "serviceFee",
        "paymentMethod", "pickDate", "pickTime", "returnDate", "returnTime"
      ].forEach(f => {
        if (req.body[f] !== undefined) {
          updateData[f] = req.body[f];
        }
      });
      if (Object.keys(updateData).length) {
        await booking.update(updateData, { transaction });
      }

    } else {
      // —— CREATE FLOW —— 
      // Required on create:
      const required = [
        'carId', 'status', 'totalPrice', 'discount',
        'pickupCity', 'dropOffCity', 'insuranceFee', 'serviceFee',
        'paymentMethod', 'pickDate', 'pickTime', 'returnDate', 'returnTime'
      ];
      const missing = required.filter(f => req.body[f] == null);
      if (missing.length) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Missing fields: ${missing.join(", ")}`
        });
      }

      // Date order check
      if (new Date(pickDate) > new Date(returnDate)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Pick date cannot be after return date."
        });
      }

     


      // Car exists
      const car = await Car.findByPk(carId, { transaction });
      if (!car) {
        await transaction.rollback();
        return res.status(400).json({ success: false, message: "Invalid carId." });
      }

      // Overlap check
      const overlapCond = {
        carId,
        [Op.and]: [
          { pickDate: { [Op.lte]: returnDate } },
          { returnDate: { [Op.gte]: pickDate } }
        ]
      };
      const conflict = await Booking.findOne({ where: overlapCond, transaction });
      if (conflict) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Car already booked in this range."
        });
      }

      booking = await Booking.create({
        carId, userId, status, rentPrice, totalPrice, discount,
        pickupCity, dropOffCity, insuranceFee, serviceFee,
        paymentMethod, pickDate, pickTime, returnDate, returnTime
      }, { transaction });

      // Create calendar entry on create
      await Calendar.create({
        carId,
        startDate: pickDate,
        endDate: returnDate,
        status: "booked"
      }, { transaction });
    }

    // OTP generation on both create/update if flagged
    let otpUpdated = false;
    if (pickup === "true") {
      booking.pickupOTP = generateOTP();
      otpUpdated = true;
    }
    if (dropoff === "true") {
      booking.dropOffOTP = generateOTP();
      otpUpdated = true;
    }
    if (otpUpdated) {
      await booking.save({ transaction });
    }

    // Handle BookingDocument (files + descriptions)
    const docFields = ["carPickDocs", "personPickDocs", "carDropDocs", "personDropDocs"];
    const filesRaw = req.files || {};
    const filesByField = Array.isArray(filesRaw)
      ? filesRaw.reduce((acc, f) => {
        if (docFields.includes(f.fieldname)) {
          acc[f.fieldname] = (acc[f.fieldname] || []).concat(f);
        }
        return acc;
      }, {})
      : Object.entries(filesRaw).reduce((acc, [field, arr]) => {
        if (docFields.includes(field)) acc[field] = arr;
        return acc;
      }, {});

    if (
      docFields.some(f => (filesByField[f] || []).length > 0) ||
      pickDescription !== undefined ||
      dropDescription !== undefined
    ) {
      const [doc] = await BookingDocument.findOrCreate({
        where: { bookingId: booking.id },
        defaults: { bookingId: booking.id },
        transaction
      });

      if (pickDescription !== undefined) doc.pickDescription = pickDescription;
      if (dropDescription !== undefined) doc.dropDescription = dropDescription;

      for (const f of docFields) {
        const arr = filesByField[f] || [];
        if (arr.length) {
          // delete old files
          if (doc[f]) {
            try {
              JSON.parse(doc[f]).forEach(rel => {
                const p = path.join(__dirname, "../public", rel.replace(/^\/+/, ""));
                if (fs.existsSync(p)) fs.unlinkSync(p);
              });
            } catch { }
          }
          doc[f] = JSON.stringify(arr.map(file => `/uploads/bookingDocs/${file.filename}`));
        }
      }
      await doc.save({ transaction });
    }

    // On UPDATE only: adjust calendar if dates changed
    if (id && (req.body.pickDate || req.body.returnDate)) {
      const oldStart = booking._previousDataValues.pickDate;
      const oldEnd = booking._previousDataValues.returnDate;
      const cal = await Calendar.findOne({
        where: { carId, startDate: oldStart, endDate: oldEnd },
        transaction
      });
      if (cal) {
        if (req.body.pickDate) cal.startDate = req.body.pickDate;
        if (req.body.returnDate) cal.endDate = req.body.returnDate;
        cal.status = "booked";
        await cal.save({ transaction });
      } else if (req.body.pickDate && req.body.returnDate) {
        await Calendar.create({
          carId,
          startDate: req.body.pickDate,
          endDate: req.body.returnDate,
          status: "booked"
        }, { transaction });
      }
    }

    await transaction.commit();
    console.log("Booking :", booking);
    
    const msg = id ? "Booking updated." : "Booking created.";
    const userDocs=await models.UserDocument.findOne({
      where:{
        userId:booking.userId,
      }
    })
    if(!userDocs || !userDocs?.cnicOrPassport || !userDocs?.drivingLicense){
      const newNotification = await models.Notification.create({
                userId: booking.userId,
                type: "notify",
                heading: "Document Missing",
                content: "Please upload in profile your personal documents to prepare your trip",
                status: "unread",
      });
    }
    res.status(id ? 200 : 201).json({ success: true, message: msg, booking, userDocs });
    if (booking){
      setTimeout(async () => {
        try {
          // re-fetch car including its owner
          const carWithOwner = await Car.findOne({
            where: { id: booking.carId },
            include: [{ model: User, attributes: ["firstName","lastName"] }]
          });
  
          if (!carWithOwner) return;
          const owner = carWithOwner.User;
          const ownerName = `${owner.firstName} ${owner.lastName}`;
          const carNum = carWithOwner.number;
          const carModel = carWithOwner.model;
  
          // choose heading & content based on create vs update
          const heading = id
            ? `Booking Updated for ${carNum || carModel}`
            : `New Booking for ${carNum || carModel}`;
  
          const content = id
            ? `Hello ${ownerName}, your booking (ID ${booking.id}) for car ${carNum || carModel} has been updated. Pick-up: ${booking.pickDate} at ${booking.pickTime}, Return: ${booking.returnDate} at ${booking.returnTime}.`
            : `Hello ${ownerName}, a new booking (ID ${booking.id}) has been made for car ${carNum || carModel}. Pick-up: ${booking.pickDate} at ${booking.pickTime}, Return: ${booking.returnDate} at ${booking.returnTime}.`;
  
          await addNotification({
            userId:    carWithOwner.userId,
            type:      "booking",
            heading,
            content,
            status:    "unread"
          });
          await addNotification({
            userId:    booking.userId,
            type:      "booking",
            heading,
            content,
            status:    "unread"
          });
        } catch (notifyErr) {
          console.error("Error sending booking notification:", notifyErr);
        }
      }, 0);
      
    }
  } catch (err) {
    await transaction.rollback();
    console.error("Error in saveBooking:", err);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
};


// controllers/bookingController.js

getBookings = async (req, res) => {
  try {
    const {
      id,
      userId: qUserId,
      reservation,
      carId,
      status,
      startDate,
      endDate,
      startTime,
      endTime
    } = req.query;

    // Determine the effective userId
    const userId = qUserId || req.user.id;

    // Base where clause
    const where = {};
    if (reservation === "true") {
      where["$Car.userId$"] = userId;
    } else {
      where.userId = userId;
    }

    // Additional optional filters
    if (carId) where.carId = carId;
    if (id) where.id = id;
    if (status) where.status = status;

    // Date overlap filtering
    if (startDate && endDate) {
      where[Op.and] = [
        { pickDate: { [Op.lte]: endDate } },
        { returnDate: { [Op.gte]: startDate } }
      ];
    } else if (startDate) {
      where.pickDate = { [Op.gte]: startDate };
    } else if (endDate) {
      where.returnDate = { [Op.lte]: endDate };
    }

    // Time window filtering
    if (startTime && endTime) {
      where.pickTime = { [Op.gte]: startTime };
      where.returnTime = { [Op.lte]: endTime };
    } else if (startTime) {
      where.pickTime = { [Op.gte]: startTime };
    } else if (endTime) {
      where.returnTime = { [Op.lte]: endTime };
    }

    // Fetch bookings with related models
    const bookings = await Booking.findAll({
      where,
      include: [
        {
          model: Car,
          attributes: ["id", "name", "image", 'number', "userId"],
          include: [{
            model: User,
            attributes: ["id", "firstName", "lastName", "email", "phone"]
          }]
        },
        {
          model: User,
          attributes: ["id", "firstName", "lastName", "email", "phone"]
        },
        {
          model: BookingDocument
        },
        {
          model:models.Conversation
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    // Helper to format time to h:mm AM/PM
    const fmtTime = t24 => {
      const [h, m] = t24.split(":");
      let hh = parseInt(h, 10);
      const ampm = hh >= 12 ? "PM" : "AM";
      hh = hh % 12 || 12;
      return `${hh}:${m} ${ampm}`;
    };

    // Build response
    const data = bookings.map(bk => {
      const b = bk.toJSON();
      const car = b.Car || {};
      const usr = b.User || {};
      const doc = b.BookingDocument || {};

      // parse car.image JSON string
      let images = [];
      if (typeof car.image === "string") {
        try { images = JSON.parse(car.image); } catch { }
      } else if (Array.isArray(car.image)) {
        images = car.image;
      }

      // parse document arrays
      const parseArr = key => {
        try { return JSON.parse(doc[key] || "[]"); }
        catch { return []; }
      };


      return {
        id: b.id,
        carId: b.carId,
        userId: b.userId,
        status: b.status,
        rentPrice: b.rentPrice,
        totalPrice: b.totalPrice,
        discount: b.discount,
        pickupCity: JSON.parse(b.pickupCity),
        dropOffCity: JSON.parse(b.dropOffCity),
        insuranceFee: b.insuranceFee,
        serviceFee: b.serviceFee,
        paymentMethod: b.paymentMethod,
        pickDate: b.pickDate,
        pickTime: fmtTime(b.pickTime),
        dropDate: b.returnDate,
        dropTime: fmtTime(b.returnTime),
        pickupOTP: b.pickupOTP,
        dropOffOTP: b.dropOffOTP,
        conversationId: b?.Conversation?.id || null,
        carName:car.name,
        carImage:images.length>0 && images[0],
        car: {
          id: car.id,
          name: car.name,
          number: car.number,
          images,
          owner: {
            id: car.User?.id,
            name: `${car.User?.firstName || ""} ${car.User?.lastName || ""}`.trim(),
            email: car.User?.email,
            phone: car.User?.phone
          }
        },
        customer: {
          id: usr.id,
          name: `${usr.firstName || ""} ${usr.lastName || ""}`.trim(),
          email: usr.email,
          phone: usr.phone
        },
        documents: {
          carPickDocs: parseArr("carPickDocs"),
          personPickDocs: parseArr("personPickDocs"),
          carDropDocs: parseArr("carDropDocs"),
          personDropDocs: parseArr("personDropDocs"),
          pickDescription: doc.pickDescription || null,
          dropDescription: doc.dropDescription || null
        }
      };

    });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Error in getBookings:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error."
    });
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
