'use strict';

const _ = require('lodash'),
  helpers = require('./helpers'),
  randomstring = require('randomstring');

var commands = [],
  parentMatch = '',
  matchedRefs = {};

/**
 * We don't know what the data we're getting is, so we need
 * to perform some tests. Are we dealing with an Array, Object,
 * String, etc.
 *
 * @param  {String} parentRef
 * @param  {Any}    data
 * @return {Array}
 */
function analyzeRelationships(parentRef, data) {
  // Set the parent variable holder
  var parentVar = matchBeforeRelationships(parentRef, parentVar);

  // Reset the commands array
  commands = [];

  if (_.isArray(data)) {
    commands = parseArray(parentRef, parentVar, data);
  } else if (helpers.isEmbeddedComponent(data) || helpers.isComponentRef(data)) {
    commands = [createRelationship(parentRef, parentVar, data)];
  }

  return commands;
}

/**
 * Before we iterate through values, we can store the parent
 * of multiple nodes so that we don't have to keep generating
 * new variables/matches. Should be nicer for Cypher too.
 *
 * @param  {String} parentRef
 * @return {String}
 */
function matchBeforeRelationships(parentRef) {
  var parentVar;

  if (!matchedRefs[parentRef]) {
    parentVar = randomstring.generate({
      length: 12,
      charset: 'alphabetic'
    });

    let compOrPage = _.includes(parentRef, '/pages/');

    parentMatch = `MATCH (${parentVar}:${compOrPage  ? 'Page' : 'Component'} {${compOrPage ? 'uri' : '_ref'}: "${parentRef}"})`;
    matchedRefs[parentRef] = parentVar;

  } else {
    parentVar = matchedRefs[parentRef]
  }

  return parentVar;
}

/**
 * Iterate through an array and either create a relationship
 * or don't. We'd only create a relationship if we had a ref
 * to another component.
 *
 * @param  {String} parentRef
 * @param  {String} parentVar
 * @param  {Array} data
 * @return {[type]}
 */
function parseArray(parentRef, parentVar, data) {
  return _.compact(_.map(data, function (entry) {

    if (_.get(entry, '_ref', '') || helpers.isComponentRef(entry)) {
      return createRelationship(parentRef, parentVar, entry);
    }
  }));
}

/**
 * Create the string to join a two nodes via Cypher
 *
 * @param  {String} parentRef
 * @param  {Object|String} entry
 * @return {String}
 */
function createRelationship(parentRef, parentVar, entry) {
  var related = randomstring.generate({
      length: 12,
      charset: 'alphabetic'
    }),
    matchRef = _.get(entry, '_ref', '') ? entry._ref : entry;

  return `${parentMatch}    MATCH (${related}:Component {_ref: "${matchRef}"} )    WITH ${parentVar}, ${related}    CREATE (${parentVar})-[:COMPONENT]->(${related})`;
}

module.exports = analyzeRelationships;

