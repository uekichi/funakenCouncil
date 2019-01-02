'use strict';
const Sequelize = require('sequelize');
const sequelize = new Sequelize(
  'postgres://postgres:postgres@localhost/funaken_council',
  {
    loggin: true,
    operatorsAliases: false
  }
);

module.exports = {
  database: sequelize,
  Sequelize: Sequelize
};