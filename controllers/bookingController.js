const models = require("../models");
const { Booking,Car,BookingDocument,User,Calendar } = require("../models");
const { Op } = require("sequelize");
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
    const userId   = req.user.id;
    const isAdmin  = req.user.role === "admin";

    // Destructure body
    const {
      carId, status, rentPrice, totalPrice, discount,
      pickupCity, dropOffCity, insuranceFee, serviceFee,
      paymentMethod, pickDate, pickTime, returnDate, returnTime,
      pickDescription, dropDescription
    } = req.body;

    // Validate on create
    if (!id) {
      const required = [
        'carId','status','rentPrice','totalPrice','discount',
        'pickupCity','dropOffCity','insuranceFee','serviceFee',
        'paymentMethod','pickDate','pickTime','returnDate','returnTime'
      ];
      const missing = required.filter(f => req.body[f] == null);
      if (missing.length) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Missing fields: ${missing.join(", ")}`
        });
      }
    }

    // Date order
    if (new Date(pickDate) > new Date(returnDate)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Pick date cannot be after return date."
      });
    }

    // Car existence & permission
    const car = await Car.findByPk(carId, { transaction });
    if (!car) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: "Invalid carId." });
    }
    

    // Overlap check
    const overlapCond = {
      carId,
      [Op.and]: [
        { pickDate:   { [Op.lte]: returnDate } },
        { returnDate: { [Op.gte]: pickDate   } }
      ]
    };
    if (id) overlapCond.id = { [Op.ne]: id };
    const conflict = await Booking.findOne({ where: overlapCond, transaction });
    if (conflict) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Car already booked in this range."
      });
    }

    let booking;
    let oldPick, oldReturn;
    if (id) {
      // UPDATE
      booking = await Booking.findByPk(id, { transaction });
      if (!booking) {
        await transaction.rollback();
        return res.status(404).json({ success: false, message: "Booking not found." });
      }
      oldPick   = booking.pickDate;
      oldReturn = booking.returnDate;

      const updateData = { carId, status, rentPrice, totalPrice, discount,
        pickupCity, dropOffCity, insuranceFee, serviceFee, paymentMethod,
        pickDate, pickTime, returnDate, returnTime
      };
      await booking.update(updateData, { transaction });
    } else {
      // CREATE
      booking = await Booking.create({
        carId, userId, status, rentPrice, totalPrice, discount,
        pickupCity, dropOffCity, insuranceFee, serviceFee,
        paymentMethod, pickDate, pickTime, returnDate, returnTime
      }, { transaction });
    }

    // OTP generation
    let otpFlag = false;
    if (pickup === "true") {
      booking.pickupOTP = generateOTP();
      otpFlag = true;
    }
    if (dropoff === "true") {
      booking.dropOffOTP = generateOTP();
      otpFlag = true;
    }
    if (otpFlag) await booking.save({ transaction });

    // Handle BookingDocument
    const docFields = [
      "carPickDocs","personPickDocs",
      "carDropDocs","personDropDocs"
    ];
    const filesRaw = req.files || {};
    const filesByField = Array.isArray(filesRaw)
      ? filesRaw.reduce((a,f)=>{
          if(docFields.includes(f.fieldname)){
            a[f.fieldname]=a[f.fieldname]||[]; a[f.fieldname].push(f);
          }
          return a;
        },{})
      : Object.entries(filesRaw).reduce((a,[field,arr])=>{
          if(docFields.includes(field)) a[field]=arr;
          return a;
        },{});

    if (
      docFields.some(f=> (filesByField[f]||[]).length>0 ) ||
      pickDescription!==undefined ||
      dropDescription!==undefined
    ) {
      const [doc] = await BookingDocument.findOrCreate({
        where: { bookingId: booking.id },
        defaults: { bookingId: booking.id },
        transaction
      });

      // descriptions
      if (pickDescription  !== undefined) doc.pickDescription  = pickDescription;
      if (dropDescription  !== undefined) doc.dropDescription  = dropDescription;

      // files arrays
      for (const f of docFields) {
        const arr = filesByField[f]||[];
        if (arr.length) {
          if (doc[f]) {
            try {
              JSON.parse(doc[f]).forEach(rel=>{
                const p = path.join(__dirname,"../public",rel.replace(/^\/+/,""));
                if (fs.existsSync(p)) fs.unlinkSync(p);
              });
            } catch{}
          }
          doc[f] = JSON.stringify(arr.map(file=>`/uploads/bookingDocs/${file.filename}`));
        }
      }
      await doc.save({ transaction });
    }

    // Update Calendar for this booking
    if (id) {
      // update existing calendar entry
      const cal = await Calendar.findOne({
        where: { carId, startDate: oldPick, endDate: oldReturn },
        transaction
      });
      if (cal) {
        cal.startDate = pickDate;
        cal.endDate   = returnDate;
        cal.status    = "booked";
        await cal.save({ transaction });
      } else {
        await Calendar.create({
          carId,
          startDate: pickDate,
          endDate:   returnDate,
          status:    "booked"
        }, { transaction });
      }
    } else {
      // create new calendar entry
      await Calendar.create({
        carId,
        startDate: pickDate,
        endDate:   returnDate,
        status:    "booked"
      }, { transaction });
    }

    await transaction.commit();
    const msg = id ? "Booking updated." : "Booking created.";
    return res.status(id ? 200 : 201).json({ success: true, message: msg, booking });
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
      carId,
      userId: qUserId,
      startDate,
      endDate,
      startTime,
      endTime,
      status,
      reservation
    } = req.query;

    const currentUserId = req.user.id;
    const isAdmin       = req.user.role === "admin";

    // Build where clause
    const where = {};

    if (!isAdmin) {
      // either the booking was made by them or it's for a car they own
      where[Op.or] = [
        { userId: currentUserId },
        { "$Car.userId$": currentUserId }
      ];
    } else if (qUserId) {
      where.userId = qUserId;
    }

    if (carId)  where.carId  = carId;
    if (status) where.status = status;

    // date overlap filtering
    if (startDate && endDate) {
      where[Op.and] = [
        { pickDate:   { [Op.lte]: endDate   } },
        { returnDate: { [Op.gte]: startDate } }
      ];
    } else if (startDate) {
      where.pickDate = { [Op.gte]: startDate };
    } else if (endDate) {
      where.returnDate = { [Op.lte]: endDate };
    }

    // time window filtering
    if (startTime && endTime) {
      where.pickTime   = { [Op.gte]: startTime };
      where.returnTime = { [Op.lte]: endTime   };
    } else if (startTime) {
      where.pickTime = { [Op.gte]: startTime };
    } else if (endTime) {
      where.returnTime = { [Op.lte]: endTime };
    }

    // reservation shortcut (e.g. upcoming bookings)
    if (reservation === "upcoming") {
      const today = new Date().toISOString().split("T")[0];
      where.pickDate = where.pickDate || {};
      where.pickDate[Op.gte] = today;
    }

    // Fetch with associations
    const bookings = await Booking.findAll({
      where,
      include: [
        {
          model: Car,
          attributes: ["id", "name", "image", "userId"]
        },
        {
          model: User,
          attributes: ["id", "firstName", "lastName",'phone']
        },
        {
          model: BookingDocument
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

    // Build response objects
    const data = bookings.map(bk => {
      const b = bk.toJSON();
      const car = b.Car || {};
      const user = b.User || {};
      const doc = b.BookingDocument || {};

      // First car image
      let carImage = null;
      if (car.image) {
        try { carImage = JSON.parse(car.image)[0]; } catch {}
      }

      // Parse document arrays
      const parseArr = key => {
        try { return JSON.parse(doc[key] || "[]"); }
        catch { return []; }
      };

      return {
        id:              b.id,
        carId:           b.carId,
        userId:          b.userId,
        status:          b.status,
        rentPrice:       b.rentPrice,
        totalPrice:      b.totalPrice,
        discount:        b.discount,
        pickupCity:      b.pickupCity,
        dropOffCity:     b.dropOffCity,
        insuranceFee:    b.insuranceFee,
        serviceFee:      b.serviceFee,
        paymentMethod:   b.paymentMethod,
        pickDate:        b.pickDate,
        pickTime:        fmtTime(b.pickTime),
        dropDate:        b.returnDate,
        dropTime:        fmtTime(b.returnTime),
        pickupOTP:       b.pickupOTP,
        dropOffOTP:      b.dropOffOTP,
        carName:         car.name,
        carImage,
        customerName:    user.fullName,
        customerPhone:   user.phone,
        documents: {
          carPickDocs:      parseArr("carPickDocs"),
          personPickDocs:   parseArr("personPickDocs"),
          carDropDocs:      parseArr("carDropDocs"),
          personDropDocs:   parseArr("personDropDocs"),
          pickDescription:  doc.pickDescription || null,
          dropDescription:  doc.dropDescription || null
        }
      };
    });

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Error in getBookings:", err);
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
