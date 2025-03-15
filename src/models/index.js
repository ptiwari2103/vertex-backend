const sequelize = require('../config/database');
const User = require('./user');
const State = require('./state');
const District = require('./district');

// Initialize models
const models = {
  User,
  State,
  District
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
