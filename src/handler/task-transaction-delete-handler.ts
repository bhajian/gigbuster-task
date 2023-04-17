import {
    Context,
    APIGatewayProxyResult,
    APIGatewayProxyEvent
} from 'aws-lambda';
import {getEventBody, getPathParameter, getSub} from "../lib/utils";
import {Env} from "../lib/env";
import {TaskService} from "../service/task-service";
import {TaskEntity, TransactionEntity} from "../service/task-types";

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
        body: 'Hello From Todo Edit Api!'
    }
    try {

        const id = getPathParameter(event, 'transactionId')
        const item = getEventBody(event) as TransactionEntity
        const sub = getSub(event)
        item.customerId = sub
        item.id = id
        const res = await service.deleteTransaction(item)
        result.body = JSON.stringify(res)
    } catch (error) {
        result.statusCode = 500
        result.body = error.message
    }
    return result
}
