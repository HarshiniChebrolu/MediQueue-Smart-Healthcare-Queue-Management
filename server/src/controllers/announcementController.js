import { Announcement } from '../models/Announcement.js';

export const getActiveAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find({ activeStatus: true })
      .populate('departmentId', 'name')
      .populate('doctorId')
      .sort({ createdAt: -1 });

    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createAnnouncement = async (req, res) => {
  try {
    const { title, message, type, audience, departmentId, doctorId } = req.body;

    const announcement = await Announcement.create({
      title,
      message,
      type: type || 'General',
      audience: audience || 'All',
      departmentId: departmentId || null,
      doctorId: doctorId || null,
      createdBy: req.user._id,
      activeStatus: true,
    });

    const io = req.app.get('socketio');
    if (io) {
      io.emit('new_announcement', announcement);
    }

    res.status(201).json(announcement);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });

    announcement.title = req.body.title || announcement.title;
    announcement.message = req.body.message || announcement.message;
    announcement.type = req.body.type || announcement.type;
    announcement.audience = req.body.audience || announcement.audience;
    if (typeof req.body.activeStatus === 'boolean') {
      announcement.activeStatus = req.body.activeStatus;
    }

    const updated = await announcement.save();

    const io = req.app.get('socketio');
    if (io) {
      io.emit('announcement_updated', updated);
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
