import { Department } from '../models/Department.js';
import { Doctor } from '../models/Doctor.js';
import { Token } from '../models/Token.js';

export const getDepartments = async (req, res) => {
  try {
    const { includeInactive } = req.query;
    const filter = includeInactive === 'true' ? {} : { activeStatus: true };
    const departments = await Department.find(filter).sort({ name: 1 });

    const todayStr = new Date().toISOString().split('T')[0];

    // Enrich with dynamic waiting counts and active doctors count
    const enriched = await Promise.all(
      departments.map(async (dept) => {
        const availableDoctors = await Doctor.countDocuments({
          departmentId: dept._id,
          activeStatus: true,
          status: { $in: ['Available', 'Busy', 'On Break', 'Delayed'] },
        });

        const waitingCount = await Token.countDocuments({
          departmentId: dept._id,
          dateString: todayStr,
          status: 'Waiting',
        });

        return {
          ...dept.toObject(),
          availableDoctorsCount: availableDoctors,
          waitingCount,
        };
      })
    );

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createDepartment = async (req, res) => {
  try {
    const { name, code, tokenPrefix, description, icon } = req.body;

    const existing = await Department.findOne({ $or: [{ name }, { code: code.toUpperCase() }] });
    if (existing) {
      return res.status(400).json({ message: 'Department name or code already exists' });
    }

    const dept = await Department.create({
      name,
      code: code.toUpperCase(),
      tokenPrefix: tokenPrefix.toUpperCase(),
      description,
      icon: icon || 'Stethoscope',
    });

    res.status(201).json(dept);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateDepartment = async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });

    dept.name = req.body.name || dept.name;
    dept.code = req.body.code ? req.body.code.toUpperCase() : dept.code;
    dept.tokenPrefix = req.body.tokenPrefix ? req.body.tokenPrefix.toUpperCase() : dept.tokenPrefix;
    dept.description = req.body.description || dept.description;
    dept.icon = req.body.icon || dept.icon;
    if (typeof req.body.activeStatus === 'boolean') {
      dept.activeStatus = req.body.activeStatus;
    }

    const updated = await dept.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
