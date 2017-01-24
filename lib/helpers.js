'use strict';

const _ = require('lodash');

/**
 * Check ref for '/pages/'
 *
 * @param  {String}  ref
 * @return {Boolean}
 */
function isPage(ref) {
  return _.includes(ref, '/pages/');
}

/**
 * Check ref for '/lists/'
 *
 * @param  {String}  ref
 * @return {Boolean}
 */
function isList(ref) {
  return _.includes(ref, '/lists/');
}

/**
 * Check if value is an object and if the
 * object contains a '_ref' property
 *
 * @param  {Any}  value
 * @return {Boolean}
 */
function isEmbeddedComponent(value) {
  return _.isObject(value) && _.get(value, '_ref', '');
}

/**
 * Check if the value is a String and contains
 * '/components'.
 *
 * @param  {Any}  value
 * @return {Boolean}
 */
function isComponentRef(value) {
  _.isString(value) && _.includes(value, '/components/');
}

module.exports.isPage = isPage;
module.exports.isList = isList;
module.exports.isEmbeddedComponent = isEmbeddedComponent;
module.exports.isComponentRef = isComponentRef;
