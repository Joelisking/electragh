// scripts/generate-spec.ts
import fs from 'fs';
import path from 'path';
import YAML from 'yamljs';
import swaggerJsdoc from 'swagger-jsdoc';

const __dirname = process.cwd();

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
  apis: ['./src/routes/*.ts', './src/routes/**/*.ts'],
};

const spec = swaggerJsdoc(options);

const outPath = path.resolve(__dirname, './openapi.yaml');
const yaml = YAML.stringify(spec, 10);
fs.writeFileSync(outPath, yaml);
console.log(`✅ Generated OpenAPI spec at ${outPath}`);
