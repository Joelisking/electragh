# OpenAPI Setup for Voting API

This document explains how to use and maintain the OpenAPI documentation system in the Voting API.

## Overview

The Voting API uses **swagger-jsdoc** to automatically generate OpenAPI documentation from JSDoc comments in the route files. This approach provides:

- **Automatic documentation generation** from code comments
- **Interactive API explorer** via Swagger UI
- **Real-time updates** when you modify route documentation
- **Type-safe schemas** defined inline in JSDoc comments

## How It Works

1. **JSDoc Comments**: Each route is documented using OpenAPI JSDoc syntax
2. **Auto-generation**: The system scans all route files for `@openapi` comments
3. **Swagger UI**: Documentation is served at `/docs` endpoint
4. **Live Updates**: Changes to JSDoc comments are reflected immediately

## File Structure

```
src/
├── openapi.ts              # Main OpenAPI router and configuration
├── routes/                 # Route files with JSDoc documentation
│   ├── auth.ts            # Example: Auth routes with OpenAPI docs
│   ├── elections.ts       # Example: Elections routes with OpenAPI docs
│   └── ...                # Other route files
scripts/
└── generate-spec.ts        # Script to generate static OpenAPI YAML
```

## Adding Documentation to Routes

### Basic Route Documentation

```typescript
/**
 * @openapi
 * /api/example:
 *   get:
 *     tags:
 *       - Example
 *     summary: Get example data
 *     description: Retrieve example data from the system
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 name:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/', async (req, res) => {
  // Route implementation
});
```

### Request Body Documentation

```typescript
/**
 * @openapi
 * /api/example:
 *   post:
 *     tags:
 *       - Example
 *     summary: Create example
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 description: Example name
 *     responses:
 *       201:
 *         description: Created successfully
 */
```

### Path Parameters

```typescript
/**
 * @openapi
 * /api/example/{id}:
 *   get:
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Example ID
 *         schema:
 *           type: string
 *           format: uuid
 */
```

## Available Tags

The API is organized into the following tags:

- **Auth**: Authentication endpoints
- **Elections**: Election management
- **Positions**: Position management
- **Candidates**: Candidate management
- **Voters**: Voter management
- **Voting**: Vote casting and management
- **Results**: Election results and analytics
- **Disputes**: Dispute management
- **Admin**: Administrative actions

## Security

All protected endpoints use Bearer token authentication:

```typescript
security:
  - bearerAuth: []
```

## Commands

### Generate Static OpenAPI Spec

```bash
npm run generate:spec
```

This generates a static `openapi.yaml` file in the project root.

### View Live Documentation

1. Start the development server: `npm run dev`
2. Open your browser to: `http://localhost:4000/docs`
3. The documentation updates automatically as you modify JSDoc comments

## Best Practices

1. **Keep documentation close to code**: Add JSDoc comments directly above each route
2. **Use descriptive summaries**: Make the purpose of each endpoint clear
3. **Document all responses**: Include success and error responses
4. **Use proper schemas**: Define request/response schemas inline
5. **Tag appropriately**: Group related endpoints under the same tag
6. **Include examples**: Add example values where helpful

## Example: Complete Route Documentation

```typescript
/**
 * @openapi
 * /api/elections:
 *   post:
 *     tags:
 *       - Elections
 *     summary: Create new election
 *     description: Create a new election with positions and candidates
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - startDate
 *               - endDate
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 description: Election title
 *               description:
 *                 type: string
 *                 minLength: 10
 *                 description: Election description
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: When voting begins
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: When voting ends
 *               isActive:
 *                 type: boolean
 *                 default: true
 *                 description: Whether the election is active
 *     responses:
 *       201:
 *         description: Election created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 title:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
router.post('/', async (req, res) => {
  // Route implementation
});
```

## Troubleshooting

### Documentation Not Updating

1. Check that JSDoc comments are properly formatted
2. Ensure the route file is included in the `apis` array in `openapi.ts`
3. Restart the development server if needed

### JSDoc Syntax Errors

1. Use proper OpenAPI 3.1.0 syntax
2. Check for missing quotes or brackets
3. Validate your JSDoc syntax

### Port Conflicts

If you get port conflicts, update the port in:

- `src/server.ts` (PORT variable)
- `src/openapi.ts` (servers array)
- `scripts/generate-spec.ts` (servers array)

## Resources

- [OpenAPI 3.1.0 Specification](https://spec.openapis.org/oas/v3.1.0)
- [Swagger JSDoc Documentation](https://github.com/Surnet/swagger-jsdoc)
- [Swagger UI Express](https://github.com/scottie1984/swagger-ui-express)
