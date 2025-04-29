const subscriptionService = require('../services/subscription.service');
const { AuthorizationError } = require('../utils/errors');

const validateSubscription = () => async (req, res, next) => {
  try {
    const subscriptionId = req.body.subscriptionId || req.query.subscriptionId || req.params.subscriptionId;
    
    if (!subscriptionId) {
      throw new AuthorizationError('Subscription ID is required');
    }

    const isValid = await subscriptionService.isSubscriptionValid(subscriptionId, req.auth.token);
    
    if (!isValid) {
      throw new AuthorizationError('Invalid or expired subscription');
    }

    // Store subscription ID in request for later use
    req.subscriptionId = subscriptionId;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = validateSubscription; 