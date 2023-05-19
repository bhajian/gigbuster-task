import { DocumentClient } from 'aws-sdk/clients/dynamodb'

interface CardServiceProps{
    taskTable: string
    transactionTable?: string
    profileTable: string
    cardTable: string
    notificationTable?: string
}

const numberofItemsPerPage = 20

export class CardService {

    private props: CardServiceProps
    private documentClient = new DocumentClient()

    public constructor(props: CardServiceProps){
        this.props = props
    }

    async taskModified(params: any): Promise<any> {

    }

    async createCards(params: any): Promise<any> {
        if(params?.eventName === 'INSERT' && params?.newImage?.taskStatus === 'active'){
            let lastEvaluatedKey: any = 'FIRST'
            while(lastEvaluatedKey){
                lastEvaluatedKey = undefined
                const response: any = await this.queryProfile({
                    limit: numberofItemsPerPage,
                    lastEvaluatedKey: lastEvaluatedKey,
                    userId: params?.newImage?.userId
                })
                if(response?.LastEvaluatedKey && response?.LastEvaluatedKey?.userId){
                    lastEvaluatedKey = response?.LastEvaluatedKey?.userId
                } else{
                    lastEvaluatedKey = undefined
                }
                await this.createAndStoreCards({
                    profiles: response?.Items,
                    task: params?.newImage
                })
            }
        }
    }

    async createCardsForNewProfile(params: any): Promise<any> {
        if(params?.eventName === 'INSERT' && params?.newImage){
            let lastEvaluatedKey: any = 'FIRST'
            while(lastEvaluatedKey){
                lastEvaluatedKey = undefined
                const response: any = await this.queryTask({
                    limit: numberofItemsPerPage,
                    lastEvaluatedKey: lastEvaluatedKey,
                    userId: params?.newImage?.userId
                })
                if(response?.LastEvaluatedKey && response?.LastEvaluatedKey?.id){
                    lastEvaluatedKey = response?.LastEvaluatedKey?.id
                } else{
                    lastEvaluatedKey = undefined
                }
                await this.createAndStoreCardsNewProfile({
                    tasks: response?.Items,
                    profile: params?.newImage
                })
            }
        }
    }

    async createAndStoreCardsNewProfile(params: any): Promise<any> {
        const itemsArray: any[] = []
        for (const task of params.tasks) {
            let distance : Number = 1000
            try{
                distance = this.calculateDistance({
                    point1: task?.location,
                    point2: params?.profile?.location
                })
            } catch (e) {

            }
            if(distance < 100){
                itemsArray.push({
                    PutRequest:{
                        Item: {
                            userId: params.profile?.userId,
                            taskId: task?.id,
                            customerId: task?.userId,
                            distance: distance,
                            status: 'NEW',
                            category: task?.category,
                        }
                    }
                })
            }
        }
        const batchParams = {
            RequestItems: {
                [this.props.cardTable]: itemsArray
            }
        }
        try{
            await this.documentClient
                .batchWrite(batchParams).promise()
        } catch (e) {
            console.log('ERROR in batch write')
            console.log(e)
        }
    }

    async createAndStoreCards(params: any): Promise<any> {
        const itemsArray: any[] = []
        for (const profile of params.profiles) {
            let distance : Number = 1000
            try{
                distance = this.calculateDistance({
                    point1: profile.location,
                    point2: params.task.location
                })
            } catch (e) {

            }
            if(distance < 100){
                itemsArray.push({
                    PutRequest:{
                        Item: {
                            userId: profile?.userId,
                            taskId: params?.task?.id,
                            customerId: params?.task?.userId,
                            distance: distance,
                            status: 'NEW',
                            category: params?.task?.category,
                        }
                    }
                })
            }
        }
        const batchParams = {
            RequestItems: {
                [this.props.cardTable]: itemsArray
            }
        }
        try{
            await this.documentClient
                .batchWrite(batchParams).promise()
        } catch (e) {
            console.log('ERROR in batch write')
            console.log(e)
        }
    }

    async queryTask(params: any): Promise<any> {
        let exclusiveStartKey
        if(params?.lastEvaluatedKey){
            exclusiveStartKey = {
                id: params?.lastEvaluatedKey
            }
        }
        const response = await this.documentClient
            .scan({
                TableName: this.props.taskTable,
                ProjectionExpression: 'id, userId, #location, category ',
                FilterExpression: 'userId <> :userId and taskStatus = :taskStatus',
                ExpressionAttributeValues : {
                    ':userId' : params.userId,
                    ':taskStatus': 'active'
                },
                ExpressionAttributeNames: {
                    '#location': 'location'
                },
                Limit: params.limit,
                ExclusiveStartKey: exclusiveStartKey
            }).promise()
        return response
    }

    async queryProfile(params: any): Promise<any> {
        let exclusiveStartKey
        if(params?.lastEvaluatedKey){
            exclusiveStartKey = {
                userId: params?.lastEvaluatedKey
            }
        }
        const response = await this.documentClient
            .scan({
                TableName: this.props.profileTable,
                ProjectionExpression: 'userId, #location, interestedCategories, ' +
                    'notificationToken, lastSwipeNotificationTime',
                FilterExpression: 'userId <> :userId and active = :active',
                ExpressionAttributeValues : {
                    ':userId' : params.userId,
                    ':active': true
                },
                ExpressionAttributeNames: {
                    '#location': 'location'
                },
                Limit: params.limit,
                ExclusiveStartKey: exclusiveStartKey
            }).promise()
        return response
    }

    async batchGetProfiles(userIds: any[], taskIds: any[]): Promise<any> {
        const requestItems: any = {}
        let profiles = new Map<string, any>()
        let tasks = new Map<string, any>()
        if (userIds?.length > 0) {
            requestItems[this.props.profileTable] = {
                Keys: userIds
            }
        }
        if (taskIds?.length > 0) {
            requestItems[this.props.taskTable] = {
                Keys: taskIds
            }
        }
        if (userIds?.length > 0 || taskIds?.length > 0) {
            const userResponse = await this.documentClient
                .batchGet({
                    RequestItems: requestItems
                }).promise()
            let rawProfiles: any = []
            let rawTasks: any = []
            if (userResponse && userResponse.Responses && userResponse.Responses[this.props.profileTable]) {
                rawProfiles = userResponse.Responses[this.props.profileTable]
                for (let i = 0; i < rawProfiles.length; i++) {
                    profiles.set(rawProfiles[i].userId, rawProfiles[i])
                }
            }
            if (userResponse && userResponse.Responses && userResponse.Responses[this.props.taskTable]) {
                rawTasks = userResponse.Responses[this.props.taskTable]
                for (let i = 0; i < rawTasks.length; i++) {
                    tasks.set(rawTasks[i].id, rawTasks[i])
                }
            }
        }
        return {
            profiles: profiles,
            tasks: tasks,
        }
    }

    calculateDistance(params: any): Number
    {
        let lon1 = params.point1.longitude
        let lon2 = params.point2.longitude
        let lat1 = params.point1.latitude
        let lat2 = params.point2.latitude
        // The math module contains a function
        // named toRadians which converts from
        // degrees to radians.
        lon1 =  lon1 * Math.PI / 180;
        lon2 = lon2 * Math.PI / 180;
        lat1 = lat1 * Math.PI / 180;
        lat2 = lat2 * Math.PI / 180;

        // Haversine formula
        let dlon = lon2 - lon1;
        let dlat = lat2 - lat1;
        let a = Math.pow(Math.sin(dlat / 2), 2)
            + Math.cos(lat1) * Math.cos(lat2)
            * Math.pow(Math.sin(dlon / 2),2);

        let c = 2 * Math.asin(Math.sqrt(a));
        // Radius of earth in kilometers. Use 3956 for miles
        let r = 6371;
        return(c * r);
    }

}
