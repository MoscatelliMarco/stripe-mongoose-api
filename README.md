# Stripe Mongoose Api

Stripe Mongoose Api is a [Mongoose plugin](https://github.com/Automattic/mongoose) that simplifies building checkout and payment system for apis with stripe.
It will provide you:
- Simple way to manage all the users for your api
- Highly customizable code for all your projects
- Ready in few lines of code
<br/>

![wallpaper money](https://user-images.githubusercontent.com/94981444/157924374-ad4e08de-af6c-4adf-8f1e-a12b197706b9.png)

## Installation
```
npm install stripe-mongoose-api
```
Stripe Mongoose Api does not require `stripe`, `mongoose` or `crypto` dependencies directly but expects you to have these dependencies installed.

## Usage
### Plugin Stripe Mongoose Api
First you need to plugin Stripe Mongoose Api into your User schema
```javascript
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const stripeMongooseApi = require('stripe-mongoose-api');
const User = new Schema({});
User.plugin(stripeMongooseApi);
module.exports = mongoose.model('User', User);
```
You're free to define your User how you like. Stripe Mongoose Api will add a apiKey, customerId, subscriptionId and ItemId field.

Additionally Stripe Mongoose Api adds some methods to your Schema. see the Documentation section for more details.


### Options
When plugging in Stripe Mongoose Api plugin additional options can be provided to configure the hashing algorithm.
```javascript
User.plugin(stripeMongooseApi, options);
```

#### Main Options
* `stripeSecret`: the secret key needed for the stripe api. Default: *null*
* `webhookSecret`: the key to connect the stripe webhook to your localhost. Default: *null*
* `priceId`: the price id of the product that your clients will buy. Default: *null*
* `showUsage`: specifies if send the user record after every api call. Default: *false*
* `successUrl`: specifies the url where the user will be redirected after a successful checkout. Default: * localhost:3000*
* `cancelUrl`: specifies the url where the user will be redirected after a non-successful checkout. Default: *localhost:3000*
* `apiKeyField`: specifies the field name that holds the username. Default *apiKey*
* `saltField`: specifies the field name that holds the salt. Default *salt*
* `customerIdField`: specifies the field name that holds the customer id. Default *customerId*
* `subscriptionIdField`: specifies the field name that holds the subscription id. Default *subscriptionid*
* `itemIdField`: specifies the field name that holds the item id. Default *itemId*
* `bytesApiKey`: specifies api key length in bytes. Default *16*
* `iterations`: specifies the number of iterations used in pbkdf2 hashing algorithm. Default: *25000*
* `salten`: specifies the secret word provided to the hashing algorithm
* `keylen`: specifies the length in byte of the hashed key. Default: *512*
* `digest`: specifies the pbkdf2 digest algorithm. Default: *sha256*. (get a list of supported algorithms with crypto.getHashes())

***Attention!*** Changing any of the hashing options(salten, iterations, keylen or digest) in production environment will prevent that existing users to authenticate!

#### Error Messages
* `MissingStripeSecretKey`: No stripe secret key was given
* `MissingStripeSignKey`: No stripe sign key was given
* `InvalidUserError`: User cannot be created because of invalid input
* `InvalidStripeOptions`:  Bad stripe options was provided
* `InvalidHashingOptions`: Bad hashing options was provided

### Hash Algorithm

Stripe Mongoose Api use the pbkdf2 algorithm of the node crypto library.  [Pbkdf2](http://en.wikipedia.org/wiki/PBKDF2)  was chosen because platform independent (in contrary to bcrypt). 

#### Examples
For a complete example implementing all the features of this projects see the test folder.

## Documentation

### Instance methods
Methods directly connected to the user.
For example to use customerRecords function use
```javascript
const User = require('./models/user');
const user = User.findOne({});
const user.customerRecords(res);
```
#### customerRecords(res)
Return the customer records in base of the user activity

### Static methods
Static methods are exposed on the model constructor. For example to use subscribeUser function use
```javascript
const User = require('./models/user');
User.subscribeUser(user, res)
```
#### subscribeUser(user, res)
subscribeUser will create a checkout session for the user

#### webhook(user, res, res)
an handler to request sended by stripe api, that will add to the user an apiKey, a customerId, a subscriptionId and an itemId

#### api(req, res, dataToSend)
The hearth of the application, it will check if the user exist and the validity of the api key, and then i will send `dataToSend` to the client

#### changeApiKey(user)
This method will simply provide a new apiKey to then user and the it will return an object with { apiKey, hashedApiKey } , if the user does not have an api it will return 'user.api.failed'

## License

Stripe Mongoose Api is licenses under the [MIT license](https://opensource.org/licenses/MIT).

**Free Software, Hell Yeah!**