/* eslint-disable @typescript-eslint/no-var-requires */
import { execSync } from 'child_process'
import fs from 'fs'
import { OpenAPIV3 } from 'openapi-types'
import path from 'path'

import packageJson from '../../../package.json'
import { RouteSpec } from '../generics/handler'
import {
  GenerateOpenApiRouteSpecProps,
  GenerateOpenApiSpecProps,
  OpenApiRouteSpec,
  OpenApiSpec,
  SecurityScheme,
} from './types'

const errorCodes: Record<number, string> = {
  400: 'Bad request.',
  401: 'Request unauthorized.',
  403: 'Forbidden.',
  404: 'Not found.',
  406: 'Invalidated.',
  429: 'Rate limit for API reached.',
  500: 'Internal server error.',
  501: 'Not implemented.',
}

export class DocumentationGenerator {
  /**
   * There are some discrepancies between an AJV schema, which is used for runtime
   * validation, and an OpenAPI V3 schema, which is used for documentation
   * generation. This function converts an AJV schema to an OpenAPIV3 schema.
   */
  private static convertToOpenApiSchema(schema: any): OpenAPIV3.SchemaObject {
    // delete unallowed errorMessage
    if (schema.errorMessage) {
      delete schema.errorMessage
    }

    // delete empty required
    if (schema.required && schema.required.length === 0) {
      delete schema.required
    }

    // replace const with singleton enum
    if (schema.const) {
      schema.enum = [schema.const]
      delete schema.const
    }

    // recursively update properties of objects
    if (schema.type === 'object' && schema.properties) {
      const newProperties: Record<any, any> = {}
      for (const [key, subSchema] of Object.entries(schema.properties)) {
        newProperties[key] =
          DocumentationGenerator.convertToOpenApiSchema(subSchema)
      }
      schema.properties = newProperties
    }

    // update additionalProperties type definitions
    if (schema.type === 'object' && schema.additionalProperties) {
      schema.additionalProperties =
        DocumentationGenerator.convertToOpenApiSchema(
          schema.additionalProperties
        )
    }

    // for arrays, update array items type definitions
    if (schema.type === 'array' && schema.items) {
      schema.items = DocumentationGenerator.convertToOpenApiSchema(schema.items)
    }

    // for oneOf, update each ones types definitions
    if (schema.oneOf) {
      for (const [i, subSchema] of schema.oneOf.entries()) {
        schema.oneOf[i] =
          DocumentationGenerator.convertToOpenApiSchema(subSchema)
      }
    }

    return schema as OpenAPIV3.SchemaObject
  }

  /**
   * Cases:
   * - Path parameters or not
   * - Request body or not
   * - Response body or not
   *
   * @param handlerEntry path to handler file
   * @returns
   */
  static generateOpenApiRouteSpec<T, K>({
    handlerEntry,
    securityScheme,
    authorizationScopes,
  }: GenerateOpenApiRouteSpecProps): OpenApiRouteSpec {
    // Extract spec from handler file
    const spec = require(handlerEntry).spec as RouteSpec<T, K>
    if (!spec) {
      throw new Error(`Expected ${handlerEntry} to export const spec.`)
    }

    // only get path after /api
    const relativePath = handlerEntry.split('api')[1]
    const pathComponents = relativePath.split(path.sep)

    // last two components are /<method>/handler.ts
    const apiPath = pathComponents.slice(0, pathComponents.length - 2).join('/')

    // second-last component is <METHOD>, convert to lowercase
    const apiMethod = pathComponents[
      pathComponents.length - 2
    ].toLowerCase() as OpenAPIV3.HttpMethods

    // Base configuration used by all routes
    const openApiRouteSpec: OpenApiRouteSpec['spec'] = {
      summary: spec.summary,
      description: spec.description,
      responses: Object.fromEntries(
        // [200, 400] -> {'200': {'description': <description>}, '400': {'description': <description>}}
        spec.errorCodes.map((errorCode) => [
          errorCode.toString(),
          { description: errorCodes[errorCode] },
        ])
      ),
    }

    // Add request body schema (if present)
    if (spec.requestBodySchema && spec.requestContentType !== undefined) {
      openApiRouteSpec['requestBody'] = {
        content: {
          // The type below should be inferred as string but is not, for whatever reason.
          [spec.requestContentType as string]: {
            schema: DocumentationGenerator.convertToOpenApiSchema(
              spec.requestBodySchema
            ),
          },
        },
      }
    }

    // Add response body schema (if present)
    if (spec.responseBodySchema && spec.responseContentType) {
      openApiRouteSpec['responses'][spec.successCode.toString()] = {
        description: 'Success',
        content: {
          [spec.responseContentType as string]: {
            schema: DocumentationGenerator.convertToOpenApiSchema(
              spec.responseBodySchema
            ),
          },
        },
      }
    } else {
      openApiRouteSpec['responses'][spec.successCode.toString()] = {
        description: 'Success',
      }
    }

    // Add security (if present)
    if (securityScheme) {
      openApiRouteSpec['security'] = [
        { [securityScheme]: authorizationScopes ?? [] },
      ]
    }

    // Add path parameters (if present)
    // extract variables inside path like {accountId}
    const pathParameters = [...apiPath.matchAll(/{(.*?)}/g)].map(
      (match) => match[1]
    )
    if (pathParameters) {
      openApiRouteSpec['parameters'] = pathParameters.map((param) => {
        return {
          in: 'path',
          name: param,
          required: true,
          schema: {
            type: 'string',
          },
        }
      })
    }

    return {
      path: apiPath,
      method: apiMethod,
      spec: openApiRouteSpec,
    }
  }

  /**
   * Given an array of route specs, append those route specs to the paths field of
   * the OpenAPI spec
   */
  static generateOpenApiSpec({
    routeSpecs,
    baseUrl: domainName,
  }: GenerateOpenApiSpecProps): OpenApiSpec {
    // Base API spec
    const apiSpec: OpenApiSpec = {
      openapi: '3.0.0',
      info: {
        title: packageJson.name,
        version: packageJson.version,
      },
      servers: [
        {
          url: domainName,
        },
      ],
      components: {
        /** Authorizers that will be made available to any route */
        securitySchemes: {
          [SecurityScheme.JWT]: {
            description: 'Cognito User Pool JWT Authorizer',
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          [SecurityScheme.IAM]: {
            description: 'IAM Authorizer. Use AWS4 signature.',
            type: 'apiKey',
            in: 'header',
            name: 'X-Amz-Security-Token',
          },
        },
      },
      paths: {},
    }

    // Build list of routeSpecs from routes
    const apiSpecPaths: any = {}
    for (const { path, method, spec } of routeSpecs) {
      if (!apiSpecPaths[path]) {
        apiSpecPaths[path] = {}
      }

      apiSpecPaths[path][method] = spec
    }

    apiSpec['paths'] = apiSpecPaths

    // Sort paths by filepath order
    apiSpec['paths'] = Object.keys(apiSpec['paths'])
      .sort(pathSort)
      .reduce((obj, key) => {
        obj[key] = apiSpec['paths'][key]
        return obj
      }, {} as typeof apiSpec['paths'])

    return apiSpec
  }

  /**
   * Generate swagger.json and docs.html files
   */
  static generateOutputFiles(apiSpec: OpenApiSpec) {
    const entry = path.join(__dirname, 'out')

    if (!fs.existsSync(entry)) {
      fs.mkdirSync(entry)
    }

    // save swagger
    const swaggerPath = path.join(entry, 'swagger.json')
    fs.writeFileSync(swaggerPath, JSON.stringify(apiSpec, undefined, 2))

    // save redoc
    const redocPath = path.join(entry, 'docs.html')
    execSync(`npx redoc-cli bundle ${swaggerPath} -o ${redocPath}`)
  }
}

/**
 * Utility function to sort paths in the order the appear in the file system
 * @param path1 A string path like /v1/user/{id}
 * @param path2 A string path like /v1/user
 * @returns
 */
function pathSort(path1: string, path2: string): number {
  if (path1 === path2) {
    return 0
  }
  const components1 = path1.split('/')
  const components2 = path2.split('/')
  for (let i = 0; i < Math.max(components1.length, components2.length); i++) {
    if (components1[i] > components2[i] || components2[i] === undefined) {
      return 1
    } else if (
      components1[i] < components2[i] ||
      components1[i] === undefined
    ) {
      return -1
    }
  }
  throw new Error(`Unable to compare ${path1} and ${path2}`)
}
