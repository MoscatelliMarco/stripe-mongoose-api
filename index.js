const generateAPIKey = require('./lib/hashing');
const crypto = require('crypto');
require('colors');

module.exports = function(schema, options) {
  console.log('[System] I cannot check if your stripe key is valid until a user try to use a stripe service, make sure that it is'.yellow)

  options = options || {};

  options.successUrl = options.successUrl || 'http://localhost:3000/';
  options.cancelUrl = options.cancelUrl || 'http://localhost:3000/';

  options.stripeSecret = options.stripeSecret || null;
  options.webhookSign = options.webhookSign || null;
  options.priceId = options.priceId || null;

  options.showUsage = options.showUsage || false;

  options.apiKeyField = options.apiKeyField || 'apiKey';
  options.saltField = options.saltField || 'salt'
  options.customerIdField =  options.customerIdField || 'customerId';
  options.subscriptionIdField = options.subscriptionIdField || 'subscriptionId';
  options.itemIdField = options.itemIdField || 'ItemId';

  options.bytesApiKey = options.bytesApiKey || 16;
  options.iterations = options.iterations || 25000;
  options.salten = options.salten || 'f019832affcc06784b0f8ce25c1c2fd914d8c0261722d9e2bba0cb602a8a4d15';
  options.keylen = options.keylen || 512;
  options.digest = options.digest || 'sha256';

  if(!options.stripeSecret){
    throw Error('MissingStripeSecretKey')
  }
  if(!options.webhookSign){
    throw Error('MissingStripeSignKey')
  }

  const stripe = require('stripe')(options.stripeSecret)

  // adding apiKey field to the schema
  const schemaFields = {};
  schemaFields[options.apiKeyField] = {type: String, select: true};
  schemaFields[options.customerIdField] = {type: String, select: true};
  schemaFields[options.subscriptionIdField] = {type: String, select: true};
  schemaFields[options.itemIdField] = {type: String, select: true};
  schema.add(schemaFields);

  schema.statics.subscribeUser = async function(user, res) {
    if (!(user instanceof this)) {
      try{
        user = await new this(user);
        user.set(options.apiKeyField, 'null');
        user.set(options.customerIdField, 'null');
        user.set(options.subscriptionIdField, 'null');
        user.set(options.itemIdField, 'null')
        await user.save()
      } catch(e) {
        throw new Error(`InvalidUserError: ${e}`)
      }
    }else{
      user.set(options.apiKeyField, 'null');
      await user.save()
    } 
    try {
      const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: options.priceId
        }
      ],
      client_reference_id: user._id.toString(),
      success_url: options.successUrl,
      cancel_url: options.cancelUrl
      })

      res.redirect(session.url);
      return user;
    } catch(e) {
      throw new Error(`InvalidStripeOptions: ${e}`)
    }
  }

  schema.statics.webhook = async function(req, res) {
    // Retrieve the event by verifying the signature using the raw body and secret.
    let event;
    let signature = req.headers['stripe-signature'];

    try {
      event = stripe.webhooks.constructEvent(
        req['rawBody'],
        signature,
        options.webhookSign
      );
    } catch (err) {    
      res.sendStatus(400);
      throw new Error('InvalidStripeOptions: ' + err)
    }
    // Extract the object from the event.
    let data = event.data;
    let eventType = event.type;

    switch (eventType) {
      case 'checkout.session.completed':
        // Check if the user exist
        let clientReferenceId = event.data.object.client_reference_id;
        const user = await this.findById(clientReferenceId);
        if(user.length === 0){
          res.sendStatus(403);
          return;
        }

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
        user[options.itemIdField] = itemId;
        await user.save()

        console.log(
          `[System] Customer ${customerId} subscribed to plan ${subscriptionId}, the generated api Key is ${apiKeys.apiKey}`.yellow
        );
        break;
      case 'invoice.created':
        if(event.data.object.status === 'draft'){
          const user = await this.updateOne({[options.subscriptionIdField]: event.data.object.subscription},
            {
              [options.apiKeyField]:'null',
              [options.customerIdField]: 'null',
              [options.subscriptionIdField]: 'null',
              [options.itemIdField]: 'null'
          });
        }
        break;
      default:
  }

  res.sendStatus(200);
  }

  schema.statics.api = async function(res, dataToSend, api) {

    if(!api){
      res.sendStatus(400); // bad request
      return;
    }

    let encryptedApiKey;
    try{
      encryptedApiKey = crypto.pbkdf2Sync(api, options.salten, options.iterations, options.keylen, options.digest).toString('hex');
    }catch(e) {
      throw new Error('InvalidHashingOptions: ' + e)
    }

    const user = await this.findOne({[options.apiKey]: encryptedApiKey})

    if(user.length === 0){
      res.sendStatus(403);
      return;
    }

    const record = await stripe.subscriptionItems.createUsageRecord(
      user[options.itemIdField],
      {
        quantity: 1,
        timestamp: 'now',
        action: 'increment'
      }
    )

    if(options.showUsage){
      dataToSend = {...dataToSend, usage: record}
    }
    res.json(JSON.stringify(dataToSend));
  }

  schema.methods.customerRecords = async function(res){
    const invoice = await stripe.invoices.retrieveUpcoming({
      customer: this[options.customerIdField]
    })

    res.json(JSON.stringify(invoice))
  }

  schema.statics.changeApiKey = async function(user) {
    if(user[options.apiKeyField] !== 'null') {
      const apiKeys = await generateAPIKey(this, options);

      user[options.apiKeyField] = apiKeys.encryptedApiKey;
      await user.save()

      return apiKeys;
    }
    return 'user.api.failed';
  }
}