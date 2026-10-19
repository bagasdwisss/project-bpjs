// server/middleware/correlationMiddleware.js - Distributed Tracing & Correlation ID Injection
import crypto from 'crypto';

export const correlationMiddleware = (req, res, next) => {
  // Read existing correlation ID from incoming client headers or generate a new crypto UUID
  const incomingId = req.headers['x-correlation-id'];
  const correlationId = incomingId && typeof incomingId === 'string' && incomingId.length <= 64
    ? incomingId.trim()
    : `c-${crypto.randomBytes(8).toString('hex')}-${Date.now().toString(36)}`;

  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);

  // Track high-resolution start time for telemetry latency
  req._startTimeHr = process.hrtime.bigint();

  next();
};

export default correlationMiddleware;
