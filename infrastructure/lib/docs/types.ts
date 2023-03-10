import { OpenAPIV3 } from 'openapi-types'

export type OpenApiRouteSpec = {
  path: string
  method: OpenAPIV3.HttpMethods
  spec: any
}
export type OpenApiSpec = OpenAPIV3.Document

export enum SecurityScheme {
  IAM = 'HttpIamAuthorizer',
  JWT = 'HttpUserPoolAuthorizer',
}

export type GenerateOpenApiSpecProps = {
  routeSpecs: OpenApiRouteSpec[]
  baseUrl: string
}

export type GenerateOpenApiRouteSpecProps = {
  handlerEntry: string
  securityScheme?: SecurityScheme
  authorizationScopes?: string[]
}
