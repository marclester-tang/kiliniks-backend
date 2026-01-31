import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Kiliniks Backend API',
      version: '1.0.0',
      description: 'API documentation for the Kiliniks Backend local development server',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local Development Server',
      },
    ],
  },
  apis: ['./src/adapters/primary/local-server.ts'], // Path to the API docs
};

export const swaggerSpec = swaggerJsdoc(options);
