const { VertexPin } = require("../models");
const jwt = require('jsonwebtoken');


const getAllPins = async (req, res) => {
    try {
        const pins = await VertexPin.findAll();
        res.json(pins);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getAllPins    
};