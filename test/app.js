// mongoose

const mongoose = require('mongoose');
const MONGO_URI = process.env.MONGODB_URI || `mongodb://127.0.0.1:27017/apiSystemStripe`
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});


// express

const express = require('express');
const app = express();

app.use(
  express.json({
    verify: (req, res, buffer) => (req['rawBody'] = buffer),
  })
);

// views
const path = require('path');
const ejs = require('ejs');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


// routes
const User = require('./userModel');

app.get('/', (req, res) => {
  res.render('home')
})

app.get('/checkout', async (req, res) => {
  User.subscribeUser({}, res)
})

app.post('/webhook', async (req, res) => {
  const user = await User.findOne({})
  User.webhook(user, req, res)
})

app.get('/api', (req, res) => {
  User.api(req, res, {italy: 'hi from italy'})
})

const PORT =  process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serving on port ${PORT}`);
})