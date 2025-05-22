'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('recurring_deposit_settings', 'penality_rate', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 1.00,
      comment: 'Penalty rate per day in currency units'
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('recurring_deposit_settings', 'penality_rate');
  }
};
