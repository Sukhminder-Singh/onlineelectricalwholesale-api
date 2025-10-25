const Slider = require('../models/Slider');

// Get all sliders
exports.getSliders = async (req, res) => {
  try {
    const sliders = await Slider.find().sort({ order: 1 });
    res.json(sliders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sliders' });
  }
};

// Get a single slider by ID
exports.getSlider = async (req, res) => {
  try {
    const slider = await Slider.findById(req.params.id);
    if (!slider) return res.status(404).json({ error: 'Slider not found' });
    res.json(slider);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch slider' });
  }
};

// Create a new slider
exports.createSlider = async (req, res) => {
  try {
    const slider = new Slider(req.body);
    await slider.save();
    res.status(201).json(slider);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create slider', details: err.message });
  }
};

// Update a slider
exports.updateSlider = async (req, res) => {
  try {
    const slider = await Slider.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!slider) return res.status(404).json({ error: 'Slider not found' });
    res.json(slider);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update slider', details: err.message });
  }
};

// Delete a slider
exports.deleteSlider = async (req, res) => {
  try {
    const slider = await Slider.findByIdAndDelete(req.params.id);
    if (!slider) return res.status(404).json({ error: 'Slider not found' });
    res.json({ message: 'Slider deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete slider' });
  }
}; 