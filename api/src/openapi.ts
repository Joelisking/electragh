/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Determine the correct path for API files by checking what actually exists
const getApiPath = () => {
  const routesDir = path.join(__dirname, 'routes');

  // Check if we're in a compiled environment (dist directory)
  if (__dirname.includes('dist')) {
    // We're running compiled JavaScript, so look for .js files
    return path.join(routesDir, '*.js');
  } else {
    // We're in development, so look for .ts files
    return path.join(routesDir, '*.ts');
  }
};

const apiPath = getApiPath();

// Swagger JSDoc options
const options = {
  definition: {
    openapi: '3.1.0',
    info: {
      title: 'Voting API',
      version: '1.0.0',
      description:
        'Secure voting system API — Express, TypeScript, Prisma. Auto-generated from JSDoc comments.',
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Local development',
      },
      {
        url: 'https://api.yourdomain.com',
        description: 'Production',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Paste an **access token** here.',
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication endpoints' },
      {
        name: 'Elections',
        description: 'Election management endpoints',
      },
      {
        name: 'Positions',
        description: 'Position management endpoints',
      },
      {
        name: 'Candidates',
        description: 'Candidate management endpoints',
      },
      { name: 'Voters', description: 'Voter management endpoints' },
      {
        name: 'Voting',
        description: 'Vote casting and management endpoints',
      },
      {
        name: 'Results',
        description: 'Election results and analytics endpoints',
      },
      {
        name: 'Disputes',
        description: 'Dispute management endpoints',
      },
      {
        name: 'Admin',
        description:
          'Administrative actions and management endpoints',
      },
    ],
  },
  apis: [apiPath],
};

const spec = swaggerJsdoc(options);

// Swagger UI options
const swaggerOptions = {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
  },
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Voting API Documentation',
};

// Serve Swagger UI
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(spec, swaggerOptions));

// Serve raw JSON spec for debugging
router.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(spec);
});

// Health check endpoint for docs
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Swagger docs are working',
    specLoaded: Object.keys(spec).length > 0,
  });
});

export default router;
