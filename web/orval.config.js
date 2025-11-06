/* eslint-disable */
module.exports = {
  marketplace: {
    input: {
      target: '../api/openapi.yaml',
    },
    output: {
      mode: 'tags-split',
      target: 'lib/api',
      client: 'react-query',
      override: {
        prettier: true,
        clean: true,
        mutator: {
          path: './lib/api-client.ts',
          name: 'mutator',
        },
      },
    },
  },
};
