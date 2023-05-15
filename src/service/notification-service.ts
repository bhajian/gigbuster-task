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

export class NotificationService {

    private props: NotificationServiceProps
    private documentClient = new DocumentClient()
    private expo : Expo

    public constructor(props: NotificationServiceProps){
        this.props = props
        this.expo = new Expo({ accessToken: props.expoAccessToken })
    }

    async createTransactionNotification(params: any): Promise<any> {
        const now = new Date()
        let task = undefined
        if(params?.newImage?.taskId){
            task = await this.getTask({id: params?.newImage?.taskId})
        }
        if(params?.eventName === 'INSERT' && params?.newImage?.status === 'applied'
            && params?.newImage?.type === 'application'){
            await this.sendNotification({
                dateTime: now.toISOString(),
                userId: params?.newImage?.customerId,
                notificationType: 'NEW_APPLICATION',
                subjectId: params?.newImage?.workerId,
                objectId: params?.newImage?.taskId,
                transactionId: params?.newImage?.id,
                notificationTitle: `New application for ${task.category}.`,
                notificationBody: `You have received a response for the ${task.category} task you posted.`,
                notificationData: {
                    transactionId: params?.newImage?.id,
                    notificationType: 'NEW_APPLICATION'
                }
            })
        }
        if(params?.eventName === 'INSERT' && params?.newImage?.status === 'initiated'
            && params?.newImage?.type === 'referral'){
            await this.sendNotification({
                dateTime: now.toISOString(),
                userId: params?.newImage?.customerId,
                notificationType: 'NEW_REFERRAL',
                subjectId: params?.newImage?.referrerId,
                objectId: params?.newImage?.taskId,
                transactionId: params?.newImage?.id,
                notificationTitle: `New Referral for ${task.category}.`,
                notificationBody: `You have received a new referral for ${task.category}`,
                notificationData: {
                    transactionId: params?.newImage?.id,
                    notificationType: 'NEW_REFERRAL'
                }
            })
        }
        if(params?.eventName === 'MODIFY' && params?.newImage?.type === 'application'
            && params?.newImage?.status === 'applicationAccepted'
            && params?.oldImage?.status === 'applied'){
            await this.sendNotification({
                dateTime: now.toISOString(),
                userId: params?.newImage?.workerId,
                notificationType: 'APPLICATION_ACCEPTED',
                subjectId: params?.newImage?.customerId,
                objectId: params?.newImage?.taskId,
                transactionId: params?.newImage?.id,
                notificationTitle: 'It is a match.',
                notificationBody: `The customer accepted your response to the ${task.category} task.` +
                    'You can now chat with the customer.',
                notificationData: {
                    transactionId: params?.newImage?.id,
                    notificationType: 'APPLICATION_ACCEPTED'
                }
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
            await this.newMessageNotification(params?.newImage, task)
        }
    }

    async newMessageNotification(transaction: any, task: any): Promise<any> {
        const senderId = transaction.senderId
        const receiverId = transaction.receiverId
        const workerId = transaction.workerId
        const customerId = transaction.customerId
        const referrerId = transaction.referrerId
        const taskString = (task?.category? ' about ' + task?.category:'')
        if(receiverId){
            let role = 'Customer'
            if(receiverId === customerId){
                role = 'Customer'
            }
            if(receiverId === workerId){
                role = 'Worker'
            }
            if(receiverId === referrerId){
                role = 'Referral'
            }
            const senderProfile = await this.getProfile({
                userId: senderId
            })
            const receiverProfile = await this.getProfile({
                userId: receiverId
            })
            await this.sendPushNotification({
                notificationToken: receiverProfile?.notificationToken,
                title: `New Message For ${role}${taskString}.`,
                body: `${senderProfile?.name}: ${transaction?.lastMessage}`,
                data: {
                    transactionId: transaction.id,
                    notificationType: 'MESSAGE'
                }
            })
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

    async getTask(params: any): Promise<any> {
        const response = await this.documentClient
            .get({
                TableName: this.props.taskTable,
                Key: {
                    id: params.id,
                },
            }).promise()
        return response.Item
    }

    async sendNotification(params: any): Promise<any> {
        await this.documentClient
            .put({
                TableName: this.props.notificationTable,
                Item: {
                    id: uuidv4(),
                    dateTime: params.dateTime,
                    userId: params.userId,
                    type: params.notificationType,
                    subjectId: params.subjectId,
                    objectId: params.objectId,
                    transactionId: params.transactionId,
                },
            }).promise()
        const profile = await this.getProfile({
            userId: params.userId
        })
        await this.sendPushNotification({
            notificationToken: profile.notificationToken,
            title: params.notificationTitle,
            body: params.notificationBody,
            data: params.notificationData
        })
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
