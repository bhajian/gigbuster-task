import {
    Context,
    APIGatewayProxyResult,
    APIGatewayProxyEvent
} from 'aws-lambda';
import {getEventBody, getSub} from "../lib/utils";
import {Env} from "../lib/env";
import {TaskService} from "../service/task-service";
import {TaskEntity} from "../service/task-types";

const table = Env.get('TABLE')
const bucket = Env.get('IMAGE_BUCKET')
const service = new TaskService({
    table: table,
    bucket: bucket
})

export async function handler(event: APIGatewayProxyEvent, context: Context):
    Promise<APIGatewayProxyResult> {

    const result: APIGatewayProxyResult = {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Allow-Methods': '*'
        },
        body: 'Hello From Api!'
    }
    try {
        const item = getEventBody(event) as TaskEntity;
        const sub = getSub(event)
        item.userId = sub
        const res = await service.create(item)
        result.body = JSON.stringify(res)
    } catch (error) {
        result.statusCode = 500
        result.body = error.message
    }
    return result
}
