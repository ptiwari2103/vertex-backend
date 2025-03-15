const express = require('express');
const { State, District } = require('../models');
const router = express.Router();

// Get all states
router.get('/states', async (req, res) => {
  try {
    const states = await State.findAll({
      attributes: ['id', 'name'],
      order: [['name', 'ASC']]
    });
    res.json(states);
  } catch (error) {
    console.error('Error fetching states:', error);
    res.status(500).json({ message: 'Error fetching states' });
  }
});

// Get districts by state ID
router.get('/districts', async (req, res) => {
  const { stateId } = req.query;
  
  if (!stateId) {
    return res.status(400).json({ message: 'State ID is required' });
  }

  try {
    const districts = await District.findAll({
      where: { state_id: stateId },
      attributes: ['id', 'name'],
      order: [['name', 'ASC']]
    });
    res.json(districts);
  } catch (error) {
    console.error('Error fetching districts:', error);
    res.status(500).json({ message: 'Error fetching districts' });
  }
});

module.exports = router;
