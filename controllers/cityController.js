const City = require('../models/City');

exports.createCity = async (req, res) => {
  try {
    const city = new City(req.body);
    await city.save();
    await city.populate('state');
    res.status(201).json({ data: city });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getCities = async (req, res) => {
  try {
    const cities = await City.find().populate('state');
    res.json({ data: cities });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCityById = async (req, res) => {
  try {
    const city = await City.findById(req.params.id).populate('state');
    if (!city) return res.status(404).json({ error: 'City not found' });
    res.json({ data: city });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateCity = async (req, res) => {
  try {
    let city = await City.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!city) return res.status(404).json({ error: 'City not found' });
    city = await city.populate('state');
    res.json({ data: city });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteCity = async (req, res) => {
  try {
    const city = await City.findByIdAndDelete(req.params.id);
    if (!city) return res.status(404).json({ error: 'City not found' });
    res.json({ message: 'City deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; 