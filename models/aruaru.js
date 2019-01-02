'use strict';
const loader = require('./sequelize-loader');
const Sequelize = loader.Sequelize;

const Aruaru = loader.database.define('aruarus', {
  strategyId: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    allowNull: false
  },
  userId: {
    type: Sequelize.BIGINT,
    primaryKey: true,
    allowNull: false
  },
  aruaru: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  titleId: {
    type: Sequelize.UUID,
    allowNull: false
  }
}, {
    freezeTableName: true,
    timestamps: false,
    indexes: [
      {
        fields: ['titleId']
      }
    ]
  });

module.exports = Aruaru;