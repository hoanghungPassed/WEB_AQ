import rateLimit from 'express-rate-limit';

export const twoFARateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: { error: 'Too many attempts, please try again later.' },
  keyGenerator: (req) => `${req.ip}-${req.body.userId || ''}`,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many attempts, please try again later.' });
  },
});
