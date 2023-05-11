import {
    Context,
    APIGatewayProxyResult,
    APIGatewayProxyEvent
} from 'aws-lambda';
import {getEventBody, getPathParameter, getSub} from "../lib/utils";
import {Env} from "../lib/env";
import {TaskService} from "../service/task-service";
import {PhotoEntry, KeyParams} from "../service/task-types";

const taskTable = Env.get('TASK_TABLE')
const transactionTable = Env.get('TRANSACTION_TABLE')
const bucket = Env.get('IMAGE_BUCKET')
const service = new TaskService({
    profileTable: "",
    taskTable: taskTable,
    transactionTable: transactionTable,
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
        body: 'Empty!'
    }
    try {
        const sub = getSub(event)
        const item = getEventBody(event) as KeyParams
        const taskId = getPathParameter(event, 'id')

        await service.acceptApplication({
            transactionId: item.transactionId,
            userId: sub,
            taskId: taskId,
            workerId: item.workerId
        })
        result.body = JSON.stringify({success: true})
    } catch (error) {
        result.statusCode = 500
        result.body = error.message
    }
    return result
}
