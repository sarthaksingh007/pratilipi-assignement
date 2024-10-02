const {User} = require('../models/userModel');
const jwt = require('jsonwebtoken');
const {publishUserEvent} = require('../utils/connectRabbitMQ');

const JWT_SECRET = process.env.JWT_SECRET || "sasabhisbiabidasb";

// /register
const registerUser = async (req, res) => {
    const { username, password, email } = req.body;
  
    try {
      const newUser = new User({ username, password, email });
      await newUser.save();
  
      if (channel) {
        const event = { event: 'User Registered', userId: newUser._id };
        await publishUserEvent(event);
        console.log('User Registered event emitted:', event);
      }
  
      const token = jwt.sign({ userId: newUser._id }, JWT_SECRET, { expiresIn: '1h' });
  
      res.status(201).json({ message: 'User registered successfully', token });
    } catch (err) {
      console.error('Error registering user:', err);
      res.status(500).json({ message: 'Failed to register user' });
    }
};
  
// /profile/:id
const updateUser = async (req, res) => {
    const { username, email } = req.body;
  
    console.log(req.body);
    
  
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ message: 'User not found' });
  
      user.username = username || user.username;
      user.email = email || user.email;
      await user.save();
  
      if (channel) {
        const event = { event: 'User Profile Updated', userId: user._id };
        await publishUserEvent(event);
        console.log('User Profile Updated event emitted:', event);
      }
  
      res.status(200).json({ message: 'Profile updated successfully' });
    } catch (err) {
      console.error('Error updating profile:', err);
      res.status(500).json({ message: 'Failed to update profile' });
    }
};

module.exports = {registerUser,updateUser}
  