const res = require('express/lib/response');
const fs = require('fs');
require('colors');
require('dotenv')
const generateAPIKey = require('./lib/hashing');
const { webhookSecret } = require('./options');
const crypto = require('crypto');

module.exports = function(schema, options) {
  console.log('[System] I cannot check if your stripe key is valid until a user try to use a stripe service, make sure that it is'.yellow)

  options = options || {};

  options.successUrl = options.successUrl || 'http://localhost:3000/';
  options.cancelUrl = options.cancelUrl || 'http://localhost:3000/';

  options.stripeSecret = options.stripeSecret || null;
  options.webhookSecret = options.webhookSecret || null;
  options.priceId = options.priceId || null;

  options.apiKeyField = options.apiKeyField || 'apiKey';
  options.saltField = options.saltField || 'salt'
  options.apiKeyFieldQuery = options.apiKeyFieldQuery || 'apiKey';
  options.customerIdField =  options.customerIdField || 'customerId';
  options.subscriptionIdField = options.subscriptionIdField || 'subscriptionId';

  options.bytesApiKey = options.bytesApiKey || 16;
  options.iterations = options.iterations || 25000;
  options.salten = options.salten || 'f019832affcc06784b0f8ce25c1c2fd914d8c0261722d9e2bba0cb602a8a4d15';
  options.keylen = options.keylen || 512;
  options.digest = options.digest || 'sha256'

  if(!options.stripeSecret){
    console.log('[Error] You must add a stripe secret key to the params'.red)
  }
  if(!options.webhookSecret){
    console.log('[Error] You must add a stripe sign key to the params'.red)
  }

  const stripe = require('stripe')(options.stripeSecret)

  // adding apiKey field to the schema
  const schemaFields = {};
  schemaFields[options.apiKeyField] = {type: String, select: true};
  schema.add(schemaFields);

  schema.statics.subscribeUser = async function(user, res) {
    if (!(user instanceof this)) {
      try{
        user = await new this(user);
        user.set(options.apiKeyField, 'null');
        await user.save()
      } catch(e) {
        console.log(`[Error] ${e}`.red);
        res.redirect(options.errorUrl || 'http://localhost:3000/')
        return;
      }
    }else{
      user.set(options.apiKeyField, 'null');
      await user.save()
    } 
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: options.priceId
        }
      ],
      success_url: options.successUrl,
      cancel_url: options.cancelUrl
    });

    res.redirect(session.url);
  }

  schema.statics.webhook = async function(user, req, res) {
    if(!user){
      console.log("[Error] This user doesn't exist");
      return;
    }
    let data;
    let eventType;
    // Check if webhook signing is configured.

    if (webhookSecret) {
      // Retrieve the event by verifying the signature using the raw body and secret.
      let event;
      let signature = req.headers['stripe-signature'];

      try {
        event = stripe.webhooks.constructEvent(
          req['rawBody'],
          signature,
          webhookSecret
        );
      } catch (err) {
        console.log(`⚠️  Webhook signature verification failed.`);
        return res.sendStatus(400);
      }
      // Extract the object from the event.
      data = event.data;
      eventType = event.type;
    } else {
      // Webhook signing is recommended, but if the secret is not configured in `config.js`,
      // retrieve the event data directly from the request body.
      data = req.body.data;
      eventType = req.body.type;
    }

    switch (eventType) {
      case 'checkout.session.completed':
        // Data included in the event object:
        const customerId = data.object.customer;
        const subscriptionId = data.object.subscription;

        // Get the subscription. The first item is the plan the user subscribed to.
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const itemId = subscription.items.data[0].id;

        // Generate API key
        const apiKeys = await generateAPIKey(this, options);

        // Store the API key in your database.
        user[options.apiKeyField] = apiKeys.encryptedApiKey;
        user[options.customerIdField] = customerId;
        user[options.subscriptionIdField] = subscriptionId;
        await user.save()

        console.log(
          `[System] Customer ${customerId} subscribed to plan ${subscriptionId}, the generated api Key is ${apiKeys.apiKey}`.yellow
        );


        break;
      case 'invoice.paid':
        // Continue to provision the subscription as payments continue to be made.
        // Store the status in your database and check when a user accesses your service.
        // This approach helps you avoid hitting rate limits.
        break;
      case 'invoice.payment_failed':
        // The payment failed or the customer does not have a valid payment method.
        // The subscription becomes past_due. Notify your customer and send them to the
        // customer portal to update their payment information.
        break;
      default:
      // Unhandled event type
  }

  res.sendStatus(200);
  }

  schema.statics.api = async function(req, res, dataToSend) {
    const apiKey = req.query[options.apiKeyFieldQuery];

    if(!apiKey){
      res.sendStatus(400); // bad request
      return;
    }

    let encryptedApiKey;
    try{
      encryptedApiKey = crypto.pbkdf2Sync(apiKey, options.salten, options.iterations, options.keylen, options.digest).toString('hex');
    }catch(e) {
      console.log(`[Error] ${error}`.red)
      return;
    }

    const user = this.findOne({[options.apiKey]: encryptedApiKey})

    if(user.length === 0){
      res.sendStatus(403);
      return;
    }

    const record = await stripe.subscriptionItems.createUsageRecord(
      user[options.subscriptionIdField],
      {
        quantity: 1,
        timestamp: 'now',
        action: 'increment'
      }
    )

    res.send(dataToSend);
  }
}