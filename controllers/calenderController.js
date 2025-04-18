// controllers/calendarController.js
const models = require("../models");
const { sequelize } = models;

/**
 * saveCalendar: create or update a calendar entry
 * - Query param: ?id= for update
 * - Body: startDate, endDate, status, specialPrice, carId
 * - Permissions: admin can act on any; non-admin only on their own cars
 */
exports.saveCalendar = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    let id = req.query.id;
    const { startDate, endDate, status, specialPrice, carId } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // For both create/update, carId is required
    if (!carId) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'carId is required' });
    }

    // Ensure car exists and permission
    const car = await models.Car.findByPk(carId, { transaction: t });
    if (!car) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Invalid carId' });
    }
    if (!isAdmin && car.userId !== userId) {
      await t.rollback();
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    let entry;
    const carExist = await models.Calendar.findOne({
        where: { carId }
      });
    
    if (id || carExist) {
        id=carExist.id
      // UPDATE
      entry = await models.Calendar.findByPk(id, { transaction: t });
      if (!entry) {
        await t.rollback();
        return res.status(404).json({ success: false, message: 'Calendar entry not found' });
      }
      // enforce permission on existing entry as well
      if (!isAdmin && entry.carId !== carId) {
        await t.rollback();
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      // apply fields
      if (startDate !== undefined) entry.startDate = startDate;
      if (endDate   !== undefined) entry.endDate   = endDate;
      if (status    !== undefined) entry.status    = status;
      if (specialPrice !== undefined) entry.specialPrice = specialPrice;
      entry.carId = carId;
      await entry.save({ transaction: t });
    } else {
      // CREATE
      entry = await models.Calendar.create({
        startDate,
        endDate,
        status,
        specialPrice: specialPrice || null,
        carId
      }, { transaction: t });
    }

    await t.commit();
    return res.status(200).json({ success: true, data: entry });
  } catch (err) {
    await t.rollback();
    console.error('Error in saveCalendar:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * getCalendars: fetch calendar entries
 * - Query params: startDate, endDate, status, carId
 * - Admin: can view all; non-admin only their own cars
 */
exports.getCalendars = async (req, res) => {
    try {
      const { startDate, endDate, status, carId } = req.query;
      const where = {};
      const { Op } = require('sequelize');
  
      // If both dates provided, return entries overlapping the range
      if (startDate && endDate) {
        where[Op.and] = [
          { startDate: { [Op.lte]: endDate } },
          { endDate:   { [Op.gte]: startDate } }
        ];
      } else {
        if (startDate) where.startDate = { [Op.gte]: startDate };
        if (endDate)   where.endDate   = { [Op.lte]: endDate };
      }
  
      if (status) where.status = status;
      if (carId)  where.carId  = carId;
  
      const entries = await models.Calendar.findAll({ where });
      return res.status(200).json({ success: true, data: entries });
    } catch (err) {
      console.error('Error in getCalendars:', err);
      return res.status(500).json({ success: false, message: 'Error fetching calendar entries' });
    }
  };

/**
 * deleteCalendar: remove a calendar entry by id
 * - Query param: id
 * - Admin can delete any; non-admin only if car belongs to them
 */
exports.deleteCalendar = async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) {
      return res.status(400).json({ success: false, message: 'id is required' });
    }

    const entry = await models.Calendar.findByPk(id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Calendar entry not found' });
    }

    const isAdmin = req.user.role === 'admin';
    if (!isAdmin) {
      const car = await models.Car.findByPk(entry.carId);
      if (!car || car.userId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
    }

    await entry.destroy();
    return res.status(200).json({ success: true, message: 'Calendar entry deleted' });
  } catch (err) {
    console.error('Error in deleteCalendar:', err);
    return res.status(500).json({ success: false, message: 'Error deleting calendar entry' });
  }
};
