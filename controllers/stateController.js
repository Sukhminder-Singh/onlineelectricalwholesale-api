const State = require('../models/State');

exports.createState = async (req, res) => {
  try {
    const state = new State(req.body);
    await state.save();
    await state.populate('country');
    res.status(201).json({ data: state });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getStates = async (req, res) => {
  try {
    const states = await State.find().populate('country');
    res.json({ data: states });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getStateById = async (req, res) => {
  try {
    const state = await State.findById(req.params.id).populate('country');
    if (!state) return res.status(404).json({ error: 'State not found' });
    res.json({ data: state });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateState = async (req, res) => {
  try {
    let state = await State.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!state) return res.status(404).json({ error: 'State not found' });
    state = await state.populate('country');
    res.json({ data: state });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteState = async (req, res) => {
  try {
    const state = await State.findByIdAndDelete(req.params.id);
    if (!state) return res.status(404).json({ error: 'State not found' });
    res.json({ message: 'State deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; 