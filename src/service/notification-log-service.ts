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

    async createTransactionNotification(params: any): Promise<any> {
        const now = new Date()

        if(params?.eventName === 'INSERT' && params?.newImage?.status === 'applied'
            && params?.newImage?.type === 'application'){
            await this.documentClient
                .put({
                    TableName: this.props.notificationTable,
                    Item: {
                        id: uuidv4(),
                        dateTime: now.toISOString(),
                        userId: params?.newImage?.customerId,
                        type: 'NEW_APPLICATION',
                        subjectId: params?.newImage?.workerId,
                        objectId: params?.newImage?.taskId,
                    },
                }).promise()
        }
        if(params?.eventName === 'MODIFY' && params?.newImage?.type === 'application'
            && params?.newImage?.status === 'applicationAccepted'
            && params?.oldImage?.status === 'applied'){
            await this.documentClient
                .put({
                    TableName: this.props.notificationTable,
                    Item: {
                        id: uuidv4(),
                        dateTime: now.toISOString(),
                        userId: params?.newImage?.workerId,
                        type: 'APPLICATION_ACCEPTED',
                        subjectId: params?.newImage?.customerId,
                        objectId: params?.newImage?.taskId,
                    },
                }).promise()
        }
        if(params?.eventName === 'MODIFY' && params?.newImage?.type === 'application'
            && params?.newImage?.status === 'terminated'){
            await this.documentClient
                .put({
                    TableName: this.props.notificationTable,
                    Item: {
                        id: uuidv4(),
                        dateTime: now.toISOString(),
                        userId: params?.newImage?.workerId,
                        type: 'CHAT_TERMINATED',
                        subjectId: params?.newImage?.customerId,
                        objectId: params?.newImage?.taskId,
                    },
                }).promise()
            await this.documentClient
                .put({
                    TableName: this.props.notificationTable,
                    Item: {
                        id: uuidv4(),
                        userId: params?.newImage?.customerId,
                        type: 'CHAT_TERMINATED',
                        subjectId: params?.newImage?.workerId,
                        objectId: params?.newImage?.taskId,
                    },
                }).promise()
        }
    }

    async createTaskNotification(params: any): Promise<any> {
        if(params?.eventName === 'MODIFY' && params?.newImage?.taskStatus === 'inactive'
            && params?.oldImage?.taskStatus === 'active'){
            // const response = await this.documentClient
            //     .query({
            //         TableName: this.props.taskTable,
            //         Key: {
            //             id: params.taskId,
            //         },
            //     }).promise()
            // return response.Item as TaskEntity

            // await this.documentClient
            //     .put({
            //         TableName: this.props.notificationTable,
            //         Item: {
            //                 id: uuidv4(),
            //                 dateTime: now.toISOString(),
            //             userId: params?.newImage?.workerId,
            //             type: 'CHAT_TERMINATED',
            //             subjectId: params?.newImage?.customerId,
            //             objectId: params?.newImage?.taskId,
            //         },
            //     }).promise()
        }
    }

}
