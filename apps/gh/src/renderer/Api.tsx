import React from 'react';
import SwaggerUI from 'swagger-ui-react';
import { gh } from '../shared/client.js';
import spec from './assets/github.com.json' with { type: "json" };
import "swagger-ui-react/swagger-ui.css";

const ghSchemaUrl = 'https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/api.github.com/api.github.com.json';

export type ApiProps = {
  url?: string;
};

export const Api = React.memo(({ url }: ApiProps) => {
  return (
    <SwaggerUI
      spec={spec}
      requestInterceptor={(req) => {
        // Don't hijack spec loading / remote refs
        if (req.loadSpec) return req;

        // Hijack Try-it-out API requests
        req.userFetch = gh.fetch;

        return req;
      }}
    />
  );
});
