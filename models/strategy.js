'use strict';
const loader = require('./sequelize-loader');
const Sequelize = loader.Sequelize;

const Strategy = loader.database.define('strategies', {
  strategyId: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  strategyName: {
    type: Sequelize.STRING,
    allowNull: false
  },
  titleId: {
    type: Sequelize.UUID,
    allowNull: false
  }
}, {
    freezeTableName: true,
    timestamps: false,
    indexes: [{ fields: ['titleId'] }]
});

module.exports = Strategy;