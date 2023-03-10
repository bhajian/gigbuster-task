import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {ExternalError} from "../error";
import jwt_decode from "jwt-decode"

export function generateRandomId(): string {
    return Math.random().toString(36).slice(2)
}

export function getEventBody(event: APIGatewayProxyEvent) {
    return typeof event.body == 'object' ? event.body : JSON.parse(event.body)
}

export function getEventHeaders(event: APIGatewayProxyEvent): any {
    return typeof event.headers == 'object' ? event.headers : JSON.parse(event.headers)
}

export function getSub(event: APIGatewayProxyEvent): string {
    const headers = typeof event.headers == 'object' ? event.headers : JSON.parse(event.headers)
    let jwt = ''
    if(headers && headers['Authorization']){
        const authorizationHeader: string = headers['Authorization']
        const stringArr = authorizationHeader.split(' ')
        if(stringArr[0] === 'Bearer' || stringArr[0] === 'bearer')
            jwt = stringArr[1]
        else
            jwt = stringArr[0]
        let decoded: any = jwt_decode(jwt)
        return decoded.sub ? decoded.sub : ''
    }
    throw new Error('Authorization header is not empty or cannot be parsed.')
}

export function  getPathParameter(event: APIGatewayProxyEvent, parameter: string): string {
    const value: string | undefined = event.pathParameters
        ? event['pathParameters'][parameter]
        : undefined
    if (!value) {
        throw new ExternalError(400, `Path must contain path parameter ${parameter}.`)
    }
    return value
}

export function getQueryString(event: APIGatewayProxyEvent,
                               parameter: string) {
    let value: string | undefined
    const {queryStringParameters} = event;
    if (queryStringParameters) {
        value = queryStringParameters[parameter!];
    }
    if (!value) {
        throw new ExternalError(400, `Path must contain path parameter ${parameter}.`)
    }
    return value
}

export function addCorsHeader(result: APIGatewayProxyResult) {
    result.headers = {
        'Content-type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': '*'
    }
}

export function isIncludedInGroup(group: string, event: APIGatewayProxyEvent) {
    const groups = event.requestContext.authorizer?.claims['cognito:groups'];
    if (groups) {
        return (groups as string).includes(group)
    } else {
        return false
    }
}
