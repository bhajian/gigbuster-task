import {
    Context,
    APIGatewayProxyResult,
    APIGatewayProxyEvent
} from 'aws-lambda';
import {Env} from "../lib/env";
import {TaskService} from "../service/task-service";
import {getQueryString, getSub} from "../lib/utils";

const taskTable = Env.get('TASK_TABLE')
const cardTable = Env.get('CARD_TABLE')
const bucket = Env.get('IMAGE_BUCKET')
const profileTable = Env.get('PROFILE_TABLE')
const service = new TaskService({
    profileTable: profileTable,
    taskTable: taskTable,
    cardTable: cardTable,
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
        const limit = getQueryString(event, 'limit')
        const lastEvaluatedKey = getQueryString(event, 'lastEvaluatedKey')

        const params: any = {
            userId: userId,
            limit: limit,
        }
        if(lastEvaluatedKey){
            params.lastEvaluatedKey = {
                id: lastEvaluatedKey
            }
        }
        const items = await service.listCards(params)
        result.body = JSON.stringify(items)
        return result
    }
    catch (e) {
        result.statusCode = 500
        result.body = e.message
    }
    return result
}
