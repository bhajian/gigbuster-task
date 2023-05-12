import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { v4 as uuidv4 } from 'uuid'
import {
    ApplicantProfile,
    PhotoEntry,
    TaskEntity,
    KeyParams, TransactionEntity
} from "./task-types";
import Expo from "expo-server-sdk";

interface NotificationServiceProps{
    taskTable: string
    transactionTable?: string
    profileTable: string
    notificationTable: string
    expoAccessToken: string
}

export class NotificationLogService {

    private props: NotificationServiceProps
    private documentClient = new DocumentClient()
    private expo : Expo

    public constructor(props: NotificationServiceProps){
        this.props = props
        this.expo = new Expo({ accessToken: props.expoAccessToken })
    }

    async createTransactionNotification(params: any): Promise<any> {
        const now = new Date()

        if(params?.eventName === 'INSERT' && params?.newImage?.status === 'applied'
            && params?.newImage?.type === 'application'){
            const userId = params?.newImage?.customerId

            await this.documentClient
                .put({
                    TableName: this.props.notificationTable,
                    Item: {
                        id: uuidv4(),
                        dateTime: now.toISOString(),
                        userId: userId,
                        type: 'NEW_APPLICATION',
                        subjectId: params?.newImage?.workerId,
                        objectId: params?.newImage?.taskId,
                        transactionId: params?.newImage?.id,
                    },
                }).promise()
            const profile = await this.getProfile({
                userId: userId
            })
            await this.sendPushNotification({
                notificationToken: profile.notificationToken,
                title: 'New Application.',
                body: 'Someone responded to the task you posted.'
            })
        }
        if(params?.eventName === 'INSERT' && params?.newImage?.status === 'initiated'
            && params?.newImage?.type === 'referral'){
            const userId = params?.newImage?.customerId

            await this.documentClient
                .put({
                    TableName: this.props.notificationTable,
                    Item: {
                        id: uuidv4(),
                        dateTime: now.toISOString(),
                        userId: userId,
                        type: 'NEW_REFERRAL',
                        subjectId: params?.newImage?.referrerId,
                        objectId: params?.newImage?.taskId,
                        transactionId: params?.newImage?.id,
                    },
                }).promise()
            const profile = await this.getProfile({
                userId: userId
            })
            await this.sendPushNotification({
                notificationToken: profile.notificationToken,
                title: 'New Application.',
                body: 'You have received a new referral for the task you posted.'
            })
        }
        if(params?.eventName === 'MODIFY' && params?.newImage?.type === 'application'
            && params?.newImage?.status === 'applicationAccepted'
            && params?.oldImage?.status === 'applied'){
            const userId = params?.newImage?.workerId
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
                        transactionId: params?.newImage?.id,
                    },
                }).promise()
            const profile = await this.getProfile({
                userId: userId
            })
            await this.sendPushNotification({
                notificationToken: profile.notificationToken,
                title: 'Application Accepted.',
                body: 'Your response to a task is accepted by the customer.'
            })
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
                        type: 'TRANSACTION_TERMINATED',
                        subjectId: params?.newImage?.customerId,
                        objectId: params?.newImage?.taskId,
                        transactionId: params?.newImage?.id,
                    },
                }).promise()
            await this.documentClient
                .put({
                    TableName: this.props.notificationTable,
                    Item: {
                        id: uuidv4(),
                        dateTime: now.toISOString(),
                        userId: params?.newImage?.customerId,
                        type: 'TRANSACTION_TERMINATED',
                        subjectId: params?.newImage?.workerId,
                        objectId: params?.newImage?.taskId,
                        transactionId: params?.newImage?.id,
                    },
                }).promise()
        }
        if(params?.eventName === 'MODIFY' &&
            params?.newImage?.lastMessage !== params?.oldImage?.lastMessage){
            const senderId = params?.newImage?.senderId
            const receiverId = params?.newImage?.receiverId
            if(receiverId){
                const profile = await this.getProfile({
                    userId: receiverId
                })
                await this.sendPushNotification({
                    notificationToken: profile.notificationToken,
                    title: 'You have a new message.',
                    body: 'You have a new message.',
                    data: params?.newImage?.id,
                })
            }
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

    async getProfile(params: any): Promise<any> {
        const response = await this.documentClient
            .get({
                TableName: this.props.profileTable,
                Key: {
                    userId: params.userId,
                },
            }).promise()
        return response.Item
    }

    async sendPushNotification(params: any): Promise<any> {
        if (!Expo.isExpoPushToken('expo-push-token')) {
            console.error(`expo-push-token is not a valid Expo push token`)
        }
        const messages = []
        const message = {
            to: params.notificationToken,
            badge: 1,
            data: { extraData: params.data },
            title: params.title,
            body: params.body,
            sound: {
                // name: 'default',
                critical: true,
                volume: 1
            }
        }
        messages.push(message)
        let chunks = this.expo.chunkPushNotifications(messages)
        const tickets = []

        for (const chunk of chunks) {
            try {
                const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk)
                tickets.push(...ticketChunk)
            } catch (error) {
                console.error(error)
            }
        }
    }

}
