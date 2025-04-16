// controllers/insuranceController.js
const models    = require("../models");
const sequelize = require("../config/db");


exports.saveInsurance = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id = req.query.id;
    const { type, rentPrice, securityDeposit, status } = req.body;
    let { carId: explicitCarId } = req.body;

    let insurance;

    if (id) {
      // UPDATE flow
      insurance = await models.Insurance.findByPk(id, { transaction: t });
      if (!insurance) {
        await t.rollback();
        return res.status(404).json({ success: false, message: 'Insurance not found' });
      }
      // Check permissions: admin or owner of the car
      const car = await models.Car.findByPk(insurance.carId, { transaction: t });
      if (req.user.role !== 'admin' && car.userId !== req.user.id) {
        await t.rollback();
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      // apply provided fields
      [ 'type', 'rentPrice', 'securityDeposit', 'status', 'carId' ].forEach(field => {
        if (req.body[field] !== undefined) {
          insurance[field] = req.body[field];
        }
      });
      await insurance.save({ transaction: t });

    } else {
      // CREATE flow
      // Determine carId
      if (!explicitCarId) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'carId is required' });
      }
      const car = await models.Car.findByPk(explicitCarId, { transaction: t });
      if (!car) {
        await t.rollback();
        return res.status(400).json({ success: false, message: 'Invalid carId' });
      }
      // Non-admin can only create for their own car
      if (req.user.role !== 'admin' && car.userId !== req.user.id) {
        await t.rollback();
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      insurance = await models.Insurance.create({
        type,
        rentPrice,
        securityDeposit,
        status: status || 'active',
        carId: explicitCarId
      }, { transaction: t });
    }

    await t.commit();
    return res.status(200).json({ message:"Insuarnce Saved Successfuly",success: true, data: insurance });
  } catch (err) {
    await t.rollback();
    console.error('Error in saveInsurance:', err);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Fetch insurances
 * - Admin: returns all, optionally filtered by query
 * - Non-admin: only for cars they own
 */
exports.getInsurances = async (req, res) => {
    try {
      const isAdmin = req.user.role === 'admin';
      // Extract and remove carId filter separately
      const { carId: filterCarId, ...otherFilters } = req.query;
  
      let where = {};
      if (!isAdmin) {
        // fetch cars owned by user
        const cars = await models.Car.findAll({
          where: { userId: req.user.id },
          attributes: ['id']
        });
        const carIds = cars.map(c => c.id);
  
        if (filterCarId) {
          const fid = Number(filterCarId);
          // only allow if the user owns this car
          if (!carIds.includes(fid)) {
            return res.status(403).json({ success: false, message: 'Forbidden: cannot view insurances for this car' });
          }
          where.carId = fid;
        } else {
          // restrict to user's cars
          if (carIds.length) {
            where.carId = carIds;
          } else {
            // user owns no cars => no results
            return res.status(200).json({ success: true, data: [] });
          }
        }
      } else if (filterCarId) {
        // admin may filter by any carId
        where.carId = Number(filterCarId);
      }
  
      // merge other filters (e.g. status)
      Object.assign(where, otherFilters);
  
      const insurances = await models.Insurance.findAll({ where });
      return res.status(200).json({ success: true, data: insurances });
    } catch (err) {
      console.error('Error fetching insurances:', err);
      return res.status(500).json({ success: false, message: 'Error fetching insurances' });
    }
  };

/**
 * Delete insurance
 * - Admin: can delete any
 * - Non-admin: only delete if they own the car
 */
exports.deleteInsurance = async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) {
      return res.status(400).json({ success: false, message: 'id is required' });
    }
    const insurance = await models.Insurance.findByPk(id);
    if (!insurance) {
      return res.status(404).json({ success: false, message: 'Insurance not found' });
    }
    if (req.user.role !== 'admin') {
      const car = await models.Car.findByPk(insurance.carId);
      if (!car || car.userId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
    }
    await insurance.destroy();
    return res.status(200).json({ success: true, message: 'Insurance deleted' });
  } catch (err) {
    console.error('Error deleting insurance:', err);
    return res.status(500).json({ success: false, message: 'Error deleting insurance' });
  }
};
