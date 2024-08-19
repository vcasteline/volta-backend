'use strict';

/**
 * tokenized-card service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::tokenized-card.tokenized-card');
