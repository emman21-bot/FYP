const Medication = require('../models/Medication');

// Add new medication
const addMedication = async (req, res) => {
  try {
    const { medicineName, dosage, frequency, reminderTimings, status } = req.body;
    const userId = req.user.id;
    const userEmail = req.user.email;

    // Validate reminder timings match frequency
    if (reminderTimings.length !== frequency) {
      return res.status(400).json({
        success: false,
        message: `Number of reminder timings must match frequency (${frequency})`,
      });
    }

    const medication = new Medication({
      userId,
      userEmail,
      medicineName,
      dosage,
      frequency,
      reminderTimings,
      status: status || 'active',
    });

    await medication.save();

    res.status(201).json({
      success: true,
      message: 'Medication added successfully',
      data: medication,
    });
  } catch (error) {
    console.error('Error adding medication:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add medication',
      error: error.message,
    });
  }
};

// Get all medications for logged-in user
const getMedications = async (req, res) => {
  try {
    const userId = req.user.id;

    const medications = await Medication.find({ userId })
      .sort({ status: -1, createdAt: -1 }); // Active first, then by creation date

    res.status(200).json({
      success: true,
      data: medications,
      count: medications.length,
    });
  } catch (error) {
    console.error('Error fetching medications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch medications',
      error: error.message,
    });
  }
};

// Update medication
const updateMedication = async (req, res) => {
  try {
    const { id } = req.params;
    const { medicineName, dosage, frequency, reminderTimings, status } = req.body;
    const userId = req.user.id;

    // Find medication and verify ownership
    const medication = await Medication.findOne({ _id: id, userId });

    if (!medication) {
      return res.status(404).json({
        success: false,
        message: 'Medication not found',
      });
    }

    // Validate reminder timings if frequency is being updated
    if (frequency && reminderTimings && reminderTimings.length !== frequency) {
      return res.status(400).json({
        success: false,
        message: `Number of reminder timings must match frequency (${frequency})`,
      });
    }

    // Update fields
    if (medicineName) medication.medicineName = medicineName;
    if (dosage) medication.dosage = dosage;
    if (frequency) medication.frequency = frequency;
    if (reminderTimings) medication.reminderTimings = reminderTimings;
    if (status) medication.status = status;

    await medication.save();

    res.status(200).json({
      success: true,
      message: 'Medication updated successfully',
      data: medication,
    });
  } catch (error) {
    console.error('Error updating medication:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update medication',
      error: error.message,
    });
  }
};

// Update medication status only
const updateMedicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    if (!status || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "active" or "inactive"',
      });
    }

    const medication = await Medication.findOne({ _id: id, userId });

    if (!medication) {
      return res.status(404).json({
        success: false,
        message: 'Medication not found',
      });
    }

    medication.status = status;
    await medication.save();

    res.status(200).json({
      success: true,
      message: 'Medication status updated successfully',
      data: medication,
    });
  } catch (error) {
    console.error('Error updating medication status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update medication status',
      error: error.message,
    });
  }
};

// Delete medication
const deleteMedication = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const medication = await Medication.findOneAndDelete({ _id: id, userId });

    if (!medication) {
      return res.status(404).json({
        success: false,
        message: 'Medication not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Medication deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting medication:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete medication',
      error: error.message,
    });
  }
};

module.exports = {
  addMedication,
  getMedications,
  updateMedication,
  updateMedicationStatus,
  deleteMedication,
};
