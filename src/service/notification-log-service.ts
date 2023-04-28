import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { v4 as uuidv4 } from 'uuid'
import {
    ApplicantProfile,
    PhotoEntry,
    TaskEntity,
    KeyParams, TransactionEntity
} from "./task-types";

interface NotificationServiceProps{
    taskTable: string
    transactionTable?: string
    profileTable: string
    notificationTable: string
}

export class NotificationLogService {

    private props: NotificationServiceProps
    private documentClient = new DocumentClient()

    public constructor(props: NotificationServiceProps){
        this.props = props
    }

    async createTransactionNotification(params: KeyParams): Promise<any> {
        const response = await this.documentClient
            .get({
                TableName: this.props.taskTable,
                Key: {
                    id: params.taskId,
                },
            }).promise()
        return response.Item as TaskEntity
    }

    async createTaskNotification(params: TaskEntity): Promise<any> {
        params.taskStatus = 'active'
        const response = await this.documentClient
            .put({
                TableName: this.props.notificationTable,
                Item: params,
                ConditionExpression: 'userId = :userId',
                ExpressionAttributeValues : {':userId' : params.userId}
            }).promise()
        return params
    }

}
