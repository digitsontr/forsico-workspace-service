const Joi = require('joi');
const { ValidationError } = require('../utils/errors');

const validate = (schema) => {
  return (req, res, next) => {
    if (!schema) {
      return next(new ValidationError('Validation schema is required'));
    }

    const validationOptions = {
      abortEarly: false,
      allowUnknown: true,
      stripUnknown: true
    };

    let errors = [];

    // Validate body if schema has body definition
    if (schema.body) {
      const { error, value } = schema.body.validate(req.body, validationOptions);
      if (error) {
        errors = [...errors, ...error.details.map(detail => ({
          field: `body.${detail.path.join('.')}`,
          message: detail.message
        }))];
      } else {
        req.body = value;
      }
    }

    // Validate query if schema has query definition
    if (schema.query) {
      const { error, value } = schema.query.validate(req.query, validationOptions);
      if (error) {
        errors = [...errors, ...error.details.map(detail => ({
          field: `query.${detail.path.join('.')}`,
          message: detail.message
        }))];
      } else {
        req.query = value;
      }
    }

    // Validate params if schema has params definition
    if (schema.params) {
      const { error, value } = schema.params.validate(req.params, validationOptions);
      if (error) {
        errors = [...errors, ...error.details.map(detail => ({
          field: `params.${detail.path.join('.')}`,
          message: detail.message
        }))];
      } else {
        req.params = value;
      }
    }

    if (errors.length > 0) {
      return next(new ValidationError('Validation error', errors));
    }

    return next();
  };
};

module.exports = validate; 