import {DynamoDB} from "aws-sdk"
import {Env} from "../lib/env"
import {NotificationLogService} from "../service/notification-log-service"

const taskTable = Env.get('TASK_TABLE')
const transactionTable = Env.get('TRANSACTION_TABLE')
const profileTable = Env.get('PROFILE_TABLE')
const notificationTable = Env.get('NOTIFICATION_TABLE')

const notificationService = new NotificationLogService({
    taskTable: taskTable,
    notificationTable: notificationTable,
    transactionTable: transactionTable,
    profileTable: profileTable
})

export async function handler(event: any) {
    for(let i = 0 ; i < event.Records.length; i++){
        const record = event.Records[i]
        const newImage = DynamoDB.Converter.unmarshall(record.dynamodb.NewImage)
        const oldImage = DynamoDB.Converter.unmarshall(record.dynamodb.OldImage)
        if(record?.eventName === 'INSERT' || record.eventName === 'MODIFY'){
            await notificationService.createTaskNotification({
                newImage: newImage,
                oldImage: oldImage,
                eventName: record.eventName
            })
        }
    }
}
