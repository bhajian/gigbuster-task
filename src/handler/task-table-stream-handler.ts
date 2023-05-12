import {DynamoDB} from "aws-sdk"
import {Env} from "../lib/env"
import {NotificationService} from "../service/notification-service"
import {CardService} from "../service/card-service";

const taskTable = Env.get('TASK_TABLE')
const transactionTable = Env.get('TRANSACTION_TABLE')
const profileTable = Env.get('PROFILE_TABLE')
const notificationTable = Env.get('NOTIFICATION_TABLE')
const expoAccessToken = Env.get('EXPO_ACCESS_TOKEN')
const cardTable = Env.get('CARD_TABLE')

const notificationService = new NotificationService({
    taskTable: taskTable,
    notificationTable: notificationTable,
    transactionTable: transactionTable,
    profileTable: profileTable,
    expoAccessToken: expoAccessToken
})
const cardService = new CardService({
    taskTable: taskTable,
    cardTable: cardTable,
    transactionTable: transactionTable,
    profileTable: profileTable
})

export async function handler(event: any) {
    try{
        for(let i = 0 ; i < event.Records.length; i++){
            const record = event.Records[i]
            const newImage = DynamoDB.Converter.unmarshall(record.dynamodb.NewImage)
            const oldImage = DynamoDB.Converter.unmarshall(record.dynamodb.OldImage)

            if(record?.eventName === 'INSERT'){
                await cardService.createCards({
                    eventName: record?.eventName,
                    newImage: newImage
                })
            }
            if(record?.eventName === 'MODIFY'){

            }
        }
    } catch (e) {
        console.log(e)
    }

}
