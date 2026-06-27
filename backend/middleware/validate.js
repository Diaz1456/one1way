import mongoose from 'mongoose';

export function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

export function requireValidObjectId(paramName) {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!id || !isValidObjectId(id)) {
      return res.status(400).json({ error: `Invalid ${paramName}: must be a valid ObjectId` });
    }
    next();
  };
}

export function requireFields(...fields) {
  return (req, res, next) => {
    for (const field of fields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        return res.status(400).json({ error: `${field} is required` });
      }
    }
    next();
  };
}
