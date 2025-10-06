const isAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  res.redirect('/auth/login?redirect=' + encodeURIComponent(req.originalUrl));
};

const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.user_role === 'admin') {
    return next();
  }
  res.status(403).render('error', { 
    title: 'Access Denied',
    error: { message: 'You do not have permission to access this page.' }
  });
};

const isCustomer = (req, res, next) => {
  if (req.session.user && req.session.user.user_role === 'customer') {
    return next();
  }
  res.redirect('/auth/login');
};

const isGuest = (req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  res.redirect('/');
};

module.exports = { isAuthenticated, isAdmin, isCustomer, isGuest };