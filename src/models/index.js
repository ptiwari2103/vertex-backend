const sequelize = require('../config/database');
const User = require('./user');
const State = require('./state');
const District = require('./district');
const Profile = require('./profile');
const UserBank = require('./userBank');
const UserAddress = require('./userAddress');
const VertexPin = require('./vertexPin');
const VertexMessage = require('./vertexMessage');
const Card = require('./card');
const VertexMessageUser = require('./vertexMessageUser');
const Agent = require('./agent');

// Initialize models
const models = {
  User,
  State,
  District,
  Profile,
  UserBank,
  UserAddress,
  VertexPin,
  VertexMessage,
  Card,
  VertexMessageUser,
  Agent
};

// Run associations if they exist
Object.values(models)
  .filter(model => typeof model.associate === "function")
  .forEach(model => model.associate(models));

// Sync models with database
sequelize.sync()
  .then(() => {
    console.log('Models synchronized with database');
  })
  .catch(err => {
    console.error('Error synchronizing models:', err);
  });

module.exports = {
  sequelize,
  ...models
};
