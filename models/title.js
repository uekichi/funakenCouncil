'use strict';
const loader = require('./sequelize-loader');
const Sequelize = loader.Sequelize;

const Title = loader.database.define('titles', {
  titleId: {
    type: Sequelize.UUID,
    primaryKey: true,
    allowNull: false
  },
  titleName: {
    type: Sequelize.STRING,
    allowNull: false
  },
  memo: {
    type: Sequelize.TEXT,
    allowNull: false
  },
  createdBy: {
    type: Sequelize.BIGINT,
    allowNull: false
  },
  createdAt: {
    type: Sequelize.DATE,
    allowNull: false
  },
  result: {
    type: Sequelize.TEXT,
    allowNull: true
  },
}, {
  freezeTabName: true,
  timestamps: false,
  indexes: [ { fields: ['createdBy']}]
});

module.exports = Title;