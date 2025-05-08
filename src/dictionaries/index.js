const colors = require('./colors');
const productCategories = require('./productCategories');
const brands = require('./brands');
const priceRelated = require('./priceRelated');
const qualifiers = require('./qualifiers');
const sizeRelated = require('./sizeRelated');
const productAttributes = require('./productAttributes');
const seasonal = require('./seasonal');
const genderSpecific = require('./genderSpecific');
const occasions = require('./occasions');

module.exports = {
  ...colors,
  ...productCategories,
  ...brands,
  ...priceRelated,
  ...qualifiers,
  ...sizeRelated,
  ...productAttributes,
  ...seasonal,
  ...genderSpecific,
  ...occasions,
};
