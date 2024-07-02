const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const User = require('./user');

const app = express();

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/user_auth_app', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log('MongoDB connected');
})
.catch(err => {
    console.error('Failed to connect to MongoDB', err);
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');

// Session setup
app.use(session({
    secret: 'your_secret_key', // Replace with a secure secret key
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000 * 60 } // 1 hour session
}));

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session.userId) {
      return next(); // User is authenticated, proceed to next middleware/route
  } else {
      res.redirect('/register'); // Redirect to register page if user is not authenticated
  }
}

// Routes
app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/', isAuthenticated, (req, res) => {
    res.render('home');
});

app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/');
        }
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
});


app.post('/register', async (req, res) => {
  try {
      const { name, email, password } = req.body;

      // Example password restrictions
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(password)) {
          const errorMessage = 'Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character.';
          return res.render('register', { error: errorMessage, name, email });
      }

      const newUser = new User({
          name,
          email,
          password
      });

      await newUser.save();
      req.session.userId = newUser._id; // Save user session after registration
      res.redirect('/'); // Redirect to home page after successful registration
  } catch (error) {
      console.error('Error registering user:', error);
      res.status(400).send(error.message || 'Error registering user');
  }
});

app.post('/login', async (req, res) => {
  try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });

      if (!user) {
          return res.status(400).send('Invalid email or password');
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
          return res.status(400).send('Invalid email or password');
      }

      // Save user session
      req.session.userId = user._id;
      res.redirect('/'); // Redirect to home page after successful login
  } catch (error) {
      console.error('Error logging in user:', error);
      res.status(400).send('Error logging in user');
  }
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});