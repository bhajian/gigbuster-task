import {
    Context,
    APIGatewayProxyResult,
    APIGatewayProxyEvent
} from 'aws-lambda';
import {Env} from "../lib/env";
import {TaskService} from "../service/task-service";
import {getPathParameter, getQueryString, getSub} from "../lib/utils";

const taskTable = Env.get('TASK_TABLE')
const transactionTable = Env.get('TRANSACTION_TABLE')
const profileTable = Env.get('PROFILE_TABLE')
const bucket = Env.get('IMAGE_BUCKET')
const service = new TaskService({
    taskTable: taskTable,
    profileTable: profileTable,
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
        body: ''
    }
    try{
        const userId = getSub(event)
        const type = getQueryString(event, 'type')
        const limit = getQueryString(event, 'limit')
        const lastEvaluatedKey = getQueryString(event, 'lastEvaluatedKey')
        const items = await service.queryTransaction({
            userId: userId,
            type: type,
            limit: limit,
            lastEvaluatedKey: lastEvaluatedKey
        })
        result.body = JSON.stringify(items)
        return result
    }
    catch (e) {
        result.statusCode = 500
        result.body = e.message
    }
    return result
}
