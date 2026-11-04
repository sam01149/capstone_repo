import Joi from 'joi';

const environmentSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgres', 'postgresql'] })
    .required(),
  DATABASE_POOL_MAX: Joi.number().integer().min(1).max(20).default(10),
  DATABASE_CONNECTION_TIMEOUT_MS: Joi.number()
    .integer()
    .min(1000)
    .max(30000)
    .default(5000),
  DATABASE_SSL: Joi.boolean().truthy('true').falsy('false').default(false),
  FRONTEND_ORIGIN: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required(),
  COOKIE_SECURE: Joi.boolean().truthy('true').falsy('false').default(false),
  JWT_ACCESS_SECRET: Joi.string().min(64).required(),
  PASSWORD_PEPPER: Joi.string().min(32).required(),
  SESSION_TOKEN_PEPPER: Joi.string().min(32).required(),
  ACCESS_TOKEN_TTL_SECONDS: Joi.number()
    .integer()
    .min(300)
    .max(3600)
    .default(900),
  SESSION_IDLE_TTL_SECONDS: Joi.number()
    .integer()
    .min(900)
    .max(86400)
    .default(7200),
  SESSION_ABSOLUTE_TTL_SECONDS: Joi.number()
    .integer()
    .min(3600)
    .max(604800)
    .default(43200),
  WHATSAPP_BUSINESS_NUMBER: Joi.string()
    .pattern(/^\d{8,15}$/)
    .optional(),
  FORECAST_PYTHON_PATH: Joi.string().max(2048).optional(),
  FORECAST_WORKER_PATH: Joi.string().max(2048).optional(),
  FORECAST_CAPTURE_START: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .custom((value: string, helpers) => {
      const parsed = new Date(`${value}T00:00:00.000Z`);
      if (
        !Number.isFinite(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !== value ||
        parsed.getUTCDay() !== 1
      )
        return helpers.error('any.invalid');
      return value;
    })
    .optional(),
}).unknown(true);

export function validateEnvironment(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const { error, value } = environmentSchema.validate(config, {
    abortEarly: false,
    allowUnknown: true,
    convert: true,
  });

  if (error) {
    throw new Error(`Konfigurasi environment tidak valid: ${error.message}`);
  }
  if (value.NODE_ENV === 'production' && value.COOKIE_SECURE !== true) {
    throw new Error(
      'Konfigurasi environment tidak valid: COOKIE_SECURE wajib true pada production',
    );
  }

  return value as Record<string, unknown>;
}
