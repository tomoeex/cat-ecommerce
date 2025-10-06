const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/database');
const { validatePassword } = require('../utils/passwordValidator');
const { isGuest } = require('../middleware/auth');
const emailService = require('../utils/emailService');

router.get('/login', isGuest, (req, res) => {
  res.render('login', {
    title: 'Login',
    error: null,
    redirect: req.query.redirect || '/'
  });
});

router.post('/login', async (req, res) => {
  const { username, password, redirect } = req.body;

  try {
    const [users] = await db.query(
      'SELECT * FROM user WHERE user_username = ? OR user_email = ?',
      [username, username]
    );

    if (users.length === 0) {
      return res.render('login', {
        title: 'Login',
        error: 'Invalid username or password',
        redirect: redirect || '/'
      });
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.user_password);
    
    if (!isValidPassword) {
      return res.render('login', {
        title: 'Login',
        error: 'Invalid username or password',
        redirect: redirect || '/'
      });
    }

    const ipAddress = req.ip || req.connection.remoteAddress;
    await db.query(
      'INSERT INTO user_login_log (user_id, login_time, ip_address) VALUES (?, NOW(), ?)',
      [user.user_id, ipAddress]
    );

    req.session.user = {
      user_id: user.user_id,
      username: user.user_username,
      email: user.user_email,
      fullname: user.user_fullname,
      user_role: user.user_role
    };

    if (user.user_role === 'admin') {
      res.redirect('/admin/dashboard');
    } else {
      res.redirect(redirect || '/products');
    }

  } catch (error) {
    console.error('Login error:', error);
    res.render('login', {
      title: 'Login',
      error: 'An error occurred. Please try again.',
      redirect: redirect || '/'
    });
  }
});

router.get('/register', isGuest, (req, res) => {
  res.render('register', {
    title: 'Register',
    error: null,
    passwordRequirements: require('../utils/passwordValidator').getPasswordRequirements()
  });
});

router.post('/register', async (req, res) => {
  const { username, email, password, confirmPassword, fullname, phone, address } = req.body;

  try {
    if (password !== confirmPassword) {
      return res.render('register', {
        title: 'Register',
        error: 'Passwords do not match',
        passwordRequirements: require('../utils/passwordValidator').getPasswordRequirements()
      });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.render('register', {
        title: 'Register',
        error: passwordValidation.errors.join(', '),
        passwordRequirements: require('../utils/passwordValidator').getPasswordRequirements()
      });
    }

    const [existingUsers] = await db.query(
      'SELECT * FROM user WHERE user_username = ? OR user_email = ?',
      [username, email]
    );

    if (existingUsers.length > 0) {
      return res.render('register', {
        title: 'Register',
        error: 'Username or email already exists',
        passwordRequirements: require('../utils/passwordValidator').getPasswordRequirements()
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO user (user_username, user_email, user_password, user_fullname, 
       user_tel, user_address, user_role, createdAt) 
       VALUES (?, ?, ?, ?, ?, ?, 'customer', NOW())`,
      [username, email, hashedPassword, fullname, phone, address]
    );

    req.session.user = {
      user_id: result.insertId,
      username: username,
      email: email,
      fullname: fullname,
      user_role: 'customer'
    };

    res.redirect('/products');

  } catch (error) {
    console.error('Registration error:', error);
    res.render('register', {
      title: 'Register',
      error: 'An error occurred. Please try again.',
      passwordRequirements: require('../utils/passwordValidator').getPasswordRequirements()
    });
  }
});

router.get('/forgot-password', isGuest, (req, res) => {
  res.render('forgot-password', {
    title: 'Forgot Password',
    error: null,
    success: null
  });
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const [users] = await db.query('SELECT * FROM user WHERE user_email = ?', [email]);

    if (users.length === 0) {
      return res.render('forgot-password', {
        title: 'Forgot Password',
        error: 'Email not found',
        success: null
      });
    }

    const user = users[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expireAt = new Date(Date.now() + 3600000);

    await db.query(
      `INSERT INTO password_reset (user_id, reset_token, expire_at, createdAt) 
       VALUES (?, ?, ?, NOW())`,
      [user.user_id, resetToken, expireAt]
    );

    const resetLink = `${req.protocol}://${req.get('host')}/auth/reset-password?token=${resetToken}`;
    await emailService.sendPasswordResetEmail(email, resetLink);

    res.render('forgot-password', {
      title: 'Forgot Password',
      error: null,
      success: 'Password reset link has been sent to your email'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.render('forgot-password', {
      title: 'Forgot Password',
      error: 'An error occurred. Please try again.',
      success: null
    });
  }
});

router.get('/reset-password', async (req, res) => {
  const { token } = req.query;

  try {
    const [resets] = await db.query(
      `SELECT * FROM password_reset 
       WHERE reset_token = ? AND expire_at > NOW()`,
      [token]
    );

    if (resets.length === 0) {
      return res.render('error', {
        title: 'Invalid Token',
        error: { message: 'Invalid or expired reset token' }
      });
    }

    res.render('reset-password', {
      title: 'Reset Password',
      token: token,
      error: null,
      passwordRequirements: require('../utils/passwordValidator').getPasswordRequirements()
    });

  } catch (error) {
    console.error('Reset password page error:', error);
    res.render('error', {
      title: 'Error',
      error: { message: 'An error occurred' }
    });
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, password, confirmPassword } = req.body;

  try {
    if (password !== confirmPassword) {
      return res.render('reset-password', {
        title: 'Reset Password',
        token: token,
        error: 'Passwords do not match',
        passwordRequirements: require('../utils/passwordValidator').getPasswordRequirements()
      });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.render('reset-password', {
        title: 'Reset Password',
        token: token,
        error: passwordValidation.errors.join(', '),
        passwordRequirements: require('../utils/passwordValidator').getPasswordRequirements()
      });
    }

    const [resets] = await db.query(
      `SELECT * FROM password_reset 
       WHERE reset_token = ? AND expire_at > NOW()`,
      [token]
    );

    if (resets.length === 0) {
      return res.render('error', {
        title: 'Invalid Token',
        error: { message: 'Invalid or expired reset token' }
      });
    }

    const reset = resets[0];
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      'UPDATE user SET user_password = ?, updatedAt = NOW() WHERE user_id = ?',
      [hashedPassword, reset.user_id]
    );

    await db.query('DELETE FROM password_reset WHERE reset_id = ?', [reset.reset_id]);

    res.redirect('/auth/login?reset=success');

  } catch (error) {
    console.error('Reset password error:', error);
    res.render('reset-password', {
      title: 'Reset Password',
      token: token,
      error: 'An error occurred. Please try again.',
      passwordRequirements: require('../utils/passwordValidator').getPasswordRequirements()
    });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;