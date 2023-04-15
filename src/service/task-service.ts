import { DocumentClient, ScanInput } from 'aws-sdk/clients/dynamodb'
import { v4 as uuidv4 } from 'uuid'
import {
    ApplicantProfile,
    PhotoEntry,
    TaskEntity,
    KeyParams, TransactionEntity
} from "./task-types";

interface TaskServiceProps{
    taskTable: string
    transactionTable?: string
    profileTable: string
    bucket: string
}

export class TaskService {

    private props: TaskServiceProps
    private documentClient = new DocumentClient()

    public constructor(props: TaskServiceProps){
        this.props = props
    }

    async list(userId: string): Promise<TaskEntity[]> {
        const response = await this.documentClient
            .query({
                TableName: this.props.taskTable,
                IndexName: 'userIdIndex',
                KeyConditionExpression: 'userId = :userId',
                FilterExpression: 'taskStatus = :taskStatus',
                ExpressionAttributeValues : {
                    ':userId' : userId,
                    ':taskStatus': 'active'
                },
            }).promise()
        if (response.Items === undefined) {
            return [] as TaskEntity[]
        }
        return response.Items as TaskEntity[]
    }

    async query(params: any): Promise<any[]> {
        const response = await this.documentClient
            .scan({
                TableName: this.props.taskTable,
                ProjectionExpression: 'id, country, stateProvince, city, userId, ' +
                    'price, priceUnit, category, description, taskStatus, photos',
                FilterExpression: 'userId <> :userId and taskStatus = :taskStatus',
                ExpressionAttributeValues : {
                    ':userId' : params.userId,
                    ':taskStatus': 'active'
                },
                Limit: params.Limit,
                ExclusiveStartKey: params.lastEvaluatedKey
            }).promise()
        if (response.Items === undefined) {
            return [] as TaskEntity[]
        }

        const tasks = response.Items
        let userIds = []
        let tasksMap = new Map<string, any>()
        if (tasks) {
            for (let i = 0; i < tasks.length; i++) {
                const userId = tasks[i].userId
                if(tasksMap.has(userId)){
                } else {
                    userIds.push({userId: tasks[i].userId})
                    tasksMap.set(userId, tasks[i])
                }
            }
        }

        const {profiles} = await this.batchGetProfiles(userIds, [])
        const complexTasks : any[] = []

        for (let i = 0; i < tasks.length; i++) {
            const profile = profiles.get(tasks[i].userId)
            complexTasks.push({
                ...tasks[i],
                name: (profile && profile.name? profile.name : ''),
                accountCode: ( profile && profile.accountCode ?
                    profile.accountCode: ''),
                location: (profile && profile.location ? profile.location : {}),
                profilePhoto: ( profile && profile.photos && profile.photos[0] ?
                    profile.photos[0]: undefined)
            })
        }
        return complexTasks
    }

    async get(params: KeyParams): Promise<TaskEntity> {
        const response = await this.documentClient
            .get({
                TableName: this.props.taskTable,
                Key: {
                    id: params.taskId,
                },
            }).promise()
        return response.Item as TaskEntity
    }

    async create(params: TaskEntity): Promise<TaskEntity> {
        const now = new Date().toISOString()
        params.id = uuidv4()
        params.taskStatus = 'active'
        params.createdDateTime = now
        await this.documentClient
            .put({
                TableName: this.props.taskTable,
                Item: params,
            }).promise()
        return params
    }

    async put(params: TaskEntity): Promise<TaskEntity> {
        const response = await this.documentClient
            .put({
                TableName: this.props.taskTable,
                Item: params,
                ConditionExpression: 'userId = :userId',
                ExpressionAttributeValues : {':userId' : params.userId}
            }).promise()
        return params
    }

    async delete(params: KeyParams) {
        await this.documentClient
            .update({
                TableName: this.props.taskTable,
                Key: {
                    id: params.taskId,
                },
                ConditionExpression: 'userId = :userId',
                UpdateExpression: 'set taskStatus = :taskStatus',
                ExpressionAttributeValues : {
                    ':userId': params.userId,
                    ':taskStatus': 'inactive',
                }
            }).promise()
    }

    async listPhotos(params: KeyParams): Promise<PhotoEntry[]> {
        const response = await this.documentClient
            .get({
                TableName: this.props.taskTable,
                Key: {
                    id: params.taskId,
                },
            }).promise()
        if (response.Item === undefined ||
            response.Item.photos === undefined ||
            response.Item.userId != params.userId) {
            throw new Error('There is no photo or user does not have an access')
        }
        return response.Item.photos as PhotoEntry[]
    }

    async listApplicants(params: KeyParams): Promise<ApplicantProfile[]> {
        if(!this.props.transactionTable){
            throw new Error('The transaction table is not passed.')
        }
        const response = await this.documentClient
            .query({
                TableName: this.props.transactionTable,
                IndexName: 'taskIdIndex',
                KeyConditionExpression: 'taskId = :taskId',
                ExpressionAttributeValues: {
                    ':taskId': params.taskId,
                }
            }).promise()
        const transactions: TransactionEntity[] = response?.Items as TransactionEntity[]
        if(!transactions){
            return []
        }
        let userIds = []

        if (transactions) {
            for (let i = 0; i < transactions.length; i++) {
                userIds.push({userId: transactions[i].workerId})
            }
        }

        const {profiles} = await this.batchGetProfiles(userIds, [])
        const applicantProfiles : ApplicantProfile[] = []

        for (let i = 0; i < transactions.length; i++) {
            const profile = profiles.get(transactions[i].workerId)
            const ap : ApplicantProfile = {
                transaction: transactions[i],
                name: ( profile && profile.name ?
                    profile.name: ''),
                accountCode: ( profile && profile.accountCode ?
                    profile.accountCode: ''),
                location: ( profile ?
                    profile.location: undefined),
                profilePhoto: ( profile && profile.photos ?
                    profile.photos[0]: undefined)
            }
            applicantProfiles.push(ap)
        }
        return applicantProfiles
    }

    async applyForTask(params: KeyParams): Promise<any> {
        const now = new Date()
        if(!params.applicantId){
            throw new Error('The applicant id is undefined.')
        }
        if(!params.taskId){
            throw new Error('The task id is undefined.')
        }
        if(!this.props.transactionTable){
            throw new Error('The transaction table is not passed.')
        }

        const transactionResponse = await this.documentClient
            .query({
                TableName: this.props.transactionTable,
                IndexName: 'taskWorkerIdIndex',
                KeyConditionExpression: 'taskId = :taskId and workerId = :workerId',
                ExpressionAttributeValues: {
                    ':taskId': params.taskId,
                    ':workerId': params.applicantId
                }
            }).promise()
        const transaction = transactionResponse.Items
        if(transaction && transaction[0]){
            throw new Error('The applicant has already applied.')
        }

        const taskResponse = await this.documentClient
            .get({
                TableName: this.props.taskTable,
                Key: {
                    id: params.taskId,
                },
            }).promise()
        const task = taskResponse.Item

        if (task) {
            const newTransaction: TransactionEntity = {
                id: uuidv4(),
                customerId: task.userId,
                taskId: params.taskId,
                workerId: params.applicantId,
                createdAt: now.toISOString(),
                lastUpdatedAt: now.toISOString(),
                status: 'applied'
            }

            await this.documentClient
                .put({
                    TableName: this.props.transactionTable,
                    Item: newTransaction,
                }).promise()
            return newTransaction
        } else {
            throw new Error('The task does not exist.')
        }
        return {}
    }

    async withdrawApplication(params: KeyParams): Promise<any> {
        const now = new Date()
        if(!this.props.transactionTable){
            throw new Error('The transaction table is not passed.')
        }
        await this.documentClient
            .update({
                TableName: this.props.transactionTable,
                Key: {
                    id: params.transactionId,
                },
                UpdateExpression: 'set #status = :applicationStatus, ' +
                    'lastUpdatedAt = :lastUpdatedAt',
                ConditionExpression: 'workerId = :workerId ' +
                    'and workerId = :workerId and taskId = :taskId',
                ExpressionAttributeNames: {
                    '#status': 'status'
                },
                ExpressionAttributeValues : {
                    ':applicationStatus': 'withdrawn',
                    ':lastUpdatedAt': now.toISOString(),
                    ':workerId': params.userId,
                    ':taskId': params.taskId,
                }
            }).promise()
        return {}
    }

    async acceptApplication(params: KeyParams): Promise<any> {
        const now = new Date()
        if(!this.props.transactionTable){
            throw new Error('The transaction table is not passed.')
        }
        await this.documentClient
            .update({
                TableName: this.props.transactionTable,
                Key: {
                    id: params.transactionId,
                },
                UpdateExpression: 'set #status = :applicationStatus, ' +
                    'lastUpdatedAt = :lastUpdatedAt',
                ConditionExpression: 'customerId = :customerId ' +
                    'and workerId = :workerId and taskId = :taskId',
                ExpressionAttributeNames: {
                    '#status': 'status'
                },
                ExpressionAttributeValues : {
                    ':applicationStatus': 'applicationAccepted',
                    ':lastUpdatedAt': now.toISOString(),
                    ':customerId': params.userId,
                    ':workerId': params.applicantId,
                    ':taskId': params.taskId,
                }
            }).promise()
        return {}
    }

    async rejectApplication(params: KeyParams): Promise<PhotoEntry | {}> {
        const now = new Date()
        if(!this.props.transactionTable){
            throw new Error('The transaction table is not passed.')
        }
        await this.documentClient
            .update({
                TableName: this.props.transactionTable,
                Key: {
                    id: params.transactionId,
                },
                UpdateExpression: 'set #status = :applicationStatus, ' +
                    'lastUpdatedAt = :lastUpdatedAt',
                ConditionExpression: 'customerId = :customerId ' +
                    'and workerId = :workerId and taskId = :taskId ',
                ExpressionAttributeNames: {
                    '#status': 'status'
                },
                ExpressionAttributeValues : {
                    ':applicationStatus': 'rejected',
                    ':lastUpdatedAt': now.toISOString(),
                    ':customerId': params.userId,
                    ':workerId': params.applicantId,
                    ':taskId': params.taskId,
                }
            }).promise()
        return {}
    }

    async getPhoto(params: KeyParams, photoParams: PhotoEntry): Promise<PhotoEntry | {}> {
        const response = await this.documentClient
            .get({
                TableName: this.props.taskTable,
                Key: {
                    id: params.taskId,
                },
            }).promise()
        if (response.Item && response.Item.photos &&
            response.Item.userId == params.userId) {
            const photo = response.Item.photos.find(
                (item: PhotoEntry) => item.photoId === photoParams.photoId)
            if (!photo)
                return {}
            return photo
        }
        return {}
    }

    async addPhoto(params: KeyParams, photoParams: PhotoEntry): Promise<PhotoEntry> {
        const photoId = uuidv4()
        const newPhoto = {
            photoId: photoId,
            bucket: this.props.bucket,
            key: `${params.taskId}/photos/${photoId}`,
            type: photoParams.type,
            identityId: photoParams.identityId
        }
        const response = await this.documentClient
            .update({
                TableName: this.props.taskTable,
                Key: {
                    id: params.taskId,
                },
                ConditionExpression: 'userId = :userId',
                UpdateExpression: 'set photos=list_append(if_not_exists(photos, :empty_list), :newPhotos)',
                ExpressionAttributeValues : {
                    ':userId': params.userId,
                    ':empty_list': [],
                    ':newPhotos': [newPhoto]
                }
            }).promise()

        return newPhoto
    }

    async deletePhoto(params: KeyParams, photoParams: PhotoEntry) {
        const response = await this.documentClient
            .get({
                TableName: this.props.taskTable,
                Key: {
                    id: params.taskId,
                },
            }).promise()
        const profile = response.Item
        if (profile && profile.photos && profile.userId === params.userId) {
            const indexToRemove = profile.photos
                .findIndex((item: PhotoEntry) => item.photoId != photoParams.photoId)

            await this.documentClient
                .update({
                    TableName: this.props.taskTable,
                    Key: {
                        id: params.taskId,
                    },
                    ConditionExpression: 'userId = :userId',
                    UpdateExpression: `REMOVE photos[${indexToRemove}]`,
                    ExpressionAttributeValues : {
                        ':userId': params.userId,
                    }
                }).promise()
        }
    }

    async putTransaction(params: TaskEntity): Promise<TaskEntity> {
        if(!this.props.transactionTable){
            throw new Error('The transaction table is not passed.')
        }
        const response = await this.documentClient
            .put({
                TableName: this.props.transactionTable,
                Item: params,
                ConditionExpression: 'userId = :userId',
                ExpressionAttributeValues : {':userId' : params.userId}
            }).promise()
        return params
    }

    async queryTransaction(params: any): Promise<any> {
        if(!this.props.transactionTable){
            throw new Error('The transaction table is not passed.')
        }
        let transactionComplex = undefined
        if(params?.type === 'CONSUMER'){
            const response = await this.documentClient
                .query({
                    TableName: this.props.transactionTable,
                    IndexName: 'customerIdIndex',
                    KeyConditionExpression: 'customerId = :customerId',
                    ExpressionAttributeValues: {
                        ':customerId': params.userId
                    },
                    ScanIndexForward: false,
                    Limit: params.Limit,
                    ExclusiveStartKey: params.lastEvaluatedKey
                }).promise()
            transactionComplex = response?.Items
        }
        if(params?.type === 'WORKER'){
            const response = await this.documentClient
                .query({
                    TableName: this.props.transactionTable,
                    IndexName: 'workerIdIndex',
                    KeyConditionExpression: 'workerId = :workerId',
                    ExpressionAttributeValues: {
                        ':workerId': params.userId
                    },
                    ScanIndexForward: false,
                    Limit: params.Limit,
                    ExclusiveStartKey: params.lastEvaluatedKey
                }).promise()
            transactionComplex = response?.Items
        }
        transactionComplex = await this.mergeTransactions(transactionComplex)
        return transactionComplex
    }

    async mergeTransactions(transactions: any): Promise<any> {
        let userIds = []
        let taskIds: any[] = []
        let userIdMap = new Map<string, any>()
        let taskIdMap = new Map<string, any>()

        if (!transactions || transactions.length === 0) {
            return undefined
        }

        for (let i = 0; i < transactions.length; i++) {
            const workerId = transactions[i].workerId
            const customerId = transactions[i].customerId
            const taskId = transactions[i].taskId

            if(userIdMap.has(workerId)){
            } else {
                userIds.push({userId: workerId})
                userIdMap.set(workerId, undefined)
            }

            if(userIdMap.has(customerId)){
            } else {
                userIds.push({userId: customerId})
                userIdMap.set(customerId, undefined)
            }

            if(taskIdMap.has(taskId)){
            } else {
                taskIds.push({id: taskId})
                taskIdMap.set(taskId, undefined)
            }

        }

        const {profiles, tasks} = await this.batchGetProfiles(userIds, taskIds)
        const complexTransactions : any[] = []

        for (let i = 0; i < transactions.length; i++) {
            const workerProfile = profiles.get(transactions[i].workerId)
            const customerProfile = profiles.get(transactions[i].customerId)
            const task = tasks.get(transactions[i].taskId)
            complexTransactions.push({
                transaction: transactions[i],
                customerName: (customerProfile && customerProfile.name ?
                    customerProfile.name : ''),
                customerLocation: (customerProfile && customerProfile.location ?
                    customerProfile.location : ''),
                customerProfilePhoto: ( customerProfile && customerProfile.photos ?
                    customerProfile.photos[0]: undefined),
                customerAccountCode: ( customerProfile && customerProfile.accountCode ?
                    customerProfile.accountCode: ''),
                workerName: (workerProfile && workerProfile.name ?
                    workerProfile.name : ''),
                workerLocation: (workerProfile && workerProfile.location ?
                    workerProfile.location : ''),
                workerProfilePhoto: ( workerProfile && workerProfile.photos ?
                    workerProfile.photos[0]: undefined),
                workerAccountCode: ( workerProfile && workerProfile.accountCode ?
                    workerProfile.accountCode: ''),
                task: task
            })
        }
        return complexTransactions as any[]
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
        if(userIds?.length > 0 || taskIds?.length > 0){
            const userResponse = await this.documentClient
                .batchGet({
                    RequestItems: requestItems
                }).promise()
            let rawProfiles: any = []
            let rawTasks: any = []
            if(userResponse && userResponse.Responses && userResponse.Responses[this.props.profileTable]){
                rawProfiles = userResponse.Responses[this.props.profileTable]
                for(let i=0; i< rawProfiles.length; i++){
                    profiles.set(rawProfiles[i].userId, rawProfiles[i])
                }
            }
            if(userResponse && userResponse.Responses && userResponse.Responses[this.props.taskTable]){
                rawTasks = userResponse.Responses[this.props.taskTable]
                for(let i=0; i< rawTasks.length; i++){
                    tasks.set(rawTasks[i].id, rawTasks[i])
                }
            }
        }

        return {
            profiles: profiles,
            tasks: tasks,
        }
    }

}
