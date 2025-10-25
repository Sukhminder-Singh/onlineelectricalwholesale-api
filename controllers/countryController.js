const Country = require('../models/Country');

exports.createCountry = async (req, res) => {
  try {
    const country = new Country(req.body);
    await country.save();
    res.status(201).json({ data: country });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getCountries = async (req, res) => {
  try {
    const countries = await Country.find();
    res.json({ data: countries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCountryById = async (req, res) => {
  try {
    const country = await Country.findById(req.params.id);
    if (!country) return res.status(404).json({ error: 'Country not found' });
    res.json({ data: country });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateCountry = async (req, res) => {
  try {
    const country = await Country.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!country) return res.status(404).json({ error: 'Country not found' });
    res.json({ data: country });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteCountry = async (req, res) => {
  try {
    const country = await Country.findByIdAndDelete(req.params.id);
    if (!country) return res.status(404).json({ error: 'Country not found' });
    res.json({ message: 'Country deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; 