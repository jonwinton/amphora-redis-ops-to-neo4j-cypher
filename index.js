'use strict';

const _ = require('lodash'),
  createRelationships = require('./lib/create-relationships'),
  helpers = require('./lib/helpers');

/**
 * Turn ops into a data object more compatible with
 * Cypher and the Neo4j queries
 *
 * @param  {Array} ops
 * @return {Array}
 */
function parseOps(ops) {
  return _.map(ops, function (op, index) {
    var cypherData = {},
      opData = JSON.parse(op.value);

    if (op.type === 'put') {
      cypherData._ref = op.key;
      cypherData.data = opData;
    }

    return cypherData;
  });
}

/**
 * The values of each string need to be converted to
 * Cypher compatible strings. While we're doing that
 * we should check these values to see if they're
 * supposed to create relationships between components.
 *
 * @param  {Array} values
 * @param  {String} parentRef
 * @return {Object}
 */
function valuesToCypherString(values, parentRef) {
  var args = [],
    relationships = [];

  _.forIn(values, function (value, key) {
    var parsedData = onSetMatchArgs(value, parentRef);

    // This is the format needed for cypher
    args.push(`${key}: '${parsedData.data}'`);

    if (parsedData.relationships) {
      relationships.push(parsedData.relationships);
    }
  });

  return {
    data: args.join(', '),
    relationships: _.flattenDeep(relationships)
  };
}

/**
 * Checks the value of property and determines how it should
 * be stored. In the end, we know each value will be sent to
 * Cypher as a string (JSON.stringify), but the data we're
 * dealing with may also signifying a relationship. Let's make
 * sure we check for that here.
 *
 * @param  {Any} value
 * @param  {String} parentRef
 * @return {Object}
 */
function onSetMatchArgs(value, parentRef) {
  var relationships = [];

  if (_.isArray(value) || helpers.isEmbeddedComponent(value) || helpers.isComponentRef(value)) {
    relationships = createRelationships(parentRef, value);
  }

  return {
    data: _.isString(value) ? value : JSON.stringify(value),
    relationships: relationships.length ? relationships : null
  }
}

/**
 * Turn op values into the appropriate strings
 * formatted for a Cypher SET
 *
 * @param  {Array} ops
 * @return {Array}
 */
function opsToCypherQueries(ops) {
  return _.map(ops, function (op, index) {
    var parsedValues = valuesToCypherString(op.data, op._ref),
      mergeQuery = '';

    if (helpers.isPage(op._ref)) {
      mergeQuery = `MERGE (p${index}:Page {uri: '${op._ref}'}) ON MATCH SET p${index} += {${parsedValues.data} } ON CREATE SET p${index} += {${parsedValues.data} }`
    } else if (helpers.isList(op._ref)) {
      console.log('HANDLE LISTS!!!!');
    } else {
      mergeQuery = `MERGE (c${index}:Component {_ref: '${op._ref}' }) ON MATCH SET c${index} += {${parsedValues.data} } ON CREATE SET c${index} += {${parsedValues.data} }`
    }

    return {
      merge: mergeQuery + '    ',
      relationships: parsedValues.relationships
    }
  });
}

/**
 * Accept data and then begin transforming it. This will return an
 * object with commands to run through cypher to create the nodes
 * and relationships. Processing the queries through Cypher is not
 * handled by this module.
 *
 * @param {Array} data
 * @return {Object}
 */
function init(redisOps) {
  // Get data
  var parsedOps = parseOps(redisOps), // Parse up the ops
    cypherQueries = opsToCypherQueries(parsedOps), // Make the cypher queries
    mergeCommands = '',
    relationshipQueries = [];

  _.forEach(cypherQueries, function (query) {
    // Make one big create query
    if (query.merge) {
      mergeCommands += query.merge;
    }

    // Group all the relationship queries together
    if (query.relationships.length) {
      relationshipQueries = relationshipQueries.concat(query.relationships);
    }
  });

  // Return an object with the queries needed
  return {
    merge: mergeCommands,
    relationships: relationshipQueries
  }
}

module.exports = init;

